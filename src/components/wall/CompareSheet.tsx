"use client";

import type { PitchModel } from "@/lib/scrapbook/pitch";
import { BottomSheet } from "../ui/BottomSheet";

const join = (xs: string[]) => xs.join(", ");
const titles = (xs: { title: string }[]) => join(xs.map((x) => x.title));

function rows(a: PitchModel, b: PitchModel) {
  const r = (m: PitchModel) => ({
    Genre: m.genres.join(" + "),
    Platform: m.platforms.join(" / "),
    "High concept": m.highConcept,
    Mechanics: titles(m.mechanics),
    "Core loop": (m.loops[m.activeLoop]?.steps ?? []).join(" → "),
    Objective: m.objective,
    "Unique hook": m.hook,
    Mood: titles(m.mood),
    Setting: titles(m.setting),
    Visual: titles(m.visual),
    Audio: titles(m.audio),
    Scope: m.scope.map((s) => `${s.label} ${s.points}`).join(", "),
    "Must have": join(m.mvp.must),
  });
  const A = r(a);
  const B = r(b);
  return (Object.keys(A) as (keyof typeof A)[])
    .map((k) => ({ label: k, a: A[k], b: B[k] }))
    .filter((x) => x.a || x.b);
}

/** Two pitches side by side (stacked into two columns per row, which reads fine on a phone). */
export function CompareSheet({
  open,
  a,
  b,
  onClose,
}: {
  open: boolean;
  a: PitchModel;
  b: PitchModel;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={open} title="Compare" onClose={onClose}>
      <div className="dk-compare">
        <div className="dk-compare-head">
          <strong>{a.title || "Untitled"}</strong>
          <strong>{b.title || "Untitled"}</strong>
        </div>
        {rows(a, b).map((r) => (
          <div key={r.label} className="dk-compare-row">
            <small>{r.label}</small>
            <div>
              <p>{r.a || <span className="dk-hint">—</span>}</p>
              <p>{r.b || <span className="dk-hint">—</span>}</p>
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
