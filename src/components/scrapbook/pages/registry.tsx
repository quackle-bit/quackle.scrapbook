"use client";

import type { ComponentType } from "react";
import type { Concept, PageId, Scrapbook } from "@/lib/scrapbook/types";
import { PageFrame } from "./PageFrame";
import { ClosePage } from "./ClosePage";
import { GenrePage } from "./GenrePage";
import { HighConceptPage } from "./HighConceptPage";
import { HookPage } from "./HookPage";
import { LoopPage } from "./LoopPage";
import { MechanicsPage } from "./MechanicsPage";
import { MoodPage } from "./MoodPage";
import { ObjectivePage } from "./ObjectivePage";
import { ScopePage } from "./ScopePage";
import { SetupPage } from "./SetupPage";
import { TaglinePage } from "./TaglinePage";
import { TitlePage } from "./TitlePage";

export type PageDef = { id: PageId; group: string; title: string; prompt: string; extra?: boolean };
export type PageCtx = {
  book: Scrapbook;
  concept: Concept;
  page: PageDef;
  goTo: (id: PageId) => void;
};

/**
 * The short early pitch, in order: what the game *is* first, its name last.
 * `extra` pages are hidden unless "Show extra pages" is on (their data is kept either way).
 */
export const ALL_PAGES: PageDef[] = [
  {
    id: "setup",
    group: "Setup",
    title: "Your jam",
    prompt: "The theme, the time and the team. Skip what you don't know.",
  },
  {
    id: "mechanics",
    group: "Playground",
    title: "Core mechanics",
    prompt: "Open a pack. Keep what sparks something.",
  },
  {
    id: "loop",
    group: "Playground",
    title: "Core loop",
    prompt: "What does the player do, over and over?",
  },
  {
    id: "objective",
    group: "Playground",
    title: "Objective",
    prompt: "What is the player trying to achieve?",
    extra: true,
  },
  {
    id: "hook",
    group: "Playground",
    title: "The twist",
    prompt: "What makes it different? Find a twist under the cups.",
  },
  {
    id: "mood",
    group: "Atmosphere",
    title: "Mood & world",
    prompt: "How it feels, where it is, how it looks.",
  },
  {
    id: "scope",
    group: "Production",
    title: "Scope",
    prompt: "What must be in the jam build, and what goes first?",
  },
  {
    id: "genre",
    group: "Name it",
    title: "Genre",
    prompt: "Now you know what it is: what shelf does it sit on?",
  },
  {
    id: "title",
    group: "Name it",
    title: "Title",
    prompt: "Spin the gacha for a name, or write your own.",
  },
  { id: "tagline", group: "Name it", title: "Tagline", prompt: "One line to sell it. Optional." },
  {
    id: "concept",
    group: "Name it",
    title: "High concept",
    prompt: "What is your game about? One or two sentences.",
    extra: true,
  },
  {
    id: "close",
    group: "Close",
    title: "Close the book",
    prompt: "Check what your pitch has, then stamp it.",
  },
];

export const pagesFor = (showExtras: boolean) => ALL_PAGES.filter((p) => showExtras || !p.extra);
/** The default (short) flow. */
export const PAGES = pagesFor(false);

/** Pages that don't have their own screen yet show their question and nothing else. */
function Pending({ page }: PageCtx) {
  return (
    <PageFrame group={page.group} title={page.title} prompt={page.prompt}>
      <p className="dk-empty">This page is coming together next.</p>
    </PageFrame>
  );
}

const SCREENS: Partial<Record<PageId, ComponentType<PageCtx>>> = {
  setup: SetupPage,
  title: TitlePage,
  tagline: TaglinePage,
  concept: HighConceptPage,
  genre: GenrePage,
  mechanics: MechanicsPage,
  loop: LoopPage,
  objective: ObjectivePage,
  hook: HookPage,
  mood: MoodPage,
  scope: ScopePage,
  close: ClosePage,
};

export function PageScreen(props: PageCtx) {
  const C = SCREENS[props.page.id] ?? Pending;
  return <C {...props} />;
}
