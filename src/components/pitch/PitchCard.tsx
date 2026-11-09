"use client";

import { forwardRef, type ReactNode } from "react";
import type { CardData, SlotId } from "@/lib/deck";
import { filledDetails, readiness, type Pitch } from "@/lib/pitch";

export type PitchLine = SlotId | "title" | "tagline" | "genre" | "platform" | "notes";

function Line({
  k,
  onLine,
  className,
  children,
}: {
  k: PitchLine;
  onLine?: (k: PitchLine) => void;
  className: string;
  children: ReactNode;
}) {
  return onLine ? (
    <button type="button" className={`pc-line ${className}`} onClick={() => onLine(k)}>
      {children}
    </button>
  ) : (
    <div className={`pc-line ${className}`}>{children}</div>
  );
}

/**
 * The pitch as everyone reads it: title, tagline, genre · platforms, short detail lines and
 * notes. Same layout everywhere (book, album, share link, studio), so pitches compare easily.
 */
export const PitchCard = forwardRef<
  HTMLDivElement,
  {
    pitch: Pitch;
    cards: Partial<Record<SlotId, CardData>>;
    palette?: string[];
    /** Make each line tappable (jump to where it's filled). */
    onLine?: (k: PitchLine) => void;
    footer?: ReactNode;
    byline?: string;
  }
>(function PitchCard({ pitch, cards, palette, onLine, footer, byline }, ref) {
  const details = filledDetails(pitch, cards);
  const { ready } = readiness(pitch, cards);
  const meta = [pitch.genre, pitch.platforms.join(" / ")].filter(Boolean).join(" · ");

  return (
    <article ref={ref} className="pitch-card" aria-label={`Pitch: ${pitch.title || "untitled"}`}>
      {!!palette?.length && (
        <div className="pc-strip" aria-hidden>
          {palette.map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
        </div>
      )}
      <Line k="title" onLine={onLine} className="pc-title">
        {pitch.title || <span className="pc-empty">Untitled</span>}
      </Line>
      <Line k="tagline" onLine={onLine} className="pc-tagline">
        {pitch.tagline ? `“${pitch.tagline}”` : <span className="pc-empty">tagline…</span>}
      </Line>
      <Line k="genre" onLine={onLine} className="pc-meta">
        {meta || <span className="pc-empty">genre · platform</span>}
      </Line>
      {byline && <div className="pc-byline">{byline}</div>}
      <dl className="pc-details">
        {details.length ? (
          details.map((d) => (
            <div key={d.slot} className="pc-detail">
              <dt>{d.label}</dt>
              <dd>
                {onLine ? (
                  <button type="button" className="pc-detail-btn" onClick={() => onLine(d.slot)}>
                    {d.text}
                  </button>
                ) : (
                  d.text
                )}
              </dd>
            </div>
          ))
        ) : (
          <div className="pc-detail">
            <dd className="pc-empty">details fill in as you stamp cards</dd>
          </div>
        )}
      </dl>
      {pitch.notes.trim() && (
        <Line k="notes" onLine={onLine} className="pc-notes">
          {pitch.notes.trim()}
        </Line>
      )}
      {ready && <div className="pc-ready">READY TO PITCH</div>}
      {footer}
    </article>
  );
});
