"use client";

import { settings, type StationId } from "./settings";

/**
 * The desk radio: five quiet stations generated live with Web Audio (no audio files, so nothing
 * to license). Playback only starts from a tap (browsers block autoplay) and fades in and out.
 * Everything is original: simple chord loops, filtered noise and sparse notes.
 */

export const STATIONS: { id: StationId; label: string; blurb: string }[] = [
  { id: "lofi", label: "Midnight Lo-fi", blurb: "slow chords, vinyl dust" },
  { id: "rain", label: "Rainy Afternoon", blurb: "rain on the window" },
  { id: "morning", label: "Quiet Morning", blurb: "soft pads, little bells" },
  { id: "jazz", label: "Dusty Jazz", blurb: "walking bass, brushes" },
  { id: "study", label: "Late Night Study", blurb: "low hum, slow pad" },
];

type Step = (n: number, t: number) => void;
type Voice = { stepDur: number; step: Step; stop: () => void };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let voice: Voice | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextT = 0;
let stepN = 0;
let current: StationId | null = null;
let unsub: (() => void) | null = null;
const noiseCache: Partial<Record<"white" | "pink" | "brown", AudioBuffer>> = {};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function noiseBuf(c: AudioContext, kind: "white" | "pink" | "brown") {
  const hit = noiseCache[kind];
  if (hit) return hit;
  const len = c.sampleRate * 4;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === "white") d[i] = w;
    else if (kind === "pink") {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  noiseCache[kind] = buf;
  return buf;
}

function loopNoise(
  c: AudioContext,
  kind: "white" | "pink" | "brown",
  filter: BiquadFilterType,
  freq: number,
  gain: number,
  q = 0.7,
) {
  const src = c.createBufferSource();
  src.buffer = noiseBuf(c, kind);
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(master!);
  src.start();
  return () => {
    try {
      src.stop();
    } catch {
      /* already stopped */
    }
    src.disconnect();
  };
}

function tone(
  freq: number,
  t: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  attack = 0.02,
  lp = 0,
) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let out: AudioNode = o;
  if (lp) {
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = lp;
    o.connect(f);
    out = f;
  }
  out.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.1);
}

function burst(
  t: number,
  dur: number,
  filter: BiquadFilterType,
  freq: number,
  peak: number,
  q = 1,
) {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noiseBuf(c, "white");
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t, Math.random() * 2);
  src.stop(t + dur + 0.05);
}

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

// ── Stations ──────────────────────────────────────────────────
function lofi(): Voice {
  const bpm = 72;
  const beat = 60 / bpm;
  const chords = [
    [60, 64, 67, 71], // Cmaj7
    [57, 60, 64, 67], // Am7
    [62, 65, 69, 72], // Dm7
    [55, 59, 62, 65], // G7
  ];
  const stopDust = loopNoise(ctx!, "white", "highpass", 4500, 0.006);
  return {
    stepDur: beat,
    step(n, t) {
      const beatInBar = n % 4;
      const chord = chords[Math.floor(n / 4) % chords.length];
      if (beatInBar === 0) {
        chord.forEach((m, i) =>
          tone(midi(m), t + i * 0.012, beat * 3.8, "triangle", 0.045, 0.05, 1100),
        );
        tone(midi(chord[0] - 24), t, beat * 1.8, "sine", 0.12, 0.01, 300);
      }
      if (beatInBar === 0 || beatInBar === 2) {
        // soft kick
        const c = ctx!;
        const o = c.createOscillator();
        o.frequency.setValueAtTime(120, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        const g = c.createGain();
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g).connect(master!);
        o.start(t);
        o.stop(t + 0.3);
      }
      if (beatInBar === 1 || beatInBar === 3) burst(t, 0.09, "highpass", 2500, 0.04); // snare-ish
      burst(t + beat / 2, 0.03, "highpass", 7000, 0.025); // hat
      if (Math.random() < 0.35)
        tone(midi(pick(chord) + 12), t + beat * 0.75, 0.9, "sine", 0.03, 0.01, 2500);
      if (Math.random() < 0.3) burst(t + Math.random() * beat, 0.012, "bandpass", 2000, 0.08); // crackle pop
    },
    stop: stopDust,
  };
}

function rain(): Voice {
  const a = loopNoise(ctx!, "pink", "lowpass", 3200, 0.22);
  const b = loopNoise(ctx!, "white", "bandpass", 6000, 0.03, 0.4);
  const pad = [57, 60, 64, 67, 71];
  return {
    stepDur: 2.4,
    step(n, t) {
      if (n % 4 === 0) pad.forEach((m) => tone(midi(m - 12), t, 9, "sine", 0.025, 2.5, 600));
      for (let i = 0; i < 4; i++) {
        if (Math.random() < 0.6)
          tone(1800 + Math.random() * 2200, t + Math.random() * 2.4, 0.05, "sine", 0.012, 0.002);
      }
    },
    stop() {
      a();
      b();
    },
  };
}

