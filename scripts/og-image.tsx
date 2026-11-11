/**
 * Source of the link-preview image (src/app/opengraph-image.png and twitter-image.png).
 * To redraw: copy this file to src/app/opengraph-image.tsx in a scratch copy, run a static export
 * (STATIC_EXPORT=1 npx next build) and copy out/opengraph-image over the two PNGs.
 */
import { ImageResponse } from "next/og";

export const alt =
  "Quackle Scrapbook by quackle.bit: a free game idea generator for jams. Open card packs, keep what sparks, get a one-page pitch.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

const INK = "#24211f";

export default function Image() {
  const grid = "rgba(255,255,255,0.12)";
  const chip = (t: string) => (
    <div
      style={{
        display: "flex",
        padding: "6px 16px",
        background: "#fff",
        color: INK,
        border: `4px solid ${INK}`,
        fontSize: 24,
        fontWeight: 700,
      }}
    >
      {t}
    </div>
  );
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
        backgroundColor: "#3d7356",
        backgroundImage: `linear-gradient(${grid} 2px, transparent 2px), linear-gradient(90deg, ${grid} 2px, transparent 2px)`,
        backgroundSize: "60px 60px, 60px 60px",
        border: "20px solid #2f5d45",
        fontFamily: "sans-serif",
      }}
    >
      {/* the book: flat, like the favicon */}
      <div
        style={{
          width: 270,
          height: 360,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e05a3a",
          border: `8px solid ${INK}`,
          boxShadow: "14px 14px 0 rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "20px 18px",
            background: "#fff",
            border: `6px solid ${INK}`,
            color: INK,
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 5 }}>QUACKLE</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 5 }}>SCRAPBOOK</div>
          <div style={{ width: 64, height: 8, background: "#f5b83d" }} />
        </div>
      </div>
      {/* what it is, what you do, what you get */}
      <div
        style={{ display: "flex", flexDirection: "column", gap: 18, color: "#fff", maxWidth: 640 }}
      >
        <div style={{ fontSize: 26, color: "#f5b83d", fontWeight: 800 }}>
          Game idea generator for jams · by quackle.bit
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.08 }}>Stuck on a game idea?</div>
        <div style={{ fontSize: 30, lineHeight: 1.3, color: "#eaf5ee" }}>
          Open card packs, keep what sparks, get a one-page pitch to share with your team.
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          {chip("Mechanics")}
          {chip("Twist")}
          {chip("Mood")}
          {chip("Look")}
        </div>
        <div style={{ fontSize: 24, color: "#dfeee4", marginTop: 6 }}>
          Free · No sign-up · quacklebit.com/scrapbook
        </div>
      </div>
    </div>,
    size,
  );
}
