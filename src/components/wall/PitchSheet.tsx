"use client";

import { useState } from "react";
import type { PitchModel } from "@/lib/scrapbook/pitch";
import type { WallComment } from "@/lib/scrapbook/types";
import { PitchSpread } from "../summary/PitchSpread";
import { BottomSheet } from "../ui/BottomSheet";

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** A full pitch to read and discuss, with its comment thread (saved on this device). */
export function PitchSheet({
  open,
  model,
  comments,
  author,
  canVote,
  voted,
  onVote,
  onComment,
  onClose,
}: {
  open: boolean;
  model: PitchModel;
  comments: WallComment[];
  author: string;
  canVote: boolean;
  voted: boolean;
  onVote: () => void;
  onComment: (author: string, body: string) => void;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  return (
    <BottomSheet open={open} title={model.title || "Pitch"} onClose={onClose}>
      <div className="dk-sheet-pitch">
        <PitchSpread model={model} />
      </div>
      {canVote && (
        <button
          type="button"
          className={`dk-btn${voted ? "" : " primary"}`}
          aria-pressed={voted}
          onClick={onVote}
        >
          {voted ? "✓ You voted for this (tap to undo)" : "Vote for this pitch"}
        </button>
      )}
      <section className="dk-block">
        <h3>Discussion{comments.length ? ` (${comments.length})` : ""}</h3>
        {comments.length === 0 && (
          <p className="dk-hint">No comments yet. What do you like? What worries you?</p>
        )}
        <ul className="dk-comments">
          {comments.map((c) => (
            <li key={c.id}>
              <small>
                {c.author} · {when(c.at)}
              </small>
              <p>{c.body}</p>
            </li>
          ))}
        </ul>
        <form
          className="dk-block"
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim()) return;
            onComment(name.trim() || author, body);
            setBody("");
          }}
        >
          <input
            className="dk-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={author ? `Name (${author})` : "Your name (optional)"}
            aria-label="Your name"
            maxLength={30}
          />
          <textarea
            className="dk-input"
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment"
            aria-label="Comment"
            maxLength={500}
          />
          <button type="submit" className="dk-btn small primary" disabled={!body.trim()}>
            Post comment
          </button>
        </form>
        <p className="dk-hint">Comments are saved on this device only.</p>
      </section>
    </BottomSheet>
  );
}
