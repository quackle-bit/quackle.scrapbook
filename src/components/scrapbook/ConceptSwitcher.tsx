"use client";

import { Icon } from "../ui/Icon";
import { useState } from "react";
import { buildPitchModel, filledCount, SECTIONS } from "@/lib/scrapbook/pitch";
import { scrapbookStore } from "@/lib/scrapbook/store";
import type { Concept, Scrapbook } from "@/lib/scrapbook/types";
import { BottomSheet } from "../ui/BottomSheet";

/** Several concepts per scrapbook: switch, duplicate, delete or start a new one. */
export function ConceptSwitcher({
  book,
  concepts,
  activeId,
  onSelect,
  label = true,
}: {
  book: Scrapbook;
  concepts: Concept[];
  activeId: string;
  onSelect: (conceptId: string) => void;
  label?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const active = concepts.find((c) => c.id === activeId) ?? concepts[0];
  const name = (c: Concept, i: number) => c.title.trim() || `Concept ${i + 1}`;
  return (
    <>
      <button
        type="button"
        className="dk-concept-btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {label && <small>Concept</small>}
        <strong>{active ? name(active, concepts.indexOf(active)) : "Concept"}</strong>
        <Icon name="chevronDown" size={16} />
        {concepts.length > 1 && <em>{concepts.length}</em>}
      </button>
      <BottomSheet open={open} title="Concepts" onClose={() => setOpen(false)}>
        <ul className="dk-list">
          {concepts.map((c, i) => {
            const n = filledCount(buildPitchModel(book, c));
            return (
              <li key={c.id} className="dk-list-item">
                <h3>
                  {c.id === activeId && "● "}
                  {name(c, i)}
                </h3>
                <small>
                  {n} / {SECTIONS.length} sections{c.status === "pitched" ? " · pitched" : ""}
                </small>
                <div className="dk-row">
                  {c.id !== activeId && (
                    <button
                      type="button"
                      className="dk-btn small primary"
                      onClick={() => {
                        onSelect(c.id);
                        setOpen(false);
                      }}
                    >
                      Open
                    </button>
                  )}
                  <button
                    type="button"
                    className="dk-btn small"
                    onClick={() => {
                      const id = scrapbookStore.duplicateConcept(c.id);
                      if (id) {
                        onSelect(id);
                        setOpen(false);
                      }
                    }}
                  >
                    Duplicate
                  </button>
                  {concepts.length > 1 &&
                    (confirm === c.id ? (
                      <>
                        <button
                          type="button"
                          className="dk-btn small terra"
                          onClick={() => {
                            const next = concepts.find((x) => x.id !== c.id)!;
                            scrapbookStore.deleteConcept(c.id);
                            if (c.id === activeId) onSelect(next.id);
                            setConfirm(null);
                          }}
                        >
                          Delete for good
                        </button>
                        <button
                          type="button"
                          className="dk-btn small ghost"
                          onClick={() => setConfirm(null)}
                        >
                          Keep
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="dk-btn small ghost"
                        onClick={() => setConfirm(c.id)}
                      >
                        Delete…
                      </button>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="dk-btn primary"
          onClick={() => {
            onSelect(scrapbookStore.addConcept(book.id));
            setOpen(false);
          }}
        >
          + New concept
        </button>
        <p className="dk-hint">Cards you&apos;ve collected can be reused in every concept.</p>
      </BottomSheet>
    </>
  );
}
