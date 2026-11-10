import Link from "next/link";
import { DeskRoot } from "@/components/ui/DeskRoot";

export default function NotFound() {
  return (
    <DeskRoot className="dk-summary">
      <main
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeContent: "center",
          gap: 16,
          textAlign: "center",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 44 }}>This page slipped off the desk</h1>
        <p style={{ color: "var(--amber-soft)" }}>
          It isn&apos;t here. Let&apos;s get you back to the scrapbook.
        </p>
        <div>
          <Link className="dk-btn primary" href="/">
            Back to the desk
          </Link>
        </div>
      </main>
    </DeskRoot>
  );
}
