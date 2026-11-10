"use client";

import { BASE_PATH } from "./site";
import { feel } from "@/feel";
import { settings } from "./settings";

/**
 * Tiny synthesized sound kit (WebAudio, no files). Each sound is a few oscillators or a noise
 * burst, pitch-jittered ±feel.pitchJitter. Swap for recorded samples later if wanted.
 */

let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || settings.get().muted) return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    loadQuack(ctx);
  }
  // Phones start the context suspended until a user gesture; every sound is triggered by one.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  return src;
}

let quackBuf: AudioBuffer | null = null;
let quackLoading = false;
function loadQuack(c: AudioContext) {
  if (quackLoading) return;
  quackLoading = true;
  fetch(`${BASE_PATH}/duck/quack.mp3`)
    .then((r) => r.arrayBuffer())
    .then((b) => c.decodeAudioData(b))
    .then((buf) => {
      quackBuf = buf;
    })
    .catch(() => {
      /* keep the synth quack */
    });
}

const jitter = () => 1 + (Math.random() * 2 - 1) * feel.pitchJitter;

function env(c: AudioContext, at: number, peak: number, attack: number, decay: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak * feel.volume, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  g.connect(c.destination);
  return g;
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, peak = 0.6, delay = 0) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + delay;
  const j = jitter();
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0 * j, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * j), t + dur);
  o.connect(env(c, t, peak, 0.005, dur));
  o.start(t);
  o.stop(t + dur + 0.05);
}

function hiss(
  filter: BiquadFilterType,
  f0: number,
  f1: number,
  dur: number,
  peak = 0.5,
  delay = 0,
  q = 1,
) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + delay;
  const src = noise(c);
  const bq = c.createBiquadFilter();
  bq.type = filter;
  bq.Q.value = q;
  bq.frequency.setValueAtTime(f0 * jitter(), t);
  bq.frequency.exponentialRampToValueAtTime(f1, t + dur);
  src.connect(bq).connect(env(c, t, peak, 0.004, dur));
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

export const sfx = {
  clink() {
    tone("triangle", 2400, 2300, 0.12, 0.4);
    tone("triangle", 3200, 3100, 0.1, 0.25, 0.04);
  },
  slide: () => hiss("bandpass", 600, 300, 0.25, 0.25),
  /** A short rip grain; call repeatedly while tearing with rising `pitch` (1 → 2). */
  rip: (pitch = 1) => hiss("bandpass", 1200 * pitch, 2400 * pitch, 0.06, 0.5, 0, 2),
  tearOff: () => hiss("highpass", 3000, 1500, 0.18, 0.6),
  riffle() {
    for (let i = 0; i < 5; i++) hiss("bandpass", 2500, 1800, 0.03, 0.35, i * 0.045, 3);
  },
  thup: () => tone("sine", 240, 120, 0.1, 0.6),
  drumroll() {
    for (let i = 0; i < 6; i++) hiss("lowpass", 400, 200, 0.04, 0.4, i * 0.05);
  },
  sparkle() {
    [1320, 1760, 2093].forEach((f, i) => tone("sine", f, f, 0.15, 0.25, i * 0.06));
  },
  thud() {
    tone("sine", 140, 50, 0.22, 0.9);
    hiss("lowpass", 800, 200, 0.08, 0.6);
  },
  crumple() {
    for (let i = 0; i < 7; i++)
      hiss("bandpass", 1500 + Math.random() * 3000, 900, 0.025, 0.45, i * 0.03, 4);
  },
  whoosh: () => hiss("bandpass", 400, 2400, 0.28, 0.4, 0, 1.5),
  bin: () => tone("square", 180, 120, 0.12, 0.25),
  quack() {
    const c = audio();
    if (!c) return;
    // The studio duck's recorded quack (same file as the website), sped up 1.2–1.65× like there.
    if (quackBuf) {
      const s = c.createBufferSource();
      s.buffer = quackBuf;
      s.playbackRate.value = 1.2 + Math.random() * 0.45;
      const g = c.createGain();
      g.gain.value = feel.volume * 2;
      s.connect(g).connect(c.destination);
      s.start();
      return;
    }
    loadQuack(c);
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = "sawtooth";
    const j = jitter();
    o.frequency.setValueAtTime(520 * j, t);
    o.frequency.exponentialRampToValueAtTime(340 * j, t + 0.16);
    const bq = c.createBiquadFilter();
    bq.type = "bandpass";
    bq.frequency.value = 1100;
    bq.Q.value = 3;
    o.connect(bq).connect(env(c, t, 0.9, 0.01, 0.18));
    o.start(t);
    o.stop(t + 0.25);
  },
  peel: () => hiss("bandpass", 3000, 600, 0.2, 0.4, 0, 2),
  tick: () => tone("square", 1800, 1800, 0.015, 0.15),
  tink: () => tone("sine", 2637, 2637, 0.25, 0.3),
  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => tone("triangle", f, f, 0.22, 0.4, i * 0.09));
  },
  forge() {
    tone("sawtooth", 110, 880, 1.6, 0.25);
    hiss("bandpass", 200, 4000, 1.6, 0.3);
    tone("sine", 1047, 1047, 0.6, 0.4, 1.7);
  },
};
