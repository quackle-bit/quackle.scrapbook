/** Pixel art for the title gacha, drawn as text grids (one character per pixel). */

export const PALETTE: Record<string, string> = {
  k: "#24211f",
  d: "#3a3532",
  w: "#eef4f7",
  s: "#ffffff",
  o: "#ffffff",
  r: "#e05a3a",
  R: "#b8432a",
  y: "#f5b83d",
  b: "#4f7cc0",
  g: "#5aa469",
};

/** The machine: glass dome with capsules, red body, empty chute. The knob sits at (6, 23); the chute opening is at (15, 24). */
export const MACHINE = [
  "............................",
  "..........kkkkkkkk..........",
  "........kkwwwwwwwwkk........",
  ".......kwswwwwwwwwwwk.......",
  "......kwswwwwwwwwwwwwk......",
  ".....kwswwwwwwwwwwwwwwk.....",
  "....kwswwwwwwwwwwwwwwwwk....",
  "....kwswwwwbbbwyyywwwwwk....",
  "...kwwwwwwwbbbwyyywwwwwwk...",
  "...kwwwwwwwbbbwyyywwwwwwk...",
  "...kwwwwwwwwwwwwwwwwwwwwk...",
  "...kwwwwyyywgggwrrrwbbbwk...",
  "...kwwwwyyywgggwrrrwbbbwk...",
  "...kwwwwyyywgggwrrrwbbbwk...",
  "...kwwwwwwwwwwwwwwwwwwwwk...",
  "...kwwbbbwrrrwyyywgggwwwk...",
  "....kwbbbwrrrwyyywgggwwk....",
  "....kwbbbwrrrwyyywgggwwk....",
  ".....kwwwwwwwwwwwwwwwwk.....",
  "...kkkkkkkkkkkkkkkkkkkkkk...",
  "...kRRRRRRRRRRRRRRRRRRRRk...",
  "...krrrrrrrrrrrrrrrrrrrrk...",
  "...krrrrrrrrrrrrrrrrrrrrk...",
  "...krrrrrrrrrrkkkkkkkkrrk...",
  "...krrrrrrrrrrkddddddkrrk...",
  "...krrrrrrrrrrkddddddkrrk...",
  "...krrrrrrrrrrkddddddkrrk...",
  "...krrrrrrrrrrkddddddkrrk...",
  "...krrrrrrrrrrkddddddkrrk...",
  "...krrrrrrrrrrkddddddkrrk...",
  "...krrrrrrrrrrkkkkkkkkrrk...",
  "...krrrrrrrrrrrrrrrrrrrrk...",
  "...krrrrrrrrrrrrrrrrrrrrk...",
  "...kkkkkkkkkkkkkkkkkkkkkk...",
  "....kkkk............kkkk....",
  "....kkkk............kkkk....",
];

/** The knob, turned in quarter steps. */
export const KNOB = ["..kkk..", ".koook.", "koooook", "kkkkkkk", "koooook", ".koook.", "..kkk.."];

/** A capsule (amber top, white bottom). */
export const CAPSULE = [".kkkk.", "kyysyk", "kyyyyk", "kooook", "kooook", ".kkkk."];

/** Renders a text grid as crisp SVG rects, merging horizontal runs of the same colour. */
export function PixelArt({ rows, size = 4 }: { rows: string[]; size?: number }) {
  const rects: { x: number; y: number; w: number; c: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (PALETTE[ch]) rects.push({ x, y, w: end - x, c: PALETTE[ch] });
      x = end;
    }
  });
  const w = rows[0].length;
  const h = rows.length;
  return (
    <svg
      width={w * size}
      height={h * size}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
}
