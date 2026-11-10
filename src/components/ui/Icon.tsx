import {
  Check,
  Copy,
  Maximize,
  Minimize,
  Moon,
  Sun,
  Image,
  Printer,
  Share2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  House,
  Music,
  Pencil,
  RefreshCw,
  Settings,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

/** App icons come from Lucide (one consistent, well-drawn set); names here stay short and stable. */
const ICONS = {
  home: House,
  music: Music,
  settings: Settings,
  close: X,
  check: Check,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  bin: Trash2,
  refresh: RefreshCw,
  edit: Pencil,
  share: Share2,
  image: Image,
  copy: Copy,
  print: Printer,
  fullscreen: Maximize,
  exitFullscreen: Minimize,
  moon: Moon,
  sun: Sun,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const C = ICONS[name];
  return (
    <C
      className={`ui-icon${className ? ` ${className}` : ""}`}
      size={size}
      strokeWidth={2}
      absoluteStrokeWidth
      aria-hidden
      focusable={false}
    />
  );
}
