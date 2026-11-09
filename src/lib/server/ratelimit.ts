import "server-only";

/**
 * Small fixed-window rate limiter. In-memory, so it is per server instance: good enough for
 * local dev and as a first line of defence. The durable per-member daily cap is enforced in
 * Postgres (see `appraisal_quota` in supabase/migrations) when Supabase is configured.
 */
const windows = new Map<string, { start: number; count: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now - w.start > windowMs) {
    windows.set(key, { start: now, count: 1 });
    return { ok: true, retryAfter: 0 };
  }
  if (w.count >= limit)
    return { ok: false, retryAfter: Math.ceil((w.start + windowMs - now) / 1000) };
  w.count += 1;
  return { ok: true, retryAfter: 0 };
}
