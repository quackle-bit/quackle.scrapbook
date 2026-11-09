import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { HomeDuck } from "@/components/HomeDuck";

export const metadata: Metadata = {
  title: "How it's made · quackle.scrapbook",
  description:
    "A case study: building a game-idea toy out of typography, CSS, sound and one pixel duck.",
};

export default function About() {
  return (
    <>
      <main className="about">
        <HomeDuck />
        <h1 className="title">How it&apos;s made</h1>
        <p className="note">a case study, in pixels and quacks</p>

        <section>
          <h2>The idea</h2>
          <p>
            Brainstorming is more fun when it feels like a game. quackle.scrapbook turns it into
            one: you&apos;re a card hunter walking down a market street, one stall per screen. Each
            stall sells a different kind of card (a seed word, a core verb, a world, a mood, a look,
            a twist, a rule) and opens it a different way: a pack you tear by hand, a gear press, a
            folding map, a tarot spread, slot-machine reels, a shell game, a wax-sealed scroll.
          </p>
          <p>
            Bad ideas get crumpled, ripped or flicked into the bin and the duck yells{" "}
            <em>QUACK!</em>. Good ones get taped into your scrapbook with a thud and an ink stamp.
            Fill a spread, hold the forge, and the cards fuse into a polaroid of a game concept.
          </p>
        </section>

        <section>
          <h2>Three streets, one codebase</h2>
          <ul>
            <li>
              <strong>Visitor</strong>: a short street, 10 coins a day, a book of 5 spreads saved in
              your browser, share links that live entirely in the URL.
            </li>
            <li>
              <strong>Jam</strong>: rooms with a code, a countdown and a theme. Guests trade cards
              on a trading post, publish one page each to a shared album, react, and form teams
              around the top ideas.
            </li>
            <li>
              <strong>Studio</strong>: the full street with side alleys, a Back Room of the
              studio&apos;s own minted cards, a shared library with status and comments, a scope
              Ledger, and the Appraiser: Claude reading a spread and writing a pitch, three
              alternative twists and the risks.
            </li>
          </ul>
        </section>

        <section>
          <h2>Almost no illustration</h2>
          <p>
            The only drawn asset is the studio duck from our website. Everything else is typography
            (two pixel fonts and a handwriting font), CSS (notched pixel borders, dithered
            gradients, foil that follows your finger), SVG-free patterns, motion and sound. Every
            sound is synthesized live with the Web Audio API, except the duck&apos;s real quack.
          </p>
        </section>

        <section>
          <h2>Feel first</h2>
          <p>
            Every action follows anticipation → action → reaction, under 600 ms, and every timing
            lives in one file so it can be tuned. Rare cards pause half-turned before they reveal.
            There&apos;s a speed mode, reduced-motion support, haptics on phones, and every gesture
            has a button for keyboards.
          </p>
        </section>

        <section>
          <h2>Under the hood</h2>
          <ul>
            <li>
              Next.js and TypeScript, mobile-first; no animation or gesture libraries (pointer
              events + Web Animations).
            </li>
            <li>Seeded randomness, so the same seed always opens the same pack.</li>
            <li>
              Supabase with row-level security for studio and jam rules (coins, guest caps, card
              pools, trades), tested against Postgres in WebAssembly.
            </li>
            <li>
              Claude (via the Anthropic API, server-side only) for the Appraiser, with structured
              output.
            </li>
          </ul>
        </section>

        <nav className="home-links">
          <Link className="home-btn primary" href="/play">
            Walk the street →
          </Link>
          <Link className="home-btn" href="/">
            Home
          </Link>
        </nav>
      </main>
      <Footer />
    </>
  );
}
