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

export type PageDef = { id: PageId; group: string; title: string; prompt: string };
export type PageCtx = {
  book: Scrapbook;
  concept: Concept;
  page: PageDef;
  goTo: (id: PageId) => void;
};

export const PAGES: PageDef[] = [
  {
    id: "setup",
    group: "Setup",
    title: "Your jam",
    prompt: "Tell us about the jam. Skip anything you don't know yet.",
  },
  {
    id: "title",
    group: "Identity",
    title: "Game title",
    prompt: "Write a title, or open a word pack and see what catches your eye.",
  },
  {
    id: "tagline",
    group: "Identity",
    title: "Tagline",
    prompt: "How would you describe your game in one memorable sentence?",
  },
  {
    id: "concept",
    group: "Identity",
    title: "High concept",
    prompt: "What is your game about? One or two sentences is plenty.",
  },
  {
    id: "genre",
    group: "Playground",
    title: "Genre",
    prompt: "Open a pack. Pick a primary genre, and maybe a second one.",
  },
  {
    id: "mechanics",
    group: "Playground",
    title: "Core mechanics",
    prompt: "Open packs and keep whatever sparks something. Nothing is required.",
  },
  {
    id: "loop",
    group: "Playground",
    title: "Core loop",
    prompt: "What does your player do, over and over?",
  },
  {
    id: "objective",
    group: "Playground",
    title: "Objective",
    prompt: "What is the player trying to achieve?",
  },
  {
    id: "hook",
    group: "Playground",
    title: "Unique hook",
    prompt: "What makes this game interesting or different?",
  },
  {
    id: "mood",
    group: "Atmosphere",
    title: "Mood & world",
    prompt: "Pin up the feeling: mood, setting, look and sound.",
  },
  {
    id: "scope",
    group: "Production",
    title: "Scope & MVP",
    prompt: "What can we realistically build?",
  },
  {
    id: "close",
    group: "Close",
    title: "Close the scrapbook",
    prompt: "See everything you collected as one pitch.",
  },
];

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
