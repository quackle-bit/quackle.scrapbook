/**
 * One small set of clean line icons (24 px grid, 2 px stroke, round ends), used instead of text
 * glyphs like ⌂ ♪ ⚙ ✕, which look different on every phone.
 */
const PATHS = {
  home: "M4 11 12 4l8 7M6 9.5V20h4.5v-5h3v5H18V9.5",
  music:
    "M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm10-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13a7.5 7.5 0 0 0 0-2l2-1.5-2-3.5-2.3.9a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.4 2.4a7.5 7.5 0 0 0-1.7 1L6.6 6 4.6 9.5l2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.5 2.3-.9a7.5 7.5 0 0 0 1.7 1l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 1.7-1l2.3.9 2-3.5Z",
  close: "M6 6l12 12M18 6 6 18",
  check: "M5 12.5 10 17.5 19 7",
  chevronDown: "M6 9l6 6 6-6",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  bin: "M4 7h16M10 7V4.5h4V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5",
  refresh: "M19 12a7 7 0 1 1-2-4.9M19 4v4h-4",
  edit: "M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`ui-icon${className ? ` ${className}` : ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
