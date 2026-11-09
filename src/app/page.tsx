import Link from "next/link";

export default function Home() {
  return (
    <main className="home">
      <h1 className="title">quackle.scrapbook</h1>
      <p className="note">quack. empty book? let&apos;s fix that.</p>
      <Link className="home-link" href="/prototype">
        try the feel prototype →
      </Link>
    </main>
  );
}