function morning(): Voice {
  const chords = [
    [60, 64, 67, 71, 74],
    [57, 60, 64, 67, 71],
    [53, 57, 60, 64, 67],
    [55, 59, 62, 66, 69],
  ];
  const penta = [72, 74, 76, 79, 81, 84];
  return {
    stepDur: 2,
    step(n, t) {
      if (n % 4 === 0) {
        const chord = chords[Math.floor(n / 4) % chords.length];
        chord.forEach((m) => tone(midi(m - 12), t, 8.5, "triangle", 0.03, 2.2, 900));
      }
      if (Math.random() < 0.55)
        tone(midi(pick(penta)), t + Math.random() * 1.5, 3.2, "sine", 0.05, 0.01, 4000);
    },
    stop() {},
  };
}

function jazz(): Voice {
  const bpm = 104;
  const beat = 60 / bpm;
  const prog = [
    { root: 50, chord: [60, 65, 69, 72] }, // Dm7
    { root: 43, chord: [59, 65, 67, 71] }, // G7
    { root: 48, chord: [59, 64, 67, 71] }, // Cmaj7
    { root: 45, chord: [61, 64, 67, 70] }, // A7
  ];
  const dust = loopNoise(ctx!, "white", "highpass", 5000, 0.005);
  return {
    stepDur: beat,
    step(n, t) {
      const bar = Math.floor(n / 4) % prog.length;
      const { root, chord } = prog[bar];
      const b = n % 4;
      const walk = [root, root + 2, root + 4, root + 7][b] ?? root;
      tone(midi(walk), t, beat * 0.9, "sine", 0.15, 0.01, 500);
      if (b === 1 || b === 3) burst(t, 0.14, "bandpass", 5200, 0.05, 1.2); // brush
      if (b === 1)
        chord.forEach((m) => tone(midi(m), t, beat * 1.4, "triangle", 0.035, 0.02, 1500));
      if (b === 2 && Math.random() < 0.6)
        chord.forEach((m) =>
          tone(midi(m), t + beat * 0.66, beat * 0.5, "triangle", 0.025, 0.02, 1500),
        );
    },
    stop: dust,
  };
}

function study(): Voice {
  const a = loopNoise(ctx!, "brown", "lowpass", 420, 0.35);
  return {
    stepDur: 4,
    step(n, t) {
      if (n % 2 === 0) [45, 52, 57, 60].forEach((m) => tone(midi(m), t, 9, "sine", 0.03, 3, 500));
    },
    stop: a,
  };
}

const BUILD: Record<StationId, () => Voice> = { lofi, rain, morning, jazz, study };

// ── Engine ────────────────────────────────────────────────────
function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function level() {
  const s = settings.get();
  return s.muted || !s.musicOn ? 0 : s.musicVolume * 0.5;
}

function applyLevel(fade = 0.4) {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(level(), t + fade);
}

function startVoice(id: StationId) {
  stopVoice();
  voice = BUILD[id]();
  current = id;
  stepN = 0;
  nextT = ctx!.currentTime + 0.15;
  timer = setInterval(() => {
    if (!ctx || !voice) return;
    while (nextT < ctx.currentTime + 1.2) {
      voice.step(stepN, nextT);
      nextT += voice.stepDur;
      stepN += 1;
    }
  }, 250);
}

function stopVoice() {
  if (timer) clearInterval(timer);
  timer = null;
  voice?.stop();
  voice = null;
  current = null;
}

export const radio = {
  /** Start (or switch) playback. Must be called from a user gesture the first time. */
  play(station?: StationId) {
    const c = ensureCtx();
    if (!c) return;
    const id = station ?? settings.get().station;
    settings.set({ musicOn: true, station: id });
    if (!unsub) unsub = settings.subscribe(() => applyLevel(0.2));
    if (current !== id) startVoice(id);
    applyLevel(1.5);
  },
  pause() {
    settings.set({ musicOn: false });
    applyLevel(1.2);
    setTimeout(() => {
      if (!settings.get().musicOn) stopVoice();
    }, 1400);
  },
  toggle() {
    if (settings.get().musicOn) radio.pause();
    else radio.play();
  },
  setStation(id: StationId) {
    settings.set({ station: id });
    if (settings.get().musicOn) radio.play(id);
  },
  setVolume(v: number) {
    settings.set({ musicVolume: Math.min(1, Math.max(0, v)) });
  },
};
