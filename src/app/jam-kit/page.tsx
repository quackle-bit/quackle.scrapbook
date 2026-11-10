import type { Metadata } from "next";
import { DuckSprite } from "@/components/Duck";
import { PrintButton } from "@/components/ui/PrintButton";
import { QrCode } from "@/components/ui/QrCode";
import { PUBLIC_URL, PUBLIC_URL_LABEL } from "@/lib/site";
import { STUDIO } from "@/lib/studio";

export const metadata: Metadata = {
  title: "Jam kit · Quackle Scrapbook",
  description: "A one-page poster for game jam organisers: point stuck teams at Quackle Scrapbook.",
};

/** A printable one-page poster for jam organisers (A4 / Letter, also fine on a projector). */
export default function JamKit() {
  return (
    <main className="jk">
      <div className="jk-sheet">
        <p className="jk-kicker">For your game jam</p>
        <h1>Stuck on ideas?</h1>
        <p className="jk-lead">Open a pack. Keep what sparks. Pitch your game in ten minutes.</p>
        <ol className="jk-steps">
          <li>Go to {PUBLIC_URL_LABEL} or scan the code.</li>
          <li>Open packs for mechanics, a twist, mood and look. Keep what sparks.</li>
          <li>Stamp it into a pitch and share the image with your team.</li>
        </ol>
        <div className="jk-qr">
          <QrCode text={PUBLIC_URL} size={240} />
          <strong>{PUBLIC_URL_LABEL}</strong>
        </div>
        <footer className="jk-foot">
          <DuckSprite act={null} scale={3} />
          <span>
            Free, no sign-up. Made by <strong>{STUDIO.name}</strong>. Share what you make with{" "}
            <strong>{STUDIO.hashtag}</strong>.
          </span>
        </footer>
      </div>
      <PrintButton />
    </main>
  );
}
