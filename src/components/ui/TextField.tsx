"use client";

import { useId } from "react";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline,
  maxLength,
  onEnter,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  maxLength?: number;
  onEnter?: () => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`dk-field ${className ?? ""}`}>
      {label && (
        <label htmlFor={id}>
          <span>{label}</span>
        </label>
      )}
      {multiline ? (
        <textarea
          id={id}
          className="dk-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
        />
      ) : (
        <input
          id={id}
          className="dk-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          placeholder={placeholder}
          maxLength={maxLength}
        />
      )}
      {hint && <small>{hint}</small>}
    </div>
  );
}
