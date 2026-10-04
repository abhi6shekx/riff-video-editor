import { create } from "zustand";

export type ThemeId = "dark" | "light";

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
    label: "Dark Mode",
    desc: "Pro obsidian dark theme",
    icon: "🌙",
    primaryColor: "#00f0ff",
    bgColor: "#08090d",
    badge: "Dark",
  },
  {
    id: "light",
    label: "Light Mode",
    desc: "Clean crisp light theme",
    icon: "☀️",
    primaryColor: "#0284c7",
    bgColor: "#f8fafc",
    badge: "Light",
  },
] as const;

const THEME_STORAGE_KEY = "riff_active_theme";

function getInitialTheme(): ThemeId {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light") {
      return "light";
    }
  } catch {}
  return "dark";
}

export function applyThemeToDom(theme: ThemeId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const targetTheme: ThemeId = theme === "light" ? "light" : "dark";
  root.setAttribute("data-theme", targetTheme);
  if (targetTheme === "light") {
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
    const targetTheme: ThemeId = theme === "light" ? "light" : "dark";
    applyThemeToDom(targetTheme);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, targetTheme);
      } catch {}
    }
    set({ theme: targetTheme });
  },
  cycleTheme: () => {
    const current = get().theme;
    const nextTheme: ThemeId = current === "dark" ? "light" : "dark";
    get().setTheme(nextTheme);
  },
}));
