import Link from "next/link";
import { forwardRef, type ReactNode } from "react";
import {
  filledCount,
  sectionHasContent,
  SECTIONS,
  type PitchCardLine,
  type PitchModel,
  type SectionId,
} from "@/lib/scrapbook/pitch";
import type { PageId } from "@/lib/scrapbook/types";

function Section({
  label,
  edit,
  children,
}: {
  label: string;
  edit?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="dk-sp-section">
      <header>
        <h2>{label}</h2>
        {edit}
      </header>
      {children}
    </section>
  );
}

function Chips({ items }: { items: PitchCardLine[] }) {
  return (
    <ul className="dk-sp-chips">
      {items.map((c) => (
        <li key={c.title} className={c.primary ? "primary" : ""}>
          {c.primary && <span aria-label="primary">★ </span>}
          {c.title}
          {c.note && <small> — {c.note}</small>}
        </li>
      ))}
    </ul>
  );
}

/**
 * The pitch as a scrapbook spread. Only sections that have content are shown; nothing is made up.
 * Pass `editHref` to show ✎ links back to the page that edits each part (hidden when exporting).
 */
export const PitchSpread = forwardRef<
  HTMLDivElement,
  { model: PitchModel; editHref?: (page: PageId) => string }
>(function PitchSpread({ model: m, editHref }, ref) {
  const has = (id: SectionId) => sectionHasContent(m, id);
  const edit = (page: PageId) =>
    editHref ? (
      <Link href={editHref(page)} className="dk-sp-edit no-export" aria-label="Edit this section">
        ✎ Edit
      </Link>
    ) : null;
  const missing = SECTIONS.filter((s) => !has(s.id));
  const meta = [m.genres.join(" + "), m.platforms.join(" / ")].filter(Boolean).join("  ·  ");
  const proj = [
    m.project.jamTheme && `Theme: ${m.project.jamTheme}`,
    m.project.duration && m.project.duration,
    m.project.teamSize,
  ].filter(Boolean);

  return (
    <article ref={ref} className="dk-spread" aria-label={`Pitch: ${m.title || "untitled"}`}>
      <span className="dk-sp-tape a" aria-hidden />
      <span className="dk-sp-tape b" aria-hidden />
      {m.status === "pitched" && <span className="dk-sp-stamp">PITCHED</span>}

      <header className="dk-sp-head">
        {m.project.name && <p className="dk-eyebrow">{m.project.name}</p>}
        <h1>
          {m.title ||
            (editHref ? <span className="dk-sp-empty">Untitled game</span> : "Untitled game")}
        </h1>
        {m.tagline && <p className="dk-sp-tagline">“{m.tagline}”</p>}
        {meta && <p className="dk-sp-meta">{meta}</p>}
        {!!proj.length && <p className="dk-sp-proj">{proj.join(" · ")}</p>}
        <span className="no-export">{!m.title && edit("title")}</span>
      </header>

      {filledCount(m) === 0 && (
        <p className="dk-empty">
          Nothing here yet. Fill in a scrapbook page and it appears on this spread.
        </p>
      )}

      <div className="dk-sp-body">
        {has("highConcept") && (
          <Section label="High concept" edit={edit("concept")}>
            <p className="dk-sp-big">{m.highConcept}</p>
          </Section>
        )}

        {has("mechanics") && (
          <Section label="Core mechanics" edit={edit("mechanics")}>
            <ul className="dk-sp-cards">
              {m.mechanics.map((c) => (
                <li key={c.title}>
                  <strong>
                    {c.favorite && "★ "}
                    {c.title}
                  </strong>
                  {c.description && <small>{c.description}</small>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {has("loop") && (
          <Section label="Core gameplay loop" edit={edit("loop")}>
            {m.loops.map((l, i) => (
              <div key={l.name + i} className="dk-sp-loop">
                {m.loops.length > 1 && (
                  <small>
                    {l.name}
                    {i === m.activeLoop ? " (main)" : ""}
                  </small>
                )}
                <p>
                  {l.steps.map((s) => s.toUpperCase()).join(" → ")} <b>→ REPEAT ↻</b>
                </p>
              </div>
            ))}
          </Section>
        )}

        {has("objective") && (
          <Section label="Player objective" edit={edit("objective")}>
            <p className="dk-sp-big">{m.objective}</p>
          </Section>
        )}

        {has("hook") && (
          <Section label="Unique hook" edit={edit("hook")}>
            {m.hook && <p className="dk-sp-big">{m.hook}</p>}
            {!!m.twists.length && <Chips items={m.twists} />}
          </Section>
        )}

        {has("mood") && (
          <Section label="Mood & setting" edit={edit("mood")}>
            {!!m.mood.length && (
              <>
                <small className="dk-sp-sub">Mood</small>
                <Chips items={m.mood} />
              </>
            )}
            {!!m.setting.length && (
              <>
                <small className="dk-sp-sub">Setting</small>
                <Chips items={m.setting} />
              </>
            )}
          </Section>
        )}

        {has("visual") && (
          <Section label="Visual direction" edit={edit("mood")}>
            <Chips items={m.visual} />
          </Section>
        )}

        {has("audio") && (
          <Section label="Audio direction" edit={edit("mood")}>
            <Chips items={m.audio} />
          </Section>
        )}

        {has("scope") && (
          <Section label="Scope" edit={edit("scope")}>
            <ul className="dk-sp-scope">
              {m.scope.map((s) => (
                <li key={s.label}>
                  <span>{s.label}</span>
                  <span className="dk-pips" aria-label={`${s.points} of 10`}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <i key={i} className={i < s.points ? "on" : ""} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {has("mvp") && (
          <Section label="MVP" edit={edit("scope")}>
            <div className="dk-sp-mvp">
              {(
                [
                  ["Must have", m.mvp.must],
                  ["Nice to have", m.mvp.nice],
                  ["Cut first", m.mvp.cut],
                ] as const
              ).map(
                ([label, items]) =>
                  items.length > 0 && (
                    <div key={label}>
                      <h3>{label}</h3>
                      <ul>
                        {items.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  ),
              )}
            </div>
          </Section>
        )}

        {m.project.restrictions && (
          <Section label="Restrictions" edit={edit("setup")}>
            <p>{m.project.restrictions}</p>
          </Section>
        )}
      </div>

      {editHref && !!missing.length && filledCount(m) > 0 && (
        <p className="dk-sp-missing no-export">
          Not in your pitch yet:{" "}
          {missing.map((s, i) => (
            <span key={s.id}>
              <Link href={editHref(s.page)}>{s.label}</Link>
              {i < missing.length - 1 ? ", " : ""}
            </span>
          ))}
          . Skip anything you like.
        </p>
      )}
    </article>
  );
});
