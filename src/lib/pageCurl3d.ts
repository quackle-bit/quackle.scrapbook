"use client";

/**
 * A real 3D page turn: a sheet of paper made of a 36×8 grid of points, bent with plain math every
 * frame while it turns and left alone otherwise.
 *
 * The page is treated as a strip of thin columns. Each column is rotated a little more than the one
 * before it, so the angles add up from the spine to the outer edge and the sheet curls instead of
 * swinging like a door. One number drives everything: progress p, 0 = flat on the right, 1 = flat on
 * the left (over the spine). The turn angle, how much it curls, how far it lifts off the stack and
 * how much the bottom corner leads are all computed from p. A soft shadow on the page below follows
 * the same number.
 *
 * three.js is loaded on the first turn only. If WebGL isn't available this returns false and the
 * caller falls back to the flat sheet.
 */

type Three = typeof import("three");

const COLS = 36;
const ROWS = 8;
const PAPER = 0xfffcf4;

let lib: Promise<Three> | null = null;
const loadThree = () => (lib ??= import("three"));

type Scene = {
  T: Three;
  renderer: import("three").WebGLRenderer;
  scene: import("three").Scene;
  camera: import("three").PerspectiveCamera;
  mesh: import("three").Mesh;
  geo: import("three").PlaneGeometry;
  edge: import("three").LineLoop;
  w: number;
  h: number;
};
let cached: Scene | null = null;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function build(T: Three, w: number, h: number): Scene {
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new T.Scene();
  // Bright paper: strong fill light, a key light from the front-left so the bend shades softly.
  scene.add(new T.AmbientLight(0xffffff, 2.4));
  const sun = new T.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-0.5, 0.4, 1.4);
  scene.add(sun);
  const geo = new T.PlaneGeometry(1, 1, COLS, ROWS);
  const mat = new T.MeshLambertMaterial({ color: PAPER, side: T.DoubleSide });
  const mesh = new T.Mesh(geo, mat);
  scene.add(mesh);
  // Ink outline around the sheet (the book's pixel look), following the curl.
  const ring = (COLS + 1) * 2 + (ROWS - 1) * 2;
  const edgeGeo = new T.BufferGeometry();
  edgeGeo.setAttribute("position", new T.BufferAttribute(new Float32Array(ring * 3), 3));
  const edge = new T.LineLoop(edgeGeo, new T.LineBasicMaterial({ color: 0x24211f }));
  scene.add(edge);
  const camera = new T.PerspectiveCamera(30, 1, 1, 10000);
  return { T, renderer, scene, camera, mesh, geo, edge, w, h };
}

/** Loads three.js and checks WebGL once. True when 3D page turns can run. */
export async function curlReady(): Promise<boolean> {
  try {
    const T = await loadThree();
    if (!cached) cached = build(T, 1, 1);
    return true;
  } catch {
    return false;
  }
}

/** Lay the sheet out for progress p (0..1) on a page w×h px, spine at x = 0. */
function shape(s: Scene, p: number) {
  const { geo, w, h } = s;
  const pos = geo.attributes.position;
  const lift = Math.sin(Math.PI * p);
  const theta = Math.PI * p; // turn around the spine
  const curl = 1.7 * lift; // extra bend toward the outer edge, strongest mid-turn
  const lead = 0.55 * lift; // the bottom corner leads, as if grabbed there
  const seg = w / COLS;
  for (let r = 0; r <= ROWS; r++) {
    const v = r / ROWS; // 0 = top row, 1 = bottom row (PlaneGeometry rows go top → bottom)
    const y = h / 2 - v * h;
    let x = 0;
    let z = 0;
    for (let c = 0; c <= COLS; c++) {
      const i = r * (COLS + 1) + c;
      pos.setXYZ(i, x, y, z + 2 * lift);
      const u = c / COLS;
      // each column turns a little more than the last: the angles add up into a curl
      const phi = theta + (curl + lead * v) * u * u;
      x += seg * Math.cos(Math.min(phi, Math.PI));
      z += seg * Math.sin(Math.min(phi, Math.PI));
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  // Outline: top row left→right, right column down, bottom row right→left, left column up.
  const ring = s.edge.geometry.attributes.position;
  let k = 0;
  const put = (i: number) => {
    ring.setXYZ(k++, pos.getX(i), pos.getY(i), pos.getZ(i) + 0.5);
  };
  for (let c = 0; c <= COLS; c++) put(c);
  for (let r = 1; r < ROWS; r++) put(r * (COLS + 1) + COLS);
  for (let c = COLS; c >= 0; c--) put(ROWS * (COLS + 1) + c);
  for (let r = ROWS - 1; r >= 1; r--) put(r * (COLS + 1));
  ring.needsUpdate = true;
}

/**
 * Plays a 3D turn over `host` (the book binding). `dir` 1 = Next (the sheet lifts off the right and
 * lands over the spine), -1 = Back (it comes back from the left). Resolves true when done, false if
 * 3D isn't available. `shadow` is an element whose opacity follows the turn.
 */
export async function playCurl(
  host: HTMLElement,
  dir: 1 | -1,
  ms: number,
  shadow?: HTMLElement | null,
): Promise<boolean> {
  // Dev only: window.__curlSlow = 10 plays turns in slow motion for inspection.
  if (process.env.NODE_ENV !== "production") {
    const slow = (window as unknown as { __curlSlow?: number }).__curlSlow;
    if (slow) ms *= slow;
  }
  let T: Three;
  try {
    T = await loadThree();
  } catch {
    return false;
  }
  const rect = host.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  if (!w || !h) return false;
  try {
    if (!cached) cached = build(T, w, h);
  } catch {
    return false; // no WebGL
  }
  const s = cached;
  s.w = w;
  s.h = h;
  // The canvas covers the page and the same width to its left (where the sheet lands), plus a
  // margin for the part that lifts toward you. World units are CSS pixels; the spine is x = 0.
  const pad = Math.round(h * 0.18);
  const cw = w * 2;
  const ch = h + pad * 2;
  s.renderer.setSize(cw, ch, false);
  const el = s.renderer.domElement;
  el.className = "dk-curl3d";
  Object.assign(el.style, {
    position: "absolute",
    left: `${-w}px`,
    top: `${-pad}px`,
    width: `${cw}px`,
    height: `${ch}px`,
    zIndex: "6",
    pointerEvents: "none",
  });
  s.camera.aspect = cw / ch;
  s.camera.position.set(0, 0, ch / 2 / Math.tan((s.camera.fov * Math.PI) / 360));
  s.camera.lookAt(0, 0, 0);
  s.camera.updateProjectionMatrix();
  host.appendChild(el);

  await new Promise<void>((done) => {
    const t0 = performance.now();
    let raf = 0;
    const stop = () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      done();
    };
    // A paused tab must not hang the turn.
    const safety = setTimeout(stop, ms * 4);
    const frame = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = easeInOut(k);
      const p = dir === 1 ? e : 1 - e;
      shape(s, p);
      if (shadow) shadow.style.opacity = String(0.35 * Math.sin(Math.PI * p));
      s.renderer.render(s.scene, s.camera);
      if (k < 1) raf = requestAnimationFrame(frame);
      else stop();
    };
    shape(s, dir === 1 ? 0 : 1);
    s.renderer.render(s.scene, s.camera);
    raf = requestAnimationFrame(frame);
  });

  el.remove();
  if (shadow) shadow.style.opacity = "0";
  return true;
}
