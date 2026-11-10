import Link from "next/link";
import { Icon } from "../ui/Icon";
import { useSettings } from "@/lib/settings";
import { pagesFor } from "../scrapbook/pages/registry";
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
    <section className="pp-section">
      <header>
        <h2>{label}</h2>
        {edit}
      </header>
      {children}
    </section>
  );
}

function Tags({ items }: { items: PitchCardLine[] }) {
  return (
    <ul className="pp-tags">
      {items.map((c) => (
        <li key={c.title} className={c.primary ? "primary" : ""}>
          {c.title}
          {c.note && <small> · {c.note}</small>}
        </li>
      ))}
    </ul>
  );
}

/**
 * The pitch as a clean, readable sheet. Only sections that have content are shown; nothing is made up.
 * Pass `editHref` to show ✎ links back to the page that edits each part (hidden when exporting).
 */
export const PitchSpread = forwardRef<
  HTMLDivElement,
  { model: PitchModel; editHref?: (page: PageId) => string }
>(function PitchSpread({ model: m, editHref }, ref) {
  const { showExtras } = useSettings();
  const has = (id: SectionId) => sectionHasContent(m, id);
  const edit = (page: PageId) =>
    editHref ? (
      <Link href={editHref(page)} className="pp-edit no-export" aria-label="Edit this section">
        <Icon name="edit" size={16} />
      </Link>
    ) : null;
  // Only ask for sections whose page is in the current flow (extras hidden by default).
  const visible = new Set(pagesFor(showExtras).map((p) => p.id));
  // High concept and objective are extras: don't nag about them unless extras are on.
  const extraOnly = new Set<SectionId>(["highConcept", "objective"]);
  const missing = SECTIONS.filter(
    (s) => !has(s.id) && visible.has(s.page) && (showExtras || !extraOnly.has(s.id)),
  );
  const proj = [
    m.project.jamTheme && `Theme: ${m.project.jamTheme}`,
    m.project.duration && m.project.duration,
    m.project.teamSize,
  ].filter(Boolean);

  return (
    <article ref={ref} className="pp" aria-label={`Pitch: ${m.title || "untitled"}`}>
      <header className="pp-head">
        <div className="pp-head-row">
          {m.project.name && <p className="pp-kicker">{m.project.name}</p>}
          {m.status === "pitched" && <span className="pp-badge">Pitched</span>}
        </div>
        <h1>{m.title || <span className="pp-empty">Untitled game</span>}</h1>
        {m.tagline && <p className="pp-tagline">{m.tagline}</p>}
        {(m.genres.length > 0 || m.platforms.length > 0) && (
          <ul className="pp-meta">
            {m.genres.map((g) => (
              <li key={g}>{g}</li>
            ))}
            {m.platforms.map((pl) => (
              <li key={pl} className="plat">
                {pl}
              </li>
            ))}
          </ul>
        )}
        {!!proj.length && <p className="pp-proj">{proj.join(" · ")}</p>}
        {!m.title && <span className="no-export">{edit("title")}</span>}
      </header>

      {filledCount(m) === 0 && !m.assets?.length && !m.assetNotes && (
        <p className="pp-nothing">
          Nothing here yet. Fill in a scrapbook page and it shows up here.
        </p>
      )}

      {has("highConcept") && (
        <Section label="High concept" edit={edit("concept")}>
          <p className="pp-lead">{m.highConcept}</p>
        </Section>
      )}

      {has("hook") && (
        <Section label="The twist" edit={edit("hook")}>
          {m.hook && <p className="pp-lead">{m.hook}</p>}
          {!!m.twists.length && <Tags items={m.twists} />}
        </Section>
      )}

      {has("mechanics") && (
        <Section label="Core mechanics" edit={edit("mechanics")}>
          <ul className="pp-list">
            {m.mechanics.map((c) => (
              <li key={c.title}>
                <strong>{c.title}</strong>
                {c.description && <span>{c.description}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {has("loop") && (
        <Section label="Core loop" edit={edit("loop")}>
          {m.loops.map((l, i) => (
            <div key={l.name + i} className="pp-loop">
              {m.loops.length > 1 && (
                <small>
                  {l.name}
                  {i === m.activeLoop ? " (main)" : ""}
                </small>
              )}
              <ol>
                {l.steps.map((step, j) => (
                  <li key={j}>{step}</li>
                ))}
              </ol>
              <p className="pp-repeat">
                <Icon name="refresh" size={14} /> then repeat
              </p>
            </div>
          ))}
        </Section>
      )}

      {has("objective") && (
        <Section label="Player objective" edit={edit("objective")}>
          <p className="pp-lead">{m.objective}</p>
        </Section>
      )}

      {(has("mood") || has("visual") || has("perspective") || has("audio")) && (
        <Section label="Mood & world" edit={edit("mood")}>
          <dl className="pp-dl">
            {!!m.mood.length && (
              <>
                <dt>Mood</dt>
                <dd>
                  <Tags items={m.mood} />
                </dd>
              </>
            )}
            {!!m.setting.length && (
              <>
                <dt>Setting</dt>
                <dd>
                  <Tags items={m.setting} />
                </dd>
              </>
            )}
            {!!m.visual.length && (
              <>
                <dt>Look</dt>
                <dd>
                  <Tags items={m.visual} />
                </dd>
              </>
            )}
            {!!m.perspective.length && (
              <>
                <dt>View</dt>
                <dd>
                  <Tags items={m.perspective} />
                </dd>
              </>
            )}
            {!!m.audio.length && (
              <>
                <dt>Sound</dt>
                <dd>
                  <Tags items={m.audio} />
                </dd>
              </>
            )}
          </dl>
        </Section>
      )}

      {has("mvp") && (
        <Section label="Scope" edit={edit("scope")}>
          <div className="pp-mvp">
            {m.mvp.must.length > 0 && (
              <div>
                <h3>Must have</h3>
                <ul>
                  {m.mvp.must.map((t) => (
                    <li key={t}>
                      <Icon name="check" size={16} /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {m.mvp.nice.length > 0 && (
              <div>
                <h3>Nice to have</h3>
                <ul>
                  {m.mvp.nice.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {m.mvp.cut.length > 0 && (
              <div className="cut">
                <h3>Cut first</h3>
                <ul>
                  {m.mvp.cut.map((t) => (
                    <li key={t}>
                      <Icon name="close" size={16} /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {has("scope") && (
        <Section label="Effort split" edit={edit("scope")}>
          <ul className="pp-bars">
            {m.scope.map((s) => (
              <li key={s.label}>
                <span>{s.label}</span>
                <span className="pp-bar" aria-label={`${s.points} of 10`}>
                  <i style={{ width: `${s.points * 10}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(m.assets?.length > 0 || !!m.assetNotes) && (
        <Section label="Assets">
          {m.assets?.length > 0 && (
            <ul className="pp-assets">
              {m.assets.map((a) => (
                <li key={a.label}>
                  <strong>{a.count}</strong> {a.label}
                  {a.note && <small> · {a.note}</small>}
                </li>
              ))}
            </ul>
          )}
          {m.assetNotes && <p className="pp-notes">{m.assetNotes}</p>}
        </Section>
      )}

      {m.project.restrictions && (
        <Section label="Restrictions" edit={edit("setup")}>
          <p>{m.project.restrictions}</p>
        </Section>
      )}

      {editHref && !!missing.length && filledCount(m) > 0 && (
        <p className="pp-missing no-export">
          Not in the pitch yet:{" "}
          {missing.map((s, i) => (
            <span key={s.id}>
              <Link href={editHref(s.page)}>{s.label}</Link>
              {i < missing.length - 1 ? ", " : ""}
            </span>
          ))}
          .
        </p>
      )}
    </article>
  );
});
