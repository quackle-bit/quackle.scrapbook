"use client";

import { useRef, useState } from "react";
import { feel } from "@/feel";
import { suggestTitles } from "@/lib/inspiration";
import { haptic, play } from "@/lib/motion";
import { createRng, freshSeed } from "@/lib/rng";
import { scrapbookStore } from "@/lib/scrapbook/store";
import { settings, useSettings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { say } from "../../Duck";
import { TextField } from "../../ui/TextField";
import { CAPSULE, KNOB, MACHINE, PixelArt } from "./gachaArt";
import { PageFrame } from "./PageFrame";
import type { PageCtx } from "./registry";

/**
 * The title gacha: turn the knob, a capsule drops and opens into three name ideas built from
 * the word bank and what you've already kept. Tap one to use it, or spin again. Typing always works.
 */
export function TitlePage({ book, concept, page }: PageCtx) {
  const { showExtras: extras } = useSettings();
  const [ideas, setIdeas] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [spins, setSpins] = useState(0);
  const knob = useRef<HTMLSpanElement>(null);
  const capsule = useRef<HTMLSpanElement>(null);
  const update = (patch: Parameters<typeof scrapbookStore.updateConcept>[1]) =>
    scrapbookStore.updateConcept(concept.id, patch);

  async function spin() {
    if (spinning) return;
    setSpinning(true);
    setIdeas([]);
    const quick = settings.get().reducedMotion || settings.get().speed;
    sfx.clink();
    if (!quick) {
      // Two full turns in quarter clicks, like a real gacha crank.
      await play(knob.current, [{ transform: "rotate(0)" }, { transform: "rotate(720deg)" }], 640, {
        easing: "steps(8, end)",
      });
      sfx.slide();
      await play(
        capsule.current,
        [
          { transform: "translateY(-16px)", opacity: 0 },
          { transform: "translateY(0)", opacity: 1, offset: 0.6 },
          { transform: "translateY(-8px)", offset: 0.8 },
          { transform: "translateY(0)", opacity: 1 },
        ],
        420,
        {
          easing: "steps(6)",
          fill: "forwards",
        },
      );
    }
    sfx.tearOff();
    haptic(feel.haptic.tear);
    setIdeas(suggestTitles(concept, book.collected, createRng(freshSeed()), 3));
    setSpins((n) => n + 1);
    say(spins === 0 ? "Ooh, names!" : "Another capsule!");
    setSpinning(false);
  }

  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      <TextField
        label="Your title"
        value={concept.title}
        onChange={(title) => update({ title })}
        placeholder="Type one, or spin the gacha"
        maxLength={60}
      />

      <div className="px-gacha">
        <div className="px-gacha-machine" aria-hidden>
          <PixelArt rows={MACHINE} />
          <span ref={knob} className="px-gacha-knob">
            <PixelArt rows={KNOB} />
          </span>
          <span ref={capsule} className={`px-gacha-capsule${spins ? " out" : ""}`}>
            <PixelArt rows={CAPSULE} />
          </span>
        </div>
        <button
          type="button"
          className="dk-btn primary px-gacha-go"
          onClick={() => void spin()}
          disabled={spinning}
        >
          {spins ? "Spin again" : "Turn the knob"}
        </button>
        {ideas.length > 0 && (
          <ul className="px-tickets">
            {ideas.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  aria-pressed={concept.title === t}
                  aria-label={`Use “${t}” as the title`}
                  onClick={() => {
                    update({ title: t });
                    sfx.thud();
                  }}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {extras && !!concept.titleCandidates.length && (
        <div className="dk-chips" aria-label="Saved candidates">
          {concept.titleCandidates.map((t) => (
            <button
              key={t}
              type="button"
              className="dk-chip"
              aria-pressed={concept.title === t}
              onClick={() => update({ title: t })}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
