import qrcode from "qrcode-generator";

/** A crisp QR code as SVG squares (no canvas), so it exports cleanly in the pitch image. */
export function QrCode({ text, size = 72 }: { text: string; size?: number }) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const cells: string[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (qr.isDark(y, x)) cells.push(`M${x} ${y}h1v1h-1z`);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`-1 -1 ${n + 2} ${n + 2}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code: ${text}`}
    >
      <rect x={-1} y={-1} width={n + 2} height={n + 2} fill="#fff" />
      <path d={cells.join("")} fill="#24211f" />
    </svg>
  );
}
