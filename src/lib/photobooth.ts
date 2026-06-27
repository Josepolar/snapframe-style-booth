export type ModeId = "solo" | "couple" | "friends" | "group";

export type Mode = {
  id: ModeId;
  label: string;
  shots: number;
  hint: string;
};

export const MODES: Mode[] = [
  { id: "solo", label: "Solo", shots: 4, hint: "One person, four cuts" },
  { id: "couple", label: "Couple", shots: 4, hint: "Two of you, side by side" },
  { id: "friends", label: "Friends", shots: 4, hint: "2–6 people, candid grid" },
  { id: "group", label: "Group", shots: 4, hint: "The whole crew" },
];

export type FilterId =
  | "none"
  | "vintage"
  | "mono"
  | "film"
  | "soft"
  | "retro"
  | "warm"
  | "cool";

export type Filter = {
  id: FilterId;
  label: string;
  css: string;
  swatch: string;
};

export const FILTERS: Filter[] = [
  { id: "none", label: "Natural", css: "none", swatch: "#e7e5e4" },
  { id: "warm", label: "Warm Tone", css: "saturate(1.1) sepia(0.18) contrast(1.05) brightness(1.04)", swatch: "#fde4cf" },
  { id: "cool", label: "Cool Tone", css: "saturate(1.05) hue-rotate(-10deg) brightness(1.02)", swatch: "#dbeafe" },
  { id: "vintage", label: "Vintage", css: "sepia(0.45) contrast(0.95) saturate(0.9) brightness(1.02)", swatch: "#d6c5a8" },
  { id: "mono", label: "Noir Mono", css: "grayscale(1) contrast(1.1)", swatch: "#404040" },
  { id: "film", label: "Film 35mm", css: "contrast(1.15) saturate(1.2) sepia(0.1) brightness(0.98)", swatch: "#bda58a" },
  { id: "soft", label: "Soft Skin", css: "blur(0.4px) brightness(1.08) saturate(0.95) contrast(0.95)", swatch: "#fbd5d5" },
  { id: "retro", label: "Retro Booth", css: "sepia(0.25) saturate(1.3) contrast(1.1) hue-rotate(-8deg)", swatch: "#f4a261" },
];

export type LayoutId = "strip4" | "grid2x2" | "polaroid" | "couple" | "collage";

export type Layout = {
  id: LayoutId;
  label: string;
  shots: number;
  hint: string;
};

export const LAYOUTS: Layout[] = [
  { id: "strip4", label: "Classic 4-Cut", shots: 4, hint: "Vertical photostrip" },
  { id: "grid2x2", label: "2 × 2 Grid", shots: 4, hint: "Square format" },
  { id: "polaroid", label: "Polaroid", shots: 1, hint: "Single hero shot" },
  { id: "couple", label: "Couple", shots: 2, hint: "Side by side" },
  { id: "collage", label: "Friends Collage", shots: 6, hint: "Six-cut grid" },
];

export type FrameColor = {
  id: string;
  label: string;
  value: string;
  text: string;
};

export const FRAME_COLORS: FrameColor[] = [
  { id: "white", label: "Paper White", value: "#ffffff", text: "#1c1917" },
  { id: "cream", label: "Cream", value: "#f4e4d4", text: "#1c1917" },
  { id: "ink", label: "Ink Black", value: "#18181b", text: "#fafaf9" },
  { id: "blush", label: "Blush", value: "#f8d4d4", text: "#1c1917" },
  { id: "sage", label: "Sage", value: "#cfddc9", text: "#1c1917" },
  { id: "accent", label: "Ember", value: "#f4745e", text: "#fafaf9" },
];

export type Session = {
  id: string;
  createdAt: number;
  mode: ModeId;
  layout: LayoutId;
  filter: FilterId;
  frameColor: string;
  caption?: string;
  shots: string[]; // dataURLs
};

const KEY = "snapframe.sessions.v1";

export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

export function saveSession(s: Session) {
  if (typeof window === "undefined") return;
  const all = loadSessions();
  all.unshift(s);
  // Keep last 20 to avoid bloating localStorage
  const trimmed = all.slice(0, 20);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // Quota — drop oldest until it fits
    while (trimmed.length > 1) {
      trimmed.pop();
      try {
        window.localStorage.setItem(KEY, JSON.stringify(trimmed));
        break;
      } catch {
        // continue
      }
    }
  }
}

export function deleteSession(id: string) {
  if (typeof window === "undefined") return;
  const all = loadSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export function formatStamp(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
