"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getJam } from "@/lib/jam/useJam";
import { DuckSprite } from "../Duck";

/** /jam: join a room with a code + nickname, or (studio members) open a new one. */
export function JamLobby() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [nick, setNick] = useState("");
  const [theme, setTheme] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [cap, setCap] = useState(30);
  const [coins, setCoins] = useState(6);
  const [canHost, setCanHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const jam = getJam();

  useEffect(() => {
    void jam.canHost().then(setCanHost, () => setCanHost(false));
  }, [jam]);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="proto jam-app">
      <header className="topbar">
        <Link href="/" className="home-mini" aria-label="Home">
          <DuckSprite act={null} scale={1} />
        </Link>
        <span className="counts">Jam rooms{jam.kind === "local" ? " · local preview" : ""}</span>
      </header>
      <main className="jam-main">
        <form
          className="panel jam-form"
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              const { room } = await jam.join(code, nick);
              router.push(`/jam/room?code=${room.code}`);
            });
          }}
        >
          <h2 className="page-title">Join a jam</h2>
          <label className="field">
            <span>Room code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCDE"
              maxLength={8}
              required
              autoCapitalize="characters"
              className="code-input"
            />
          </label>
          <label className="field">
            <span>Nickname</span>
            <input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={24} required />
          </label>
          <button type="submit" className="big-btn" disabled={busy}>
            Enter the bazaar →
          </button>
          <p className="hint">No account needed: you join as a guest with a nickname.</p>
        </form>

        {canHost && (
          <form
            className="panel jam-form"
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                const room = await jam.createRoom({
                  theme,
                  minutes,
                  guestCap: cap,
                  startCoins: coins,
                });
                router.push(`/jam/room?code=${room.code}`);
              });
            }}
          >
            <h2 className="page-title">Open a Jam Bazaar</h2>
            <label className="field">
              <span>Theme</span>
              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="roots"
                maxLength={60}
                required
              />
            </label>
            <div className="row">
              <label className="field">
                <span>Market open (minutes)</span>
                <input
                  type="number"
                  min={1}
                  max={10080}
                  value={minutes}
                  onChange={(e) => setMinutes(+e.target.value)}
                />
              </label>
              <label className="field">
                <span>Guest cap</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={cap}
                  onChange={(e) => setCap(+e.target.value)}
                />
              </label>
              <label className="field">
                <span>Starting coins</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={coins}
                  onChange={(e) => setCoins(+e.target.value)}
                />
              </label>
            </div>
            <button type="submit" className="big-btn" disabled={busy}>
              Open the market
            </button>
            {jam.kind === "local" && (
              <p className="hint">
                Local preview: rooms live in this browser. Open the room in another tab to play as a
                second guest.
              </p>
            )}
          </form>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
