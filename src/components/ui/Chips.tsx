"use client";

type Opt = { value: string; label: string };

/** Large tap-friendly choices. `multi` toggles several; otherwise tapping the chosen one clears it. */
export function Chips({
  options,
  value,
  onChange,
  multi = false,
  label,
}: {
  options: Opt[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multi?: boolean;
  label: string;
}) {
  const sel = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <div className="dk-chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = sel.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            className="dk-chip"
            aria-pressed={on}
            onClick={() => {
              if (multi) onChange(on ? sel.filter((x) => x !== o.value) : [...sel, o.value]);
              else onChange(on ? "" : o.value);
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
