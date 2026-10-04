import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  Lock,
  LogOut,
  MessageCircle,
  MessageSquare,
  Palette,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Volume2,
} from "lucide-react";
import { PersonMark } from "@/components/person-mark";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { playSound } from "@/lib/sounds";
import { useRiff } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings & Account · RIFF" }] }),
});

interface SettingsPreferences {
  pushNotifications: boolean;
  messageNotifications: boolean;
  privateProfile: boolean;
  showActivityStatus: boolean;
}

const DEFAULT_PREFERENCES: SettingsPreferences = {
  pushNotifications: true,
  messageNotifications: true,
  privateProfile: false,
  showActivityStatus: true,
};

const STORAGE_KEY = "riff_user_preferences";

function SettingsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const rawProfile = useRiff((s) => s.profile);
  const profile = rawProfile || { name: "You", handle: "you", role: "creator" };
  const mutedCreatorHandles = useRiff((s) => s.mutedCreatorHandles);
  const mutedCategoryIds = useRiff((s) => s.mutedCategoryIds);

  // Persistent preferences
  const [preferences, setPreferences] = useState<SettingsPreferences>(() => {
    if (typeof window === "undefined") return DEFAULT_PREFERENCES;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [signingOut, setSigningOut] = useState(false);

  // Save preferences on change
  function updatePreference<K extends keyof SettingsPreferences>(
    key: K,
    value: SettingsPreferences[K],
  ) {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: value };
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
    <div className="mx-auto w-full max-w-2xl px-4 py-8 pb-28 text-white">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="font-display text-2xl font-black tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-xs text-white/50">
          Manage your account preferences, notifications, and privacy options.
        </p>
      </header>

      <div className="space-y-6">
        {/* ================================================= */}
        {/* 1. ACCOUNT */}
        {/* ================================================= */}
        <section className="rounded-3xl border border-white/10 bg-[#0f0f14] p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <User className="size-4 text-[#d4ff00]" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Account
            </h2>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 mb-4">
            <div className="flex items-center gap-3">
              <PersonMark mark="you" size="md" />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-white">{profile.name}</p>
                  <CheckCircle2 className="size-3.5 text-[#d4ff00] fill-[#d4ff00]/20" />
                </div>
                <p className="text-xs text-white/50">@{profile.handle}</p>
              </div>
            </div>

            <Link
              to="/you"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#d4ff00] hover:underline px-3 py-1.5 rounded-xl hover:bg-[#d4ff00]/10 transition-colors"
            >
              <span>Edit Profile</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-white/5 text-xs">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-white">Account Status</p>
                <p className="text-[11px] text-white/40">Verified Creator in good standing</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Active
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-white">Account Role</p>
                <p className="text-[11px] text-white/40">Assigned platform clearance level</p>
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white/70">
                {role.replace("_", " ")}
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-white">Member Handle</p>
                <p className="text-[11px] text-white/40">Public profile address</p>
              </div>
              <span className="font-mono text-[11px] text-white/70">riff.io/@{profile.handle}</span>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* APPEARANCE & THEME */}
        {/* ================================================= */}
        <section className="rounded-3xl border border-white/10 bg-[#0f0f14] p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-cyan-400" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Appearance & Theme
              </h2>
            </div>
            <span className="text-[10px] text-white/40 font-medium">5 Theme Presets</span>
          </div>

          <p className="text-xs text-white/50 mb-4 leading-relaxed">
            Personalize your workspace aesthetic. Switch between crisp light, midnight black, cyberpunk, warm sunset, and slate studio.
          </p>

          <ThemeSwitcher variant="full" />
        </section>

        {/* ================================================= */}
        {/* 2. NOTIFICATIONS */}
        {/* ================================================= */}
        <section className="rounded-3xl border border-white/10 bg-[#0f0f14] p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="size-4 text-[#d4ff00]" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Notifications
            </h2>
          </div>

          <div className="divide-y divide-white/5 text-xs">
            {/* Push Notifications Toggle */}
            <div className="flex items-center justify-between py-3.5">
              <div>
                <p className="font-semibold text-white">Push Notifications</p>
                <p className="text-[11px] text-white/40 leading-snug">
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
                  preferences.pushNotifications ? "bg-[#d4ff00]" : "bg-white/20",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out",
                    preferences.pushNotifications ? "translate-x-5" : "translate-x-0 bg-white/80",
                  )}
                />
              </button>
            </div>

            {/* Message Notifications Toggle */}
            <div className="flex items-center justify-between py-3.5">
              <div>
                <p className="font-semibold text-white">Direct Message Alerts</p>
                <p className="text-[11px] text-white/40 leading-snug">
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
                  preferences.messageNotifications ? "bg-[#d4ff00]" : "bg-white/20",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out",
                    preferences.messageNotifications ? "translate-x-5" : "translate-x-0 bg-white/80",
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* 3. PRIVACY & SAFETY */}
        {/* ================================================= */}
        <section className="rounded-3xl border border-white/10 bg-[#0f0f14] p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="size-4 text-[#d4ff00]" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Privacy &amp; Safety
            </h2>
          </div>

          <div className="divide-y divide-white/5 text-xs">
            {/* Private Profile Toggle */}
            <div className="flex items-center justify-between py-3.5">
              <div>
                <p className="font-semibold text-white">Private Profile</p>
                <p className="text-[11px] text-white/40 leading-snug">
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
                  preferences.privateProfile ? "bg-[#d4ff00]" : "bg-white/20",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out",
                    preferences.privateProfile ? "translate-x-5" : "translate-x-0 bg-white/80",
                  )}
                />
              </button>
            </div>

            {/* Activity Status Toggle */}
            <div className="flex items-center justify-between py-3.5">
              <div>
                <p className="font-semibold text-white">Activity Status</p>
                <p className="text-[11px] text-white/40 leading-snug">
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
                  preferences.showActivityStatus ? "bg-[#d4ff00]" : "bg-white/20",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out",
                    preferences.showActivityStatus ? "translate-x-5" : "translate-x-0 bg-white/80",
                  )}
                />
              </button>
            </div>

            {/* Safety & Muted Filters Counter */}
            <div className="flex items-center justify-between py-3.5">
              <div>
                <p className="font-semibold text-white">Muted Creators &amp; Categories</p>
                <p className="text-[11px] text-white/40 leading-snug">
                  Content filters applied to your personal algorithmic feed
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-mono text-white/70">
                {mutedCreatorHandles.length + mutedCategoryIds.length} muted
              </span>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* 4. APP EXPERIENCE */}
        {/* ================================================= */}
        <section className="rounded-3xl border border-white/10 bg-[#0f0f14] p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-4 text-[#d4ff00]" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              App Experience
            </h2>
          </div>

          <div className="flex items-center justify-between py-2 text-xs">
            <div>
              <p className="font-semibold text-white">Welcome Intro Animation</p>
              <p className="text-[11px] text-white/40 leading-snug">
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
              className="rounded-xl border border-[#d4ff00]/40 bg-[#d4ff00]/10 hover:bg-[#d4ff00]/20 px-3.5 py-2 text-xs font-bold text-[#d4ff00] transition flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="size-3.5" />
              Replay Intro
            </button>
          </div>
        </section>

        {/* ================================================= */}
        {/* 5. SIGN OUT */}
        {/* ================================================= */}
        <section className="rounded-3xl border border-white/10 bg-[#0f0f14] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Sign Out</p>
              <p className="text-xs text-white/40">Log out of your RIFF creator session on this device</p>
            </div>

            <Button
              variant="subtle"
              size="sm"
              disabled={signingOut}
              onClick={handleSignOut}
              className="rounded-xl px-4 py-2 text-xs font-bold bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 transition-colors flex items-center gap-1.5"
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
