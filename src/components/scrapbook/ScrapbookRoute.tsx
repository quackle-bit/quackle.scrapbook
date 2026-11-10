"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useScrapbooks } from "@/lib/scrapbook/store";
import type { PageId } from "@/lib/scrapbook/types";
import { DeskRoot } from "../ui/DeskRoot";
import { PAGES } from "./pages/registry";
import { ScrapbookShell } from "./ScrapbookShell";

export function ScrapbookRoute() {
  const params = useSearchParams();
  const { ready, lastId, scrapbooks } = useScrapbooks();
  const wanted = params.get("id") ?? lastId;
  const pageParam = params.get("page");
  const startPage = PAGES.find((p) => p.id === pageParam)?.id as PageId | undefined;

  if (!ready) return <DeskRoot className="dk-shell" />;
  if (!wanted || !scrapbooks.some((s) => s.id === wanted))
    return (
      <DeskRoot className="dk-shell">
        <div style={{ margin: "auto", padding: 24, display: "grid", gap: 14, textAlign: "center" }}>
          <h1>No scrapbook open</h1>
          <Link className="dk-btn primary" href="/">
            Go to the desk
          </Link>
        </div>
      </DeskRoot>
    );
  return <ScrapbookShell key={wanted} bookId={wanted} startPage={startPage} />;
}
