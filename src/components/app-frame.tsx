import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Clapperboard,
  Crown,
  Film,
  House,
  Lock,
  MessageCircle,
  Plus,
  Settings,
  Shield,
  Sliders,
  UserRound,
} from "lucide-react";

import { PersonMark } from "@/components/person-mark";
import { RiffNavbarLockup } from "@/components/riff-navbar-lockup";
import { StreakButton } from "@/components/streak-button";
import { useAuth } from "@/lib/auth-context";
import { useRiff } from "@/lib/store";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  isCreate?: boolean;
  badge?: "chat" | "notifications";
}

const NAV: readonly NavItem[] = [
  {
    to: "/",
    label: "Home",
    icon: House,
  },
  {
    to: "/reels",
    label: "Reels",
    icon: Clapperboard,
  },
  {
    to: "/create",
    label: "Create",
    icon: Plus,
    isCreate: true,
  },
  {
    to: "/chat",
    label: "Messages",
    icon: MessageCircle,
    badge: "chat",
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: Bell,
    badge: "notifications",
  },
  {
    to: "/you",
    label: "Profile",
    icon: UserRound,
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

const MOBILE_NAV: readonly NavItem[] = [
  {
    to: "/",
    label: "Home",
    icon: House,
  },
  {
    to: "/reels",
    label: "Reels",
    icon: Clapperboard,
  },
  {
    to: "/create",
    label: "Create",
    icon: Plus,
    isCreate: true,
  },
  {
    to: "/chat",
    label: "Messages",
    icon: MessageCircle,
    badge: "chat",
  },
  {
    to: "/you",
    label: "Profile",
    icon: UserRound,
  },
];

function SearchIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#080808] text-white">
      <RiffNavbarLockup size={46} />
    </div>
  );
}

