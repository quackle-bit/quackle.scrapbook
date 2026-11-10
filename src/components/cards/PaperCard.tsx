import type { ReactNode } from "react";
import { TYPE_LABEL } from "@/lib/inspiration";
import type { CardType } from "@/lib/scrapbook/types";

/** A paper card: type band, title, short explanation, optional category. Used everywhere cards appear. */
export function PaperCard({
  type,
  title,
  description,
  category,
  kept,
  favorite,
  children,
  className = "",
}: {
  type: CardType;
  title: string;
  description?: string;
  category?: string;
  kept?: boolean;
  favorite?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <article className={`dk-card t-${type}${kept ? " is-kept" : ""} ${className}`}>
      <div className="dk-card-band">
        <span>{TYPE_LABEL[type]}</span>
        {favorite && (
          <span className="dk-fav" role="img" aria-label="Favorite">
            ★
          </span>
        )}
      </div>
      <h3 className="dk-card-title">{title}</h3>
      {description && <p className="dk-card-desc">{description}</p>}
      {category && <span className="dk-card-cat">{category}</span>}
      {kept && (
        <>
          <span className="dk-tape" aria-hidden />
          <span className="dk-stamp" aria-hidden>
            KEPT
          </span>
        </>
      )}
      {children}
    </article>
  );
}

export function CardBack({ label }: { label?: string }) {
  return (
    <div className="dk-card dk-card-back" aria-hidden>
      <span>Q</span>
      {label && <small>{label}</small>}
    </div>
  );
}
