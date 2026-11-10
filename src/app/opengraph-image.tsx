import { ImageResponse } from "next/og";

/** The link preview (Discord, X, Slack, LINE): the scrapbook on the cutting mat, branded quackle.bit. */
export const alt =
  "Quackle Scrapbook by quackle.bit: open packs, keep what sparks, pitch your game.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#24211f";

export default function Image() {
  const grid = "rgba(255,255,255,0.12)";
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 64,
        backgroundColor: "#3d7356",
        backgroundImage: `linear-gradient(${grid} 2px, transparent 2px), linear-gradient(90deg, ${grid} 2px, transparent 2px)`,
        backgroundSize: "60px 60px, 60px 60px",
        border: `20px solid #2f5d45`,
        fontFamily: "sans-serif",
      }}
    >
      {/* the book */}
      <div
        style={{
          width: 300,
          height: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e05a3a",
          border: `6px solid ${INK}`,
          borderLeft: `40px solid #b8432a`,
          boxShadow: `16px 16px 0 rgba(0,0,0,0.45)`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: "24px 20px",
            background: "#fff",
            border: `6px solid ${INK}`,
            color: INK,
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 6 }}>QUACKLE</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 6 }}>SCRAPBOOK</div>
          <div style={{ width: 70, height: 8, background: "#f5b83d" }} />
        </div>
      </div>
      {/* the words */}
      <div
        style={{ display: "flex", flexDirection: "column", gap: 18, color: "#fff", maxWidth: 560 }}
      >
        <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.1 }}>
          Open a pack. Keep what sparks. Pitch your game.
        </div>
        <div style={{ fontSize: 30, color: "#f5b83d", fontWeight: 700 }}>by quackle.bit</div>
        <div style={{ fontSize: 26, color: "#dfeee4" }}>quacklebit.com/scrapbook</div>
      </div>
    </div>,
    size,
  );
}
