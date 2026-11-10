"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { download, slug } from "@/lib/export";
import { buildPitchModel, pitchMarkdown, pitchUrl } from "@/lib/scrapbook/pitch";
import { scrapbookStore, useScrapbooks } from "@/lib/scrapbook/store";
import type { PageId } from "@/lib/scrapbook/types";
import { sfx } from "@/lib/sound";
import { ConceptSwitcher } from "../scrapbook/ConceptSwitcher";
import { DeskRoot } from "../ui/DeskRoot";
import { PitchSpread } from "./PitchSpread";

/** Stage 07: the pitch spread, with actions to save, duplicate, export and share. */
export function SummaryRoute() {
  const params = useSearchParams();
  const router = useRouter();
  const { ready, scrapbooks, concepts, lastId } = useScrapbooks();
  const spread = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState<string | null>(null);
  const book = scrapbooks.find((s) => s.id === (params.get("id") ?? lastId));
  const list = book ? concepts.filter((c) => c.scrapbookId === book.id) : [];
  const concept =
    list.find((c) => c.id === params.get("concept")) ??
    list.find((c) => c.id === book?.activeConceptId) ??
    list[0];
  const model = useMemo(
    () => (book && concept ? buildPitchModel(book, concept) : null),
    [book, concept],
  );

  if (!ready) return <DeskRoot className="dk-shell" />;
  if (!book || !concept || !model)
    return (
      <DeskRoot className="dk-shell">
        <div style={{ margin: "auto", padding: 24, display: "grid", gap: 14, textAlign: "center" }}>
          <h1>No pitch to show</h1>
          <Link className="dk-btn primary" href="/">
            Go to the desk
          </Link>
        </div>
      </DeskRoot>
    );

  const say = (t: string) => {
    setNote(t);
    setTimeout(() => setNote(null), 2600);
  };
  const open = (conceptId: string) => {
    scrapbookStore.setActiveConcept(book.id, conceptId);
    router.replace(`/scrapbook/summary?id=${book.id}&concept=${conceptId}`);
  };
  const editHref = (page: PageId) => `/scrapbook?id=${book.id}&page=${page}`;
  const fname = slug(model.title || "game-pitch");

  async function exportImage() {
    if (!spread.current) return;
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(spread.current, {
        pixelRatio: 2,
        backgroundColor: "#faf4e6",
        cacheBust: true,
        filter: (n) => !(n instanceof HTMLElement && n.classList.contains("no-export")),
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fname}.png`;
      a.click();
      say("Image saved.");
    } catch {
      say("Couldn't make the image. Try Print / PDF instead.");
    }
  }
  async function share() {
    const url = pitchUrl(model!);
    try {
      if (navigator.share) await navigator.share({ title: model!.title || "A game pitch", url });
      else {
        await navigator.clipboard.writeText(url);
        say("Link copied. It holds the whole pitch, nothing is uploaded.");
      }
    } catch {
      say("Sharing was cancelled.");
    }
  }
  async function copyText() {
    const md = pitchMarkdown(model!);
    try {
      await navigator.clipboard.writeText(md);
      say("Pitch text copied.");
    } catch {
      download(`${fname}.md`, md, "text/markdown");
      say("Saved as a text file.");
    }
  }

  return (
    <DeskRoot className="dk-summary">
      <header className="dk-topbar no-print">
        <Link
          href={`/scrapbook?id=${book.id}&page=close`}
          className="dk-icon-btn"
          aria-label="Back to the scrapbook"
        >
          ‹
        </Link>
        <div className="dk-title">
          <strong>Close the scrapbook</strong>
          <small>{book.name.trim() || "Untitled scrapbook"}</small>
        </div>
        <ConceptSwitcher
          book={book}
          concepts={list}
          activeId={concept.id}
          onSelect={open}
          label={false}
        />
      </header>

      <main className="dk-summary-main">
        <PitchSpread ref={spread} model={model} editHref={editHref} />

        <div className="dk-sp-actions no-print">
          <button
            type="button"
            className={`dk-btn${concept.status === "pitched" ? "" : " primary"}`}
            onClick={() => {
              scrapbookStore.updateConcept(concept.id, {
                status: concept.status === "pitched" ? "draft" : "pitched",
              });
              sfx.thud();
              say(
                concept.status === "pitched"
                  ? "Moved back to draft."
                  : "Saved as pitched. It's ready for the Pitch Wall.",
              );
            }}
          >
            {concept.status === "pitched" ? "Back to draft" : "Save as pitched"}
          </button>
          <button type="button" className="dk-btn" onClick={() => void share()}>
            Share link
          </button>
          <button type="button" className="dk-btn" onClick={() => void exportImage()}>
            Save as image
          </button>
          <button type="button" className="dk-btn" onClick={() => window.print()}>
            Print / PDF
          </button>
          <button type="button" className="dk-btn" onClick={() => void copyText()}>
            Copy as text
          </button>
          <button
            type="button"
            className="dk-btn"
            onClick={() => {
              const id = scrapbookStore.duplicateConcept(concept.id);
              if (id) open(id);
            }}
          >
            Duplicate concept
          </button>
          <Link className="dk-btn" href={`/wall?id=${book.id}`}>
            Pitch Wall
          </Link>
          <button
            type="button"
            className="dk-btn"
            onClick={() => {
              const id = scrapbookStore.addConcept(book.id);
              router.push(`/scrapbook?id=${book.id}&page=title&concept=${id}`);
            }}
          >
            New concept
          </button>
        </div>
        {note && (
          <p className="dk-toast no-print" role="status">
            {note}
          </p>
        )}
      </main>
    </DeskRoot>
  );
}
