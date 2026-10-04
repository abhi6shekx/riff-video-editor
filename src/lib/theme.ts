import { create } from "zustand";

export type ThemeId = "dark" | "light" | "cyberpunk" | "sunset" | "slate";

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  desc: string;
  icon: string;
  primaryColor: string;
  bgColor: string;
  badge: string;
}

export const THEMES: readonly ThemeConfig[] = [
  {
    id: "dark",
    label: "Midnight Black",
    desc: "Default pro dark obsidian",
    icon: "🌙",
    primaryColor: "#00f0ff",
    bgColor: "#08090d",
    badge: "Pro Dark",
  },
  {
    id: "light",
    label: "Studio Clean Light",
    desc: "Crisp white minimalist look",
    icon: "☀️",
    primaryColor: "#0284c7",
    bgColor: "#f8fafc",
    badge: "Pure Light",
  },
  {
    id: "cyberpunk",
    label: "Neon Cyberpunk",
    desc: "Synthwave violet & magenta",
    icon: "⚡",
    primaryColor: "#d946ef",
    bgColor: "#0c0714",
    badge: "Vibrant",
  },
  {
    id: "sunset",
    label: "Warm Sunset",
    desc: "Espresso & amber gold glow",
    icon: "🌅",
    primaryColor: "#f59e0b",
    bgColor: "#120e0c",
    badge: "Warm",
  },
  {
    id: "slate",
    label: "Pro Slate Navy",
    desc: "Modern deep blue-gray studio",
    icon: "🌌",
    primaryColor: "#38bdf8",
    bgColor: "#0f172a",
    badge: "Studio",
  },
] as const;

const THEME_STORAGE_KEY = "riff_active_theme";

function getInitialTheme(): ThemeId {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      return saved;
    }
  } catch {}
  return "dark";
}

export function applyThemeToDom(theme: ThemeId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
}

interface ThemeState {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  cycleTheme: () => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: typeof window !== "undefined" ? getInitialTheme() : "dark",
  setTheme: (theme: ThemeId) => {
    applyThemeToDom(theme);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {}
    }
    set({ theme });
  },
  cycleTheme: () => {
    const current = get().theme;
    const currentIndex = THEMES.findIndex((t) => t.id === current);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    const nextTheme = THEMES[nextIndex].id;
    get().setTheme(nextTheme);
  },
}));
