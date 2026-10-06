import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRiff } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { PersonMark } from "@/components/person-mark";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { playSound } from "@/lib/sounds";
import {
  User,
  Bell,
  Shield,
  Palette,
  Sparkles,
  LogOut,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

interface SettingsPreferences {
  pushNotifications: boolean;
  messageNotifications: boolean;
  privateProfile: boolean;
  showActivityStatus: boolean;
}

const STORAGE_KEY = "riff_settings_preferences";

function getInitialPreferences(): SettingsPreferences {
  if (typeof window === "undefined") {
    return {
      pushNotifications: true,
      messageNotifications: true,
      privateProfile: false,
      showActivityStatus: true,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse settings preferences", e);
  }
  return {
    pushNotifications: true,
    messageNotifications: true,
    privateProfile: false,
    showActivityStatus: true,
  };
}

function SettingsPage() {
  const profile = useRiff((s) => s.profile);
  const mutedCreatorHandles = useRiff((s) => s.mutedCreatorHandles) || [];
  const mutedCategoryIds = useRiff((s) => s.mutedCategoryIds) || [];
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [preferences, setPreferences] = useState<SettingsPreferences>(getInitialPreferences);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // Sync with external state if changed
  }, []);

  function updatePreference<K extends keyof SettingsPreferences>(
    key: K,
    val: SettingsPreferences[K]
  ) {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save settings to localStorage", e);
      }
      return updated;
    });
    playSound("pop");
    toast.success("Preference updated");
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      playSound("pop");
      await signOut();
      toast.success("Signed out successfully");
      navigate({ to: "/login" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to sign out");
      setSigningOut(false);
    }
  }

  const role = profile.role || "creator";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 pb-28 text-fg">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="font-display text-2xl font-black tracking-tight text-fg">Settings</h1>
        <p className="mt-1 text-xs text-muted">
          Manage your account preferences, notifications, and appearance options.
        </p>
      </header>

      <div className="space-y-6">
        {/* ================================================= */}
        {/* 1. ACCOUNT */}
        {/* ================================================= */}
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <User className="size-4 text-accent" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-fg">
              Account
            </h2>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-raised border border-border mb-4">
            <div className="flex items-center gap-3">
              <PersonMark mark="you" size="md" />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-fg">{profile.name}</p>
                  <CheckCircle2 className="size-3.5 text-accent fill-accent/20" />
                </div>
                <p className="text-xs text-muted">@{profile.handle}</p>
              </div>
            </div>

            <Link
              to="/you"
              className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline px-3 py-1.5 rounded-xl hover:bg-accent/10 transition-colors"
            >
              <span>Edit Profile</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-border text-xs">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-fg">Account Status</p>
                <p className="text-[11px] text-muted">Verified Creator in good standing</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                Active
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-fg">Account Role</p>
                <p className="text-[11px] text-muted">Assigned platform clearance level</p>
              </div>
              <span className="rounded-full bg-raised border border-border px-2.5 py-0.5 text-[10px] font-bold uppercase text-fg/70">
                {role.replace("_", " ")}
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-fg">Member Handle</p>
                <p className="text-[11px] text-muted">Public profile address</p>
              </div>
              <span className="font-mono text-[11px] text-fg/70">riff.io/@{profile.handle}</span>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* APPEARANCE & THEME */}
        {/* ================================================= */}
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-accent" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-fg">
                Appearance &amp; Theme
              </h2>
            </div>
            <span className="text-[10px] text-muted font-medium">Dark &amp; Light Mode</span>
          </div>

          <p className="text-xs text-muted mb-4 leading-relaxed">
            Personalize your workspace aesthetic. Switch between crisp light mode and midnight dark mode.
          </p>

          <ThemeSwitcher variant="full" />
        </section>

        {/* ================================================= */}
        {/* 2. NOTIFICATIONS */}
        {/* ================================================= */}
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="size-4 text-accent" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-fg">
              Notifications
            </h2>
          </div>

          <div className="divide-y divide-border text-xs">
            {/* Push Notifications Toggle */}
            <div className="flex items-center justify-between py-3.5">
              <div>
                <p className="font-semibold text-fg">Push Notifications</p>
                <p className="text-[11px] text-muted leading-snug">
                  Receive alerts when someone likes, comments, or features your content
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.pushNotifications}
                onClick={() =>
                  updatePreference("pushNotifications", !preferences.pushNotifications)
                }
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  preferences.pushNotifications ? "bg-accent" : "bg-muted/30",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-surface shadow-md ring-0 transition duration-200 ease-in-out",
                    preferences.pushNotifications ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>

            {/* Message Notifications Toggle */}
            <div className="flex items-center justify-between py-3.5">
              <div>
                <p className="font-semibold text-fg">Direct Message Alerts</p>
                <p className="text-[11px] text-muted leading-snug">
                  Get notified when creators send you direct messages or memes
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.messageNotifications}
                onClick={() =>
                  updatePreference("messageNotifications", !preferences.messageNotifications)
                }
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  preferences.messageNotifications ? "bg-accent" : "bg-muted/30",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-surface shadow-md ring-0 transition duration-200 ease-in-out",
                    preferences.messageNotifications ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* 3. PRIVACY & SAFETY */}
        {/* ================================================= */}
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="size-4 text-accent" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-fg">
              Privacy &amp; Safety
            </h2>
          </div>

          <div className="divide-y divide-border text-xs">
            {/* Private Profile Toggle */}
            <div className="flex items-center justify-between py-3.5">
              <div>
                <p className="font-semibold text-fg">Private Profile</p>
                <p className="text-[11px] text-muted leading-snug">
                  Only approved followers can view your full reel history and saved memes (your wallet points, earnings, and cashouts are always 100% private to you).
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.privateProfile}
                onClick={() =>
                  updatePreference("privateProfile", !preferences.privateProfile)
                }
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  preferences.privateProfile ? "bg-accent" : "bg-muted/30",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-surface shadow-md ring-0 transition duration-200 ease-in-out",
                    preferences.privateProfile ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>

            {/* Activity Status Toggle */}
            <div className="flex items-center justify-between py-3.5">
              <div>
                <p className="font-semibold text-fg">Activity Status</p>
                <p className="text-[11px] text-muted leading-snug">
                  Allow other creators to see when you are active online in messages
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.showActivityStatus}
                onClick={() =>
                  updatePreference("showActivityStatus", !preferences.showActivityStatus)
                }
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  preferences.showActivityStatus ? "bg-accent" : "bg-muted/30",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-surface shadow-md ring-0 transition duration-200 ease-in-out",
                    preferences.showActivityStatus ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>

            {/* Safety & Muted Filters Counter */}
            <div className="flex items-center justify-between py-3.5">
              <div>
                <p className="font-semibold text-fg">Muted Creators &amp; Categories</p>
                <p className="text-[11px] text-muted leading-snug">
                  Content filters applied to your personal algorithmic feed
                </p>
              </div>
              <span className="rounded-full bg-raised border border-border px-2.5 py-0.5 text-[10px] font-mono text-fg/70">
                {mutedCreatorHandles.length + mutedCategoryIds.length} muted
              </span>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* 4. APP EXPERIENCE */}
        {/* ================================================= */}
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-4 text-accent" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-fg">
              App Experience
            </h2>
          </div>

          <div className="flex items-center justify-between py-2 text-xs">
            <div>
              <p className="font-semibold text-fg">Welcome Intro Animation</p>
              <p className="text-[11px] text-muted leading-snug">
                Replay the interactive RIFF onboarding showcase &amp; features tour
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("riff:open-intro"));
                }
              }}
              className="rounded-xl border border-accent/40 bg-accent/10 hover:bg-accent/20 px-3.5 py-2 text-xs font-bold text-accent transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Sparkles className="size-3.5" />
              Replay Intro
            </button>
          </div>
        </section>

        {/* ================================================= */}
        {/* 5. SIGN OUT */}
        {/* ================================================= */}
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-fg">Sign Out</p>
              <p className="text-xs text-muted">Log out of your RIFF creator session on this device</p>
            </div>

            <Button
              variant="subtle"
              size="sm"
              disabled={signingOut}
              onClick={handleSignOut}
              className="rounded-xl px-4 py-2 text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>{signingOut ? "Signing out..." : "Sign out"}</span>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
