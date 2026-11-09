"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { feel } from "@/feel";
import { drawCards, themeCard, type CardData, type SlotId } from "@/lib/deck";
import { shake } from "@/lib/motion";
import { createRng } from "@/lib/rng";
import {
  ALLEYS,
  pickSpark,
  ROUTES,
  routeSlots,
  STOPS,
  weatherFor,
  type AlleyId,
  type Mode,
  type StopId,
} from "@/lib/route";
import { settings, useSettings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { Duck, say, sayRandom } from "../Duck";
import type { TrashHow } from "../HandCard";
import { PackStation } from "../PackStation";
import { ShellGame } from "../ShellGame";
import { TailorReels } from "../TailorReels";
import type { Concept, SparkNote } from "../book/SpreadView";
import { EchoWell, MysteryCrate } from "./Alleys";
import { FoldedMap } from "./FoldedMap";
import { ForgeStop } from "./ForgeStop";
import { COVER_COLORS, Gate, type GateResult } from "./Gate";
import { GearPress } from "./GearPress";
import { NightMarket } from "./NightMarket";
import { Receipt, type RunStats } from "./Receipt";
import { BookOverlay, BookPeek, RouteBar, SparkCard } from "./RouteParts";
import { Scrolls } from "./Scrolls";
import { Tarot } from "./Tarot";

/** A finished run, handed to whoever hosts the route (Phase 2 saves it into the book). */
export type FinishedSpread = {
  gate: GateResult;
  slots: SlotId[];
  cards: Partial<Record<SlotId, CardData>>;
  concept: Concept | null;
  notes: SparkNote[];
  discard: CardData[];
  stats: RunStats;
};

type View =
  | { kind: "stop"; index: number }
  | { kind: "alley"; id: AlleyId; back: number }
  | { kind: "receipt" };

const rand = () => Math.random();

export function Route({
  modes = ["visitor", "jam", "studio"],
  initialGate,
  coins: coinsOverride,
  onSpendCoin,
  onFinish,
  finishActions,
}: {
  modes?: Mode[];
  initialGate?: Partial<GateResult>;
  /** Host-managed coins (Phase 2 daily purse). Falls back to the route's own budget. */
  coins?: number;
  onSpendCoin?: () => boolean;
  onFinish?: (s: FinishedSpread) => void;
  finishActions?: (s: FinishedSpread, restart: () => void) => React.ReactNode;
}) {
  const { muted, speed } = useSettings();
  const [gate, setGate] = useState<GateResult>({
    title: "My Idea Book",
    color: COVER_COLORS[0],
    mode: modes[0],
    theme: "",
    antiGoal: "",
    ...initialGate,
  });
  const route = ROUTES[gate.mode];
  const stops = route.stops;
  const slots = routeSlots(route);

  const [view, setView] = useState<View>({ kind: "stop", index: 0 });
  const [furthest, setFurthest] = useState(0);
  const [phase, setPhase] = useState<"play" | "spark">("play");
  const [lit, setLit] = useState<StopId[]>([]);
  const [skipped, setSkipped] = useState<StopId[]>([]);
  const [cards, setCards] = useState<Partial<Record<SlotId, CardData>>>({});
  const [discard, setDiscard] = useState<CardData[]>([]);
  const [notes, setNotes] = useState<SparkNote[]>([]);
  const [spark, setSpark] = useState({ q: "", a: "" });
  const [concept, setConcept] = useState<Concept | null>(null);
  const [ownCoins, setOwnCoins] = useState<number>(route.coins ?? Infinity);
  const [stats, setStats] = useState<RunStats>({
    packs: 0,
    cards: 0,
    kept: 0,
    trashed: 0,
    sparks: 0,
  });
  const [draggingSlot, setDraggingSlot] = useState<SlotId | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [justStamped, setJustStamped] = useState<string | null>(null);
  const [timer, setTimer] = useState<number | null>(null);
  const gateSpark = STOPS.gate.sparks[0];
  const rootRef = useRef<HTMLDivElement>(null);
  const binRef = useRef<HTMLDivElement>(null);

  const unlimited = route.coins === null;
  const coins = unlimited ? Infinity : (coinsOverride ?? ownCoins);
  const stopId: StopId | null = view.kind === "stop" ? stops[view.index] : null;
  const stop = stopId ? STOPS[stopId] : null;
  const currentSlot: SlotId | undefined =
    view.kind === "alley" ? (view.id === "crate" ? "free" : undefined) : stop?.slot;
  const context = Object.values(cards).flatMap((c) => c?.tags ?? []);
  const weather = weatherFor(cards.mood?.tags);

  // Jam: a countdown per stop.
  useEffect(() => {
    if (!route.timer || view.kind !== "stop" || stopId === "gate" || phase !== "play") {
      setTimer(null);
      return;
    }
    setTimer(route.timer);
    const t = setInterval(() => {
      setTimer((s) => {
        if (s === null) return s;
        if (s === 1) say("Time! Stamp something and move on.", { tag: "stunned", ms: 900 });
        return Math.max(0, s - 1);
      });
    }, 1000);
    return () => clearInterval(t);
  }, [route.timer, view, stopId, phase]);

  const spend = useCallback(() => {
    if (unlimited) {
      setStats((s) => ({ ...s, packs: s.packs + 1 }));
      return true;
    }
    if (onSpendCoin) {
      const ok = onSpendCoin();
      if (ok) setStats((s) => ({ ...s, packs: s.packs + 1 }));
      else say("Out of coins! The bazaar refills at midnight.", { tag: "fall", ms: 800 });
      return ok;
    }
    if (ownCoins <= 0) {
      say("Out of coins! Finish with what you have.", { tag: "fall", ms: 800 });
      return false;
    }
    setOwnCoins((c) => c - 1);
    setStats((s) => ({ ...s, packs: s.packs + 1 }));
    return true;
  }, [unlimited, onSpendCoin, ownCoins]);

  function lightLamp(id: StopId) {
    setLit((l) => (l.includes(id) ? l : [...l, id]));
    setSkipped((s) => s.filter((x) => x !== id));
    sfx.tink();
  }

  function askSpark(id: StopId) {
    const asked = notes.map((n) => n.q);
    setSpark({ q: pickSpark(id, asked, rand), a: "" });
    setPhase("spark");
  }

  function stamp(card: CardData): boolean {
    const target = currentSlot;
    if (!target) return false;
    if (target !== "free" && card.slot !== target) {
      say("That card doesn't fit this slot.");
      return false;
    }
    if (cards[target]) {
      say("Already stamped. Peel it off first.");
      return false;
    }
    setCards((c) => ({ ...c, [target]: card }));
    setJustStamped(card.id);
    setStats((s) => ({ ...s, kept: s.kept + 1, cards: s.cards + 1 }));
    if (target === "mood")
      setTimeout(() => say("The weather's turning…", { tag: "idle", ms: 500 }), 900);
    setTimeout(() => {
      void shake(rootRef.current, feel.shakePx, feel.shake);
      sayRandom("stamp");
    }, feel.stampSnap);
    // Light the lamp, then the spark question.
    setTimeout(
      () => {
        if (view.kind === "stop" && stopId) {
          lightLamp(stopId);
          askSpark(stopId);
        } else if (view.kind === "alley") {
          sfx.tink();
          setPhase("spark");
          setSpark({ q: "Why did the crate pick this for you?", a: "" });
        }
      },
      settings.get().speed ? 0 : 900,
    );
    return true;
  }

  function trash(card: CardData, how: TrashHow) {
    setDiscard((d) => [card, ...d]);
    setStats((s) => ({ ...s, trashed: s.trashed + 1, cards: s.cards + 1 }));
    sfx.quack();
    sayRandom("trash");
    if (how === "rip")
      say("Ripped to bits. QUACK!", { tag: "eat", ms: 400, then: { tag: "burp", ms: 300 } });
  }

  function peel() {
    if (!currentSlot) return;
    const card = cards[currentSlot];
    if (!card) return;
    sfx.peel();
    setCards((c) => {
      const n = { ...c };
      delete n[currentSlot];
      return n;
    });
    setDiscard((d) => [card, ...d]);
    setPhase("play");
    say("Peeled. It's in the discard pile.");
  }

  function goTo(index: number) {
    setView({ kind: "stop", index });
    setFurthest((f) => Math.max(f, index));
    setPhase("play");
    setBookOpen(false);
  }

  function saveSpark() {
    if (!spark.q) return;
    setNotes((n) => [
      ...n.filter((x) => x.q !== spark.q),
      { stop: stopId ?? "alley", q: spark.q, a: spark.a },
    ]);
    if (spark.a.trim()) setStats((s) => ({ ...s, sparks: s.sparks + 1 }));
  }

  function next() {
    saveSpark();
    if (view.kind === "alley") return goTo(view.back + 1);
    if (view.kind !== "stop") return;
    const i = view.index;
    // Revisiting an earlier stop: come straight back to where you were.
    const target = i < furthest ? furthest : i + 1;
    if (target >= stops.length) return finish();
    goTo(target);
  }

  function skip() {
    if (view.kind === "alley") return goTo(view.back + 1);
    if (!stopId) return;
    setSkipped((s) => (s.includes(stopId) ? s : [...s, stopId]));
    say("Skipped. The slot stays a “?”.");
    next();
  }

  function snapshot(): FinishedSpread {
    return { gate, slots, cards, concept, notes, discard, stats };
  }

  function finish() {
    // Light every lamp in a wave.
    stops.forEach((s, i) =>
      setTimeout(() => setLit((l) => (l.includes(s) ? l : [...l, s])), i * 80),
    );
    sfx.fanfare();
    setView({ kind: "receipt" });
    setPhase("play");
    onFinish?.(snapshot());
  }

  function restart(keepGate = true) {
    setCards({});
    setDiscard([]);
    setNotes([]);
    setConcept(null);
    setLit(keepGate ? ["gate"] : []);
    setSkipped([]);
    setStats({ packs: 0, cards: 0, kept: 0, trashed: 0, sparks: 0 });
    setOwnCoins(route.coins ?? Infinity);
    setFurthest(keepGate ? 1 : 0);
    setView({ kind: "stop", index: keepGate ? 1 : 0 });
    setPhase("play");
  }

  function enterGate(g: GateResult) {
    setGate(g);
    const r = ROUTES[g.mode];
    setOwnCoins(r.coins ?? Infinity);
    setLit(["gate"]);
    setNotes(g.antiGoal.trim() ? [{ stop: "gate", q: gateSpark, a: g.antiGoal }] : []);
    goTo(1);
    say(g.mode === "jam" && g.theme ? `Today's theme: ${g.theme}. Go!` : "Welcome to the street!", {
      tag: "walk",
      ms: 800,
    });
  }

  // Keeper greeting: personalised once a seed is stamped.
  const keeperLine =
    stop &&
    cards.seed &&
    stopId !== "word" &&
    stopId !== "theme" &&
    view.kind === "stop" &&
    view.index % 2 === 1
      ? `Ah, ${/^[aeiou]/i.test(cards.seed.text) ? "an" : "a"} ${cards.seed.text.split(" ")[0]} person. I have just the thing.`
      : stop?.keeper;

  const stopProps = {
    coins,
    spend,
    context,
    onStamp: (c: CardData) => stamp(c),
    onTrash: trash,
    onDragSlot: setDraggingSlot,
  };

  function renderStop() {
    if (view.kind === "receipt") {
      const snap = snapshot();
      return (
        <Receipt
          bookTitle={gate.title}
          routeLabel={route.label}
          stats={stats}
          concept={concept}
          actions={
            finishActions ? (
              finishActions(snap, () => restart(true))
            ) : (
              <>
                <button type="button" className="big-btn" onClick={() => restart(true)}>
                  New spread →
                </button>
                <button type="button" className="link-btn" onClick={() => restart(false)}>
                  back to the gate
                </button>
              </>
            )
          }
        />
      );
    }
    if (view.kind === "alley") {
      return view.id === "crate" ? <MysteryCrate {...stopProps} /> : <EchoWell context={context} />;
    }
    switch (stopId) {
      case "gate":
        return <Gate initial={gate} spark={gateSpark} modes={modes} onEnter={enterGate} />;
      case "word":
        return (
          <PackStation
            key="word"
            {...stopProps}
            bare
            pulls
            firstFree
            packLabel="WORD PACK"
            draw={(seed, pull) => drawCards(createRng(seed), "seed", 5, context, pull)}
          />
        );
      case "theme":
        return (
          <PackStation
            key="theme"
            {...stopProps}
            bare
            pulls
            firstFree
            packLabel="THEME PACK"
            draw={(seed, pull) => {
              const rng = createRng(seed);
              return [themeCard(rng, gate.theme), ...drawCards(rng, "seed", 4, context, pull)];
            }}
          />
        );
      case "gear":
        return <GearPress {...stopProps} />;
      case "map":
        return <FoldedMap {...stopProps} />;
      case "fortune":
        return <Tarot {...stopProps} />;
      case "tailor":
        return <TailorReels {...stopProps} bare />;
      case "trickster":
        return <ShellGame {...stopProps} bare />;
      case "rule":
        return <Scrolls {...stopProps} />;
      case "forge":
        return (
          <ForgeStop
            slots={slots}
            cards={cards}
            existing={concept}
            onForged={(c) => {
              setConcept(c);
              lightLamp("forge");
              askSpark("forge");
            }}
          />
        );
      case "night":
        return (
          <NightMarket
            slots={slots}
            cards={cards}
            discard={discard}
            concept={concept}
            notes={notes}
            onSwap={(slot, card) => {
              const old = cards[slot];
              setCards((c) => ({ ...c, [slot]: card }));
              setDiscard((d) => [...(old ? [old] : []), ...d.filter((x) => x.id !== card.id)]);
              if (concept) say("Changed! Re-forge later if you like.");
            }}
            onClose={() => {
              lightLamp("night");
              askSpark("night");
            }}
          />
        );
      default:
        return null;
    }
  }

  const alleyHere = view.kind === "stop" && stopId ? route.alleys?.[stopId] : undefined;
  const sign =
    view.kind === "alley"
      ? { name: ALLEYS[view.id].name, keeper: ALLEYS[view.id].keeper, color: "#7a6a4f" }
      : view.kind === "receipt"
        ? {
            name: "THE END OF THE STREET",
            keeper: "All lamps lit. Good hunting.",
            color: "#e8a33c",
          }
        : { name: stop!.name, keeper: keeperLine ?? "", color: stop!.color };
  const showPeek = view.kind !== "receipt" && stopId !== "gate";
  const filled = slots.filter((s) => cards[s]).length;
  const isLast =
    view.kind === "stop" && (view.index >= stops.length - 1 || (view.index < furthest && false));
  const nextLabel =
    view.kind === "alley"
      ? "Back to the street →"
      : view.kind === "stop" && view.index < furthest
        ? "Walk back →"
        : isLast
          ? "Finish →"
          : `Next: ${STOPS[stops[(view as { index: number }).index + 1]]?.name.replace("THE ", "").toLowerCase() ?? "end"} →`;

  return (
    <div
      ref={rootRef}
      className={`proto route weather-${weather}`}
      style={{ ["--cover" as string]: gate.color }}
    >
      <header className="topbar">
        <span className="purse" aria-label={unlimited ? "Unlimited coins" : `${coins} coins`}>
          <span className="coin" aria-hidden>
            ¢
          </span>
          {unlimited ? "∞" : coins}
        </span>
        <span className="counts">
          {gate.title} · {stats.kept} kept · {stats.trashed} quacked
        </span>
        <span className="toggles">
          <button
            type="button"
            aria-pressed={muted}
            aria-label="Mute"
            onClick={() => settings.set({ muted: !muted })}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            type="button"
            aria-pressed={speed}
            aria-label="Speed mode"
            onClick={() => settings.set({ speed: !speed })}
          >
            {speed ? "⚡ fast" : "⚡ off"}
          </button>
        </span>
      </header>

      <RouteBar
        stops={stops}
        index={
          view.kind === "stop" ? view.index : view.kind === "alley" ? view.back : stops.length - 1
        }
        lit={lit}
        skipped={skipped}
        canSkip={
          view.kind === "alley" ||
          (view.kind === "stop" && !["gate", "forge"].includes(stopId!) && phase === "play")
        }
        onGo={(i) => i <= furthest && goTo(i)}
        onSkip={skip}
        timer={timer}
      />

      <main className="stage route-stage">
        <div className="stall-head">
          <div className="stall-sign" style={{ ["--awning" as string]: sign.color }}>
            {sign.name}
          </div>
          <p className="keeper">“{sign.keeper}”</p>
          {gate.mode === "jam" && gate.theme && view.kind === "stop" && (
            <span className="theme-tag">theme: {gate.theme}</span>
          )}
        </div>
        <div className="stop-body" key={view.kind === "stop" ? `s${view.index}` : view.kind}>
          {phase === "spark" ? (
            <SparkCard
              question={spark.q}
              answer={spark.a}
              onAnswer={(a) => setSpark((s) => ({ ...s, a }))}
              onNext={next}
              nextLabel={nextLabel}
              detour={
                alleyHere
                  ? {
                      label: `Detour: ${ALLEYS[alleyHere].sign}`,
                      onGo: () => {
                        saveSpark();
                        setView({
                          kind: "alley",
                          id: alleyHere,
                          back: (view as { index: number }).index,
                        });
                        setPhase("play");
                      },
                    }
                  : undefined
              }
            />
          ) : (
            renderStop()
          )}
        </div>
        {view.kind === "alley" && phase === "play" && (
          <button
            type="button"
            className="link-btn back-street"
            onClick={() => goTo(view.back + 1)}
          >
            ← back to the street
          </button>
        )}
        {showPeek && (
          <div
            ref={binRef}
            className="bin"
            data-drop="bin"
            aria-label={`Bin, ${discard.length} cards`}
          >
            <span>BIN</span>
            <small>{discard.length}</small>
          </div>
        )}
        <Duck />
      </main>

      {showPeek && (
        <BookPeek
          slot={currentSlot}
          card={currentSlot ? cards[currentSlot] : undefined}
          want={!!currentSlot && draggingSlot !== null}
          filled={filled}
          total={slots.length}
          onPeel={peel}
          onOpenBook={() => setBookOpen(true)}
          justStamped={justStamped}
        />
      )}

      {bookOpen && (
        <BookOverlay
          title={gate.title}
          color={gate.color}
          antiGoal={gate.antiGoal}
          slots={slots}
          cards={cards}
          concept={concept}
          notes={notes}
          onClose={() => setBookOpen(false)}
        />
      )}
    </div>
  );
}
