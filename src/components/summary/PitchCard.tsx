import { forwardRef } from "react";
import type { PitchCardLine, PitchModel } from "@/lib/scrapbook/pitch";

const names = (xs: PitchCardLine[], n: number) => xs.slice(0, n).map((x) => x.title);

/**
 * The pitch as one portrait image (540×675 CSS px, exported at 2× = 1080×1350), made to be posted
 * in a chat and voted on with reactions. Lists are capped so it always fits; nothing is invented.
 */
export const PitchCard = forwardRef<HTMLDivElement, { model: PitchModel }>(function PitchCard(
  { model: m },
  ref,
) {
  const loop = m.loops[m.activeLoop] ?? m.loops[0];
  const world: [string, string[]][] = (
    [
      ["Mood", names(m.mood, 3)],
      ["Setting", names(m.setting, 3)],
      ["Look", names(m.visual, 3)],
      ["View", names(m.perspective, 2)],
      ["Sound", names(m.audio, 2)],
    ] as [string, string[]][]
  ).filter(([, v]) => v.length);
  const tags = [...m.genres, ...m.platforms];

  return (
    <div ref={ref} className="pcard" aria-hidden>
      <span className="pcard-spine" />
      <div className="pcard-inner">
        <p className="pcard-kicker">Game pitch</p>
        <h1>{m.title || "Untitled game"}</h1>
        {m.tagline && <p className="pcard-tagline">{m.tagline}</p>}
        {tags.length > 0 && (
          <ul className="pcard-tags dark">
            {tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}

        {(m.hook || m.twists.length > 0) && (
          <section>
            <h2>The twist</h2>
            <p className="pcard-lead">{m.hook || names(m.twists, 1)[0]}</p>
          </section>
        )}
        {m.mechanics.length > 0 && (
          <section>
            <h2>Mechanics</h2>
            <p>{names(m.mechanics, 3).join(" · ")}</p>
          </section>
        )}
        {loop && loop.steps.length > 0 && (
          <section>
            <h2>Core loop</h2>
            <p>{loop.steps.slice(0, 5).join(" → ")} → repeat</p>
          </section>
        )}
        {world.length > 0 && (
          <section>
            <h2>Mood &amp; world</h2>
            <dl>
              {world.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v.join(", ")}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {m.mvp.must.length > 0 && (
          <section>
            <h2>Must have</h2>
            <p>{m.mvp.must.slice(0, 3).join(" · ")}</p>
          </section>
        )}
      </div>
      {m.status === "pitched" && <span className="pcard-stamp">Pitched</span>}
      <p className="pcard-foot">made with quackle.scrapbook</p>
    </div>
  );
});
