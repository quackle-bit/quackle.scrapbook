import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import {
  appraise,
  AppraiserRefusal,
  AppraiseRequestSchema,
  isAppraiserConfigured,
} from "@/lib/server/appraiser";
import { rateLimit } from "@/lib/server/ratelimit";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { currentMember, supabaseServer } from "@/lib/supabase/server";

/** Daily Appraiser calls per studio member (durable cap lives in Postgres when configured). */
const DAILY_LIMIT = 20;

export async function POST(req: NextRequest) {
  if (!isAppraiserConfigured()) {
    return NextResponse.json(
      { error: "The Appraiser is offline: ANTHROPIC_API_KEY is not set on the server." },
      { status: 503 },
    );
  }

  // Who's asking? Studio members only. Without Supabase, only local development may call it,
  // so a deployed site without auth never becomes an open proxy for the API key.
  let key: string;
  if (isSupabaseConfigured()) {
    const sb = await supabaseServer();
    const member = sb ? await currentMember(sb) : null;
    if (!sb || !member)
      return NextResponse.json({ error: "Studio members only." }, { status: 401 });
    const { data: allowed, error } = await sb.rpc("appraisal_quota", { daily_limit: DAILY_LIMIT });
    if (error) return NextResponse.json({ error: "Quota check failed." }, { status: 500 });
    if (!allowed)
      return NextResponse.json({ error: "Daily Appraiser limit reached." }, { status: 429 });
    key = `user:${member.user.id}`;
  } else if (process.env.NODE_ENV !== "production") {
    key = `dev:${req.headers.get("x-forwarded-for") ?? "local"}`;
  } else {
    return NextResponse.json({ error: "Studio sign-in is not configured." }, { status: 503 });
  }

  const burst = rateLimit(key, 5, 60_000);
  if (!burst.ok) {
    return NextResponse.json(
      { error: "Slow down: the Appraiser needs a minute." },
      { status: 429, headers: { "Retry-After": String(burst.retryAfter) } },
    );
  }

  const parsed = AppraiseRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad spread." }, { status: 400 });

  try {
    const result = await appraise(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AppraiserRefusal)
      return NextResponse.json({ error: err.message }, { status: 422 });
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "The Appraiser is busy. Try again soon." },
        { status: 429 },
      );
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Appraiser API error", err.status, err.message);
      return NextResponse.json({ error: "The Appraiser had a problem." }, { status: 502 });
    }
    console.error("Appraiser error", err);
    return NextResponse.json({ error: "The Appraiser had a problem." }, { status: 500 });
  }
}
