"use client";

/** Prints the page (hidden on paper). */
export function PrintButton() {
  return (
    <button type="button" className="dk-btn primary jk-print" onClick={() => window.print()}>
      Print this poster
    </button>
  );
}
