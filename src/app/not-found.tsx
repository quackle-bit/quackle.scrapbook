import Link from "next/link";
import { HomeDuck } from "@/components/HomeDuck";

export default function NotFound() {
  return (
    <main className="home">
      <HomeDuck />
      <h1 className="title">404</h1>
      <p className="note">this page got QUACKED.</p>
      <nav className="home-links">
        <Link className="home-btn primary" href="/">
          Back to the start
        </Link>
      </nav>
    </main>
  );
}
