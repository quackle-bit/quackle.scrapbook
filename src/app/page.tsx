import Link from "next/link";
import { Footer } from "@/components/Footer";
import { HomeDuck } from "@/components/HomeDuck";

export default function Home() {
  return (
    <>
      <main className="home">
        <HomeDuck />
        <h1 className="title">quackle.scrapbook</h1>
        <p className="note">quack. empty book? let&apos;s fix that.</p>
        <nav className="home-links">
          <Link className="home-btn primary" href="/play">
            Walk the street →
          </Link>
          <Link className="home-btn" href="/book">
            Open my book
          </Link>
        </nav>
        <p className="home-sub">
          Open card packs · QUACK bad ideas · tape good ones into your book · forge a game concept
        </p>
        <p className="home-small">
          <Link href="/play?mode=jam">jam street (preview)</Link> ·{" "}
          <Link href="/play?mode=studio">studio street (preview)</Link> ·{" "}
          <Link href="/prototype">feel lab</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
