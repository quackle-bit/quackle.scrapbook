"use client";

import { FullscreenButton } from "../ui/FullscreenButton";
import { AssetPanel } from "./AssetPanel";
import { Icon } from "../ui/Icon";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { download, slug } from "@/lib/export";
import { buildPitchModel, pitchMarkdown, pitchUrl } from "@/lib/scrapbook/pitch";
import { useScrapbooks } from "@/lib/scrapbook/store";
import type { PageId } from "@/lib/scrapbook/types";
import { sfx } from "@/lib/sound";
import { DeskRoot } from "../ui/DeskRoot";
import { PitchSpread } from "./PitchSpread";

/** Stage 07: the pitch spread, with actions to save, duplicate, export and share. */
export function SummaryRoute() {
  const params = useSearchParams();
  const { ready, scrapbooks, concepts, lastId } = useScrapbooks();
  const spread = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
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
  const editHref = (page: PageId) => `/scrapbook?id=${book.id}&page=${page}`;
  const fname = slug(model.title || "game-pitch");

  /** The pitch card as a PNG file (1080×1350). */
  async function cardFile() {
    if (!card.current) return null;
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(card.current, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
    return blob ? new File([blob], `${fname}.png`, { type: "image/png" }) : null;
  }
  function saveFile(f: File) {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  /** Share the card image through the phone's share sheet; fall back to saving it. */
  async function shareImage() {
    try {
      const f = await cardFile();
      if (!f) throw new Error("no image");
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], title: model!.title || "A game pitch" });
        sfx.thud();
      } else {
        saveFile(f);
        say("Image saved. Post it where your team votes.");
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return; // closed the share sheet
      say("Couldn't make the image. Try Print / PDF instead.");
    }
  }
  async function saveImage() {
    try {
      const f = await cardFile();
      if (!f) throw new Error("no image");
      saveFile(f);
      say("Image saved.");
    } catch {
      say("Couldn't make the image. Try Print / PDF instead.");
    }
  }
  async function copyLink() {
    const url = pitchUrl(model!);
    try {
      await navigator.clipboard.writeText(url);
      say("Link copied. It holds the whole pitch, nothing is uploaded.");
    } catch {
      say("Couldn't copy the link.");
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
          <Icon name="chevronLeft" />
        </Link>
        <div className="dk-title">
          <strong>Pitch</strong>
          <small>{book.name.trim() || "Untitled scrapbook"}</small>
        </div>
        <FullscreenButton />
      </header>

      <main className="dk-summary-main">
        <PitchSpread ref={spread} model={model} editHref={editHref} />
        <AssetPanel concept={concept} />

        <div className="pp-actions no-print">
          <button
            type="button"
            className="dk-btn primary pp-main"
            onClick={() => void shareImage()}
          >
            <Icon name="share" size={18} /> Share pitch image
          </button>
          <div className="pp-share">
            <button type="button" className="dk-btn" onClick={() => void saveImage()}>
              <Icon name="image" size={18} /> Save
            </button>
            <button type="button" className="dk-btn" onClick={() => void copyLink()}>
              <Icon name="copy" size={18} /> Link
            </button>
            <button type="button" className="dk-btn" onClick={() => void copyText()}>
              <Icon name="copy" size={18} /> Text
            </button>
          </div>
          <p className="pp-hint">Post the image in your team chat and vote with reactions.</p>
          <div className="pp-more">
            <button type="button" className="dk-link-btn" onClick={() => window.print()}>
              Print / PDF
            </button>
          </div>
        </div>
        {/* Off-screen: the image that gets shared, the same document at a fixed width. */}
        <div ref={card} className="pcard-holder" aria-hidden>
          <PitchSpread model={model} forExport />
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
