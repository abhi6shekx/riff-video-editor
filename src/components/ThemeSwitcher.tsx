import { useState, useRef, useEffect } from "react";
import { THEMES, useTheme, type ThemeId } from "@/lib/theme";
import { playSound } from "@/lib/sounds";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Palette, Check } from "lucide-react";

interface ThemeSwitcherProps {
  variant?: "compact" | "full" | "dropdown";
  className?: string;
}

export function ThemeSwitcher({ variant = "compact", className }: ThemeSwitcherProps) {
  const { theme, setTheme, cycleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];
  const isDark = theme === "dark";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function handleSelectTheme(id: ThemeId) {
    setTheme(id);
    playSound("pop");
    toast.success(`Theme switched to ${THEMES.find((t) => t.id === id)?.label}!`);
    setOpen(false);
  }

  // Variant A: Full grid with theme cards (Settings page)
  if (variant === "full") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", className)}>
        {THEMES.map((t) => {
          const active = t.id === theme;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectTheme(t.id)}
              className={cn(
                "relative flex flex-col p-4 rounded-2xl border text-left transition-all group active:scale-[0.98] cursor-pointer",
                active
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-surface hover:bg-raised text-muted hover:text-fg hover:border-border/80",
              )}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-2xl">{t.icon}</span>
                <span
                  className="size-4 rounded-full border border-black/20 shadow-xs"
                  style={{ backgroundColor: t.primaryColor }}
                />
              </div>

              <p className={cn("text-sm font-bold truncate", active ? "text-fg" : "text-fg/80")}>
                {t.label}
              </p>
              <p className="text-xs text-muted truncate mt-0.5">{t.desc}</p>

              {active && (
                <div className="absolute top-3 right-3 size-5 rounded-full bg-primary text-primary-fg flex items-center justify-center">
                  <Check className="size-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Variant B: Compact 1-click toggle (Navbars & Headers)
  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => {
          cycleTheme();
          playSound("pop");
          toast.success(`Theme switched to ${isDark ? "Light Mode" : "Dark Mode"}!`);
        }}
        className={cn(
          "flex size-9 items-center justify-center rounded-xl border border-border bg-surface text-fg/80 hover:text-fg hover:bg-raised transition-colors shadow-xs active:scale-95 cursor-pointer",
          className,
        )}
        title={`Switch to ${isDark ? "Light Mode" : "Dark Mode"}`}
        aria-label={`Switch to ${isDark ? "Light Mode" : "Dark Mode"}`}
      >
        <span className="text-base select-none">{isDark ? "🌙" : "☀️"}</span>
      </button>
    );
  }

  // Variant C: Dropdown menu (if explicitly requested)
  return (
    <div className={cn("relative inline-block", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex size-9 items-center justify-center rounded-xl border border-border bg-surface text-fg/80 hover:text-fg hover:bg-raised transition-colors shadow-xs active:scale-95 cursor-pointer"
        title={`Change Theme (Current: ${currentTheme.label})`}
      >
        <span className="text-sm select-none">{currentTheme.icon}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-border bg-surface p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          <div className="px-2.5 py-1.5 mb-1 border-b border-border flex items-center justify-between">
            <span className="text-[11px] font-bold text-fg/80 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="size-3.5" />
              <span>Theme</span>
            </span>
            <span className="text-[10px] text-muted">{currentTheme.badge}</span>
          </div>

          <div className="flex flex-col gap-1">
            {THEMES.map((t) => {
              const active = t.id === theme;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTheme(t.id)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:text-fg hover:bg-raised",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{t.icon}</span>
                    <p className="text-xs leading-none">{t.label}</p>
                  </div>

                  {active && <Check className="size-3 text-primary stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
