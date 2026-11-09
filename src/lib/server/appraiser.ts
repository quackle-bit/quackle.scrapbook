import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

/**
 * The Appraiser (CLAUDE.md §6.3): Claude reads a forged spread and writes a one-page pitch,
 * three alternative twists and the risks. Server-only — the API key never reaches the browser.
 */

export const AppraisalSchema = z.object({
  pitch: z.object({
    title: z.string(),
    logline: z.string(),
    hook: z.string(),
    core_loop: z.string(),
    look_and_feel: z.string(),
    audience: z.string(),
    why_now: z.string(),
  }),
  alternative_twists: z
    .array(z.object({ twist: z.string(), why: z.string() }))
    .describe("Exactly three alternatives to the current twist"),
  risks: z
    .array(
      z.object({
        risk: z.string(),
        mitigation: z.string(),
        severity: z.enum(["low", "medium", "high"]),
      }),
    )
    .describe("Three to five risks"),
  suggestion: z.string().describe("Which card to revisit first and why, one or two sentences"),
});
export type Appraisal = z.infer<typeof AppraisalSchema>;

export const AppraiseRequestSchema = z.object({
  title: z.string().max(80),
  logline: z.string().max(500).optional(),
  cards: z
    .array(
      z.object({ slot: z.string().max(20), type: z.string().max(20), text: z.string().max(200) }),
    )
    .max(12),
  notes: z
    .array(z.object({ q: z.string().max(200), a: z.string().max(200) }))
    .max(20)
    .optional(),
});
export type AppraiseRequest = z.infer<typeof AppraiseRequestSchema>;

const SYSTEM = `You are the Appraiser at quackle.bit, a small pixel-art game studio. Studio members bring you a game idea assembled from cards (seed word, core verb, world, mood, look, twist, constraint) and their handwritten notes. Pixel art is a fixed rule for the games the studio makes.

Write a short, honest pre-production appraisal: a pitch that makes the cards cohere into one game, three alternative twists that would change the game in interesting ways, and the real risks (scope, design, tech, market) with practical mitigations. Point out where cards fight each other. Be concrete and specific to these cards; avoid generic advice. Keep every field brief: this is read on a phone.`;

export function isAppraiserConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

export class AppraiserRefusal extends Error {}

export async function appraise(req: AppraiseRequest): Promise<Appraisal> {
  const cardLines = req.cards
    .map((c) => `- ${c.slot.toUpperCase()} (${c.type}): ${c.text}`)
    .join("\n");
  const noteLines = (req.notes ?? [])
    .filter((n) => n.a.trim())
    .map((n) => `- Q: ${n.q}\n  A: ${n.a}`)
    .join("\n");
  const user = `Title: ${req.title}
${req.logline ? `Logline: ${req.logline}\n` : ""}
Cards:
${cardLines}
${noteLines ? `\nNotes from the designer:\n${noteLines}` : ""}`;

  const response = await getClient().beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    // Server-side refusal fallback, on by default for Opus 5.5.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(AppraisalSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  });

  if (response.stop_reason === "refusal")
    throw new AppraiserRefusal("The Appraiser declined this one.");
  if (!response.parsed_output) throw new Error("The Appraiser's answer could not be read.");
  return response.parsed_output;
}
