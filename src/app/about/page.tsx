import type { Metadata } from "next";
import { PUBLIC_URL, PUBLIC_URL_LABEL } from "@/lib/site";
import Link from "next/link";
import { GAMES, STUDIO } from "@/lib/studio";
import { DeskRoot } from "@/components/ui/DeskRoot";

export const metadata: Metadata = {
  title: "About · Quackle Scrapbook",
  description: "A cozy desk for game ideas by quackle.bit. Less thinking. More tinkering.",
};

export default function About() {
  return (
    <DeskRoot className="dk-summary">
      <main className="dk-summary-main">
        <article className="dk-spread dk-about">
          <header className="dk-sp-head">
            <p className="dk-eyebrow">About</p>
            <h1>Less thinking. More tinkering.</h1>
          </header>
          <div className="dk-about-body">
            <section>
              <h2>What it is</h2>
              <p>
                Quackle Scrapbook is a little creative desk where game ideas come together. You
                don&apos;t need an idea when you arrive. Open a pack, find something interesting,
                keep it, and stamp it into your scrapbook. Page by page, it becomes a game concept
                you can pitch to your team.
              </p>
            </section>
            <section>
              <h2>How it works</h2>
              <ul>
                <li>
                  <strong>Setup:</strong> the jam theme, platform, time and team. Plain controls,
                  nothing fancy.
                </li>
                <li>
                  <strong>Identity:</strong> a title, a tagline and a high concept. Type your own or
                  get a nudge.
                </li>
                <li>
                  <strong>Playground:</strong> genre, mechanics, the core loop, the objective and a
                  unique hook, discovered through packs.
                </li>
                <li>
                  <strong>Atmosphere:</strong> a moodboard of feeling, setting, look and sound.
                </li>
                <li>
                  <strong>Production:</strong> a rough scope and the smallest playable version.
                </li>
                <li>
                  <strong>Pitch:</strong> everything you collected, as one scrapbook spread. Make
                  several concepts, export, share.
                </li>
              </ul>
              <p>
                Everything is optional and reversible. Skip what you like, come back to anything,
                change your mind.
              </p>
            </section>
            <section>
              <h2>Your data</h2>
              <p>
                Scrapbooks are saved in this browser only. A share link carries the whole pitch
                inside the link itself, so nothing is uploaded. Randomness only suggests: nothing is
                ever filled in for you.
              </p>
            </section>
            <section>
              <h2>Made by {STUDIO.name}</h2>
              <p>
                <a href={STUDIO.url} rel="noopener">
                  {STUDIO.name}
                </a>{" "}
                is {STUDIO.line.charAt(0).toLowerCase() + STUDIO.line.slice(1)} Quackle Scrapbook is
                the tool we use to find our own ideas, and it lives at{" "}
                <a href={PUBLIC_URL} rel="noopener">
                  {PUBLIC_URL_LABEL}
                </a>
                . The music on the radio is generated live in your browser.
              </p>
            </section>
            <section>
              <h2>Our games</h2>
              <ul className="ab-games">
                {GAMES.map((g) => (
                  <li key={g.title}>
                    <a href={g.href} target="_blank" rel="noopener">
                      <strong>{g.title}</strong> <small>{g.year}</small>
                    </a>
                    <span>{g.line}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2>Say hi</h2>
              <p>
                Follow us for new card packs, jam invites and what we&apos;re making:{" "}
                <a href={STUDIO.connect} target="_blank" rel="noopener">
                  quacklebit.com/social
                </a>
                . Made a game from a pitch? Tag it <strong>{STUDIO.hashtag}</strong> so we can find
                it and cheer you on. Running a jam? <Link href="/jam-kit">Print the jam kit</Link>.
              </p>
            </section>
          </div>
        </article>
        <div className="dk-sp-actions">
          <Link className="dk-btn primary" href="/">
            Back to the desk
          </Link>
        </div>
      </main>
    </DeskRoot>
  );
}
