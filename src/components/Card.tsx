"use client";

import type { CSSProperties, PointerEvent } from "react";
import type { CardData } from "@/lib/deck";

const TYPE_LABEL: Record<CardData["slot"], string> = {
  seed: "WORD",
  verb: "VERB",
  look: "LOOK",
  twist: "TWIST",
};
const PIPS: Record<CardData["rarity"], string> = {
  common: "◆◇◇",
  uncommon: "◆◆◇",
  rare: "◆◆◆",
  mythic: "★★★",
};

/** Foil follows the pointer on rare and mythic cards. */
function trackFoil(e: PointerEvent<HTMLDivElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
  e.currentTarget.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
}

export function CardFace({
  card,
  small,
  style,
}: {
  card: CardData;
  small?: boolean;
  style?: CSSProperties;
}) {
  const long = card.text.length > 18;
  return (
    <div
      className={`card face t-${card.slot} r-${card.rarity}${small ? " small" : ""}`}
      style={style}
      onPointerMove={card.rarity === "rare" || card.rarity === "mythic" ? trackFoil : undefined}
    >
      <div className="card-top">
        <span>{TYPE_LABEL[card.slot]}</span>
        <span aria-label={card.rarity}>{PIPS[card.rarity]}</span>
      </div>
      <div className={`card-word${long ? " long" : ""}`}>{card.text}</div>
      {card.palette && (
        <div className="swatch" aria-hidden>
          {card.palette.map((c) => (
            <span key={c} style={{ background: c }} />
          ))}
        </div>
      )}
      {!small && (
        <>
          <div className="card-tags">{card.tags.slice(0, 3).join(" · ")}</div>
          {card.flavor && <div className="card-flavor">“{card.flavor}”</div>}
          <div className="card-foot">
            <span>#{String(card.serial).padStart(4, "0")}</span>
            <span>2026</span>
          </div>
        </>
      )}
      <div className="foil" aria-hidden />
    </div>
  );
}

export function CardBack() {
  return (
    <div className="card back" aria-hidden>
      <span>q.s</span>
    </div>
  );
}
