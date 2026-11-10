import type { ReactNode } from "react";

/** The common top of a scrapbook page: which section it belongs to, its title and its question. */
export function PageFrame({
  group,
  title,
  prompt,
  children,
}: {
  group: string;
  title: string;
  prompt: string;
  children?: ReactNode;
}) {
  return (
    <section className="dk-page" aria-label={title}>
      <header style={{ display: "grid", gap: 6 }}>
        <p className="dk-eyebrow">{group}</p>
        <h2>{title}</h2>
        <p className="dk-prompt">{prompt}</p>
      </header>
      <div className="dk-page-body">{children}</div>
    </section>
  );
}
