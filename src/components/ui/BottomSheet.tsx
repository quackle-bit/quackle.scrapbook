"use client";

import { Icon } from "./Icon";
import { useEffect, useRef, type ReactNode } from "react";

/** One reusable bottom sheet for secondary actions (page index, settings, radio, card actions). */
export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="dk-sheet-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className="dk-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="dk-sheet-grab" aria-hidden />
        <header className="dk-sheet-head">
          <h2>{title}</h2>
          <button type="button" className="dk-icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="dk-sheet-body">{children}</div>
      </div>
    </div>
  );
}