export function AppFrame({
  children,
}: {
  children: ReactNode;
}) {
  const [hydrated, setHydrated] = useState(false);

  useAuth();

  const profile = useRiff((s) => s.profile);
  const pointsWallet = useRiff((s) => s.pointsWallet);
  const creatorPopularity = useRiff(
    (s) => s.creatorPopularity,
  );

  const pendingSubmissions = useRiff(
    (s) => s.pendingSubmissions,
  );

  const notifications = useRiff(
    (s) => s.notifications,
  );

  const chats = useRiff((s) => s.chats);
  const isMaintenance =
    useRiff((s) => s.getSystemConfigValue("maintenance_mode", "false")) === "true" ||
    useRiff((s) => s.platformControls.maintenanceMode);

  const unreadNotifications =
    notifications.filter((n) => !n.isRead).length;

  const unreadChats = chats.reduce(
    (total, chat) => total + (chat.unread || 0),
    0,
  );

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const isThread = pathname.startsWith("/chat/");
  const isLogin = pathname === "/login";
  const isReelStudio = pathname === "/reel-studio";
  const isVideoEditor = pathname === "/editor";

  const hideNavigation = isThread || isLogin || isReelStudio || isVideoEditor;

  useEffect(() => {
    const persistApi = (
      useRiff as typeof useRiff & {
        persist?: {
          hasHydrated: () => boolean;
          onFinishHydration: (
            callback: () => void,
          ) => () => void;
        };
      }
    ).persist;

    if (persistApi?.hasHydrated()) {
      setHydrated(true);
      return;
    }

    const unsubscribe =
      persistApi?.onFinishHydration(() =>
        setHydrated(true),
      );

    const timeout = window.setTimeout(
      () => setHydrated(true),
      150,
    );

    return () => {
      unsubscribe?.();
      window.clearTimeout(timeout);
    };
  }, []);

  if (!hydrated) {
    return <Splash />;
  }

  const safeProfile = profile || { name: "You", handle: "you", role: "creator" };
  const role = safeProfile.role || "creator";

  const isAdmin =
    role === "admin" ||
    role === "super_admin" ||
    role === "owner";

  const isOwner = role === "owner";

  if (isMaintenance && !isAdmin && pathname !== "/login") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#080808] px-6 text-center text-white">
        <div className="mb-6 flex size-20 items-center justify-center rounded-3xl border border-amber-500/30 bg-amber-500/10 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
          <Sliders className="size-10 text-amber-400 animate-pulse" />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
          <span className="size-2 rounded-full bg-amber-400 animate-ping" />
          System Maintenance In Progress
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
          RIFF is Upgrading
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/60 leading-relaxed">
          We are currently performing scheduled platform maintenance and database upgrades to improve system performance. Public access is temporarily paused.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link
            to="/login"
            className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/15"
          >
            Staff &amp; Operator Access
          </Link>
        </div>
        <p className="mt-12 text-[11px] text-white/30 font-mono">
          HTTP 503 · Platform Maintenance Mode Active
        </p>
      </div>
    );
  }

  function getBadge(item: NavItem) {
    if (item.badge === "chat") {
      return unreadChats;
    }

    if (item.badge === "notifications") {
      return unreadNotifications;
    }

    return 0;
  }

  function isActive(item: NavItem) {
    if (item.to === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(item.to);
  }

  return (
    <div className="min-h-screen w-full bg-[#080808] text-white">
      {/* MAINTENANCE MODE BANNER FOR STAFF */}
      {isMaintenance && isAdmin && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 flex items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span className="font-semibold">
              Platform Maintenance Mode is <strong>ACTIVE</strong> — Public traffic is held at maintenance screen. Staff bypass engaged.
            </span>
          </div>
          <Link
            to="/owner"
            className="rounded-md bg-amber-500 px-2.5 py-1 text-[11px] font-black text-black hover:bg-amber-400 transition shrink-0"
          >
            Manage in Owner Center
          </Link>
        </div>
      )}

      {/* ================================================= */}
      {/* DESKTOP SIDEBAR */}
      {/* ================================================= */}

      {!hideNavigation && (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[230px] flex-col border-r border-white/[0.08] bg-[#090909] md:flex">
          {/* BRAND */}

          <div className="px-6 pb-5 pt-7">
            <Link
              to="/"
              className="inline-flex transition-opacity hover:opacity-80"
            >
              <RiffNavbarLockup size={38} />
            </Link>
          </div>

          {/* NAVIGATION */}

          <nav className="flex-1 px-4">
            <div className="space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                const badge = getBadge(item);

                if (item.isCreate) {
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="my-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#d4ff00] px-4 text-sm font-black text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="size-5 stroke-[3]" />
                      Create
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex h-11 items-center justify-between rounded-xl px-4 text-sm font-semibold transition-colors",
                      active
                        ? "bg-[#d4ff00]/10 text-[#d4ff00]"
                        : "text-white/50 hover:bg-white/[0.05] hover:text-white",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        className="size-[19px]"
                        strokeWidth={
                          active ? 2.5 : 2
                        }
                      />

                      {item.label}
                    </span>

                    {badge > 0 && (
                      <span className="flex min-w-5 items-center justify-center rounded-full bg-[#d4ff00] px-1.5 py-0.5 text-[10px] font-black text-black">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* ADMIN ONLY */}

            {isAdmin && (
              <div className="mt-5 border-t border-white/[0.07] pt-4 space-y-1">
                <Link
                  to="/admin"
                  className={cn(
                    "flex h-11 items-center justify-between rounded-xl px-4 text-sm font-semibold transition-colors",
                    pathname.startsWith("/admin")
                      ? "bg-[#d4ff00]/10 text-[#d4ff00]"
                      : "text-white/40 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Shield className="size-[18px]" />
                    Admin Review
                  </span>

                  {pendingSubmissions.length > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black text-white">
                      {pendingSubmissions.length}
                    </span>
                  )}
                </Link>

                {isOwner && (
                  <Link
                    to="/owner"
                    className={cn(
                      "flex h-11 items-center justify-between rounded-xl px-4 text-sm font-semibold transition-colors",
                      pathname.startsWith("/owner")
                        ? "bg-amber-500/15 text-amber-400"
                        : "text-white/40 hover:bg-white/[0.05] hover:text-white",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Crown className="size-[18px] text-amber-400" />
                      Owner Controls
                    </span>

                    <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.2 text-[9px] font-black">
                      ROOT
                    </span>
                  </Link>
                )}
              </div>
            )}
          </nav>

          {/* CREATOR SUMMARY */}

          <div className="border-t border-white/[0.07] p-4">
            <StreakButton variant="full" className="mb-3" />

            <div className="rounded-2xl border border-white/[0.07] bg-[#101010] p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
                  Creator (You)
                </p>
                <span className="flex items-center gap-1 text-[9px] font-bold text-[#d4ff00]/80" title="Wallet balance is strictly private to your account">
                  <Lock className="size-2.5" /> Private
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-lg font-black text-[#d4ff00]">
                    {pointsWallet.toLocaleString()}
                  </p>

                  <p className="text-[10px] text-white/35">
                    RIFF Points
                  </p>
                </div>

                <div>
                  <p className="text-lg font-black text-white">
                    {Math.round(
                      creatorPopularity,
                    ).toLocaleString()}
                  </p>

                  <p className="text-[10px] text-white/35">
                    Popularity
                  </p>
                </div>
              </div>
            </div>

            <Link
              to="/you"
              className="mt-3 flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.05]"
            >
              <PersonMark
                mark="you"
                size="sm"
              />

              <div className="min-w-0">
                <p className="truncate text-xs font-bold">
                  {safeProfile.name}
                </p>

                <p className="truncate text-[10px] text-white/35">
                  @{safeProfile.handle}
                </p>
              </div>
            </Link>
          </div>
        </aside>
      )}

      {/* ================================================= */}
      {/* MOBILE HEADER */}
      {/* ================================================= */}

      {!hideNavigation && (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.08] bg-[#080808]/95 px-4 backdrop-blur-xl md:hidden">
          <Link to="/">
            <RiffNavbarLockup size={31} />
          </Link>

          <div className="flex items-center gap-2">
            <StreakButton variant="compact" />

            <Link
              to="/notifications"
              className="relative flex size-9 items-center justify-center rounded-full text-white/60 hover:bg-white/[0.06] hover:text-white"
            >
              <Bell className="size-[19px]" />

              {unreadNotifications >
                0 && (
                <span className="absolute right-1 top-1 size-2 rounded-full bg-[#d4ff00]" />
              )}
            </Link>
          </div>
        </header>
      )}

      {/* ================================================= */}
      {/* MAIN CONTENT */}
      {/* ================================================= */}

      <main
        className={cn(
          "min-h-screen min-w-0",
          !hideNavigation &&
            "md:ml-[230px]",
        )}
      >
        {children}
      </main>

      {/* ================================================= */}
      {/* MOBILE BOTTOM NAV */}
      {/* ================================================= */}

      {!hideNavigation && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#080808]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
          <div className="mx-auto grid h-[66px] max-w-md grid-cols-5 items-center px-2">
            {MOBILE_NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              const badge = getBadge(item);

              if (item.isCreate) {
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex flex-col items-center justify-center"
                  >
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-[#d4ff00] text-black shadow-[0_4px_25px_rgba(212,255,0,0.18)]">
                      <Plus className="size-6 stroke-[3]" />
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex h-full flex-col items-center justify-center gap-1 text-[9px] font-semibold",
                    active
                      ? "text-[#d4ff00]"
                      : "text-white/35",
                  )}
                >
                  <span className="relative">
                    <Icon
                      className="size-[19px]"
                      strokeWidth={
                        active ? 2.5 : 2
                      }
                    />

                    {badge > 0 && (
                      <span className="absolute -right-2 -top-1 size-2 rounded-full bg-[#d4ff00]" />
                    )}
                  </span>

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
