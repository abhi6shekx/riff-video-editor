import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Brain,
  Check,
  Clapperboard,
  Filter,
  Flame,
  LayoutGrid,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { SocialFeedCard } from "@/components/social-feed-card";
import { StreakButton } from "@/components/streak-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computePopularityScore, useRiff } from "@/lib/store";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({ meta: [{ title: "RIFF · Social First Creator Feed" }] }),
});

type MainTab = "for-you" | "following";
type ContentFilter = "all" | "featured" | string; // category id

function HomePage() {
  const posts = useRiff((s) => s.posts) || [];
  const categories = useRiff((s) => s.categories) || [];
  const userInterestProfile = useRiff((s) => s.userInterestProfile) || {};
  const followingUserIds = useRiff((s) => s.followingUserIds) || [];
  const demotedPostIds = useRiff((s) => s.demotedPostIds) || [];
  const mutedCategoryIds = useRiff((s) => s.mutedCategoryIds) || [];
  const mutedCreatorHandles = useRiff((s) => s.mutedCreatorHandles) || [];
  const adjustInterest = useRiff((s) => s.adjustInterest);
  const profile = useRiff((s) => s.profile);

  const [mainTab, setMainTab] = useState<MainTab>("for-you");
  const [filter, setFilter] = useState<ContentFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAiInspector, setShowAiInspector] = useState(false);
  const [profilePromptDismissed, setProfilePromptDismissed] = useState(false);

  const isProfileDone =
    typeof window !== "undefined"
      ? localStorage.getItem("riff_profile_done") === "true"
      : true;

  // AI Feed Ranking Algorithm: POSTS ONLY (Reels live in /reels)
  const rankedFeed = useMemo(() => {
    const safePosts = Array.isArray(posts) ? posts : [];
    const safeDemoted = Array.isArray(demotedPostIds) ? demotedPostIds : [];
    const safeMutedCats = Array.isArray(mutedCategoryIds) ? mutedCategoryIds : [];
    const safeMutedCreators = Array.isArray(mutedCreatorHandles) ? mutedCreatorHandles : [];
    const safeFollowing = Array.isArray(followingUserIds) ? followingUserIds : [];
    const safeInterests = userInterestProfile && typeof userInterestProfile === "object" ? userInterestProfile : {};

    // 1. Safety and Mute Filter: Show ONLY Posts in Home Feed (Reels live exclusively in /reels)
    let candidates = safePosts.filter((p) => {
      if (!p) return false;
      if (p.type === "reel") return false; // REELS LIVE IN /reels ONLY!
      if (safeDemoted.includes(p.id)) return false;
      const catId = p.approvedCategoryId || p.userSelectedCategoryId || "";
      if (safeMutedCats.includes(catId)) return false;
      if (p.authorHandle && safeMutedCreators.includes(p.authorHandle)) return false;
      return true;
    });

    // 2. Following filter
    if (mainTab === "following") {
      candidates = candidates.filter(
        (p) =>
          p &&
          ((p.authorHandle && safeFollowing.includes(p.authorHandle)) ||
            (p.authorId && safeFollowing.includes(p.authorId))),
      );
    }

    // 3. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      candidates = candidates.filter(
        (p) =>
          p &&
          ((p.caption && p.caption.toLowerCase().includes(q)) ||
            (p.topCaption && p.topCaption.toLowerCase().includes(q)) ||
            (p.bottomCaption && p.bottomCaption.toLowerCase().includes(q)) ||
            (p.authorHandle && p.authorHandle.toLowerCase().includes(q)) ||
            (p.authorName && p.authorName.toLowerCase().includes(q)) ||
            (Array.isArray(p.hashtags) && p.hashtags.some((h) => h && h.toLowerCase().includes(q)))),
      );
    }

    // 4. Content Type / Category Filter
    if (filter === "featured") {
      // High velocity and engagement
      candidates = [...candidates].sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    } else if (filter !== "all") {
      candidates = candidates.filter(
        (p) => p && (p.approvedCategoryId || p.userSelectedCategoryId) === filter,
      );
    }

    // 5. If "For You" with "All" or category: Apply AI Multi-Factor Personalization Score
    if (mainTab === "for-you" && filter !== "featured") {
      return [...candidates].sort((a, b) => {
        const catA = a.approvedCategoryId || a.userSelectedCategoryId || "";
        const catB = b.approvedCategoryId || b.userSelectedCategoryId || "";

        const interestA = safeInterests[catA] ?? 0.5;
        const interestB = safeInterests[catB] ?? 0.5;

        const ageHoursA = Math.max(0.1, (Date.now() - (a.createdAt || Date.now())) / 3_600_000);
        const ageHoursB = Math.max(0.1, (Date.now() - (b.createdAt || Date.now())) / 3_600_000);

        const freshnessA = 1 / (1 + ageHoursA * 0.1);
        const freshnessB = 1 / (1 + ageHoursB * 0.1);

        const scoreA =
          interestA * 0.4 + ((a.popularityScore || 0) / 100_000) * 0.35 + freshnessA * 0.25;
        const scoreB =
          interestB * 0.4 + ((b.popularityScore || 0) / 100_000) * 0.35 + freshnessB * 0.25;

        return scoreB - scoreA;
      });
    }

    return candidates;
  }, [
    posts,
    demotedPostIds,
    mutedCategoryIds,
    mutedCreatorHandles,
    mainTab,
    followingUserIds,
    searchQuery,
    filter,
    userInterestProfile,
  ]);

  return (
    <div className="w-full">
      {/* 1. Header with Full-Width Search & AI Algorithm Toggle */}
      <header className="border-b border-white/10 bg-[#0b0b0f]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-[1100px] items-center gap-4 px-4 sm:px-6 py-3.5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search memes, reels, creators, #hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-full border border-white/10 bg-[#101117] pl-11 pr-10 text-sm text-fg placeholder:text-white/30 focus:border-accent/40 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <StreakButton variant="pill" className="shrink-0" />

          <button
            type="button"
            onClick={() => setShowAiInspector(!showAiInspector)}
            className={cn(
              "shrink-0 rounded-full border border-white/10 bg-[#101117] px-4 py-2 text-sm font-bold transition-all flex items-center gap-2",
              showAiInspector ? "bg-accent/20 text-accent border-accent/40" : "text-fg hover:border-accent/40",
            )}
            title="Inspect AI Feed Ranking Algorithm"
          >
            <Brain className="size-4 text-accent" />
            <span className="hidden sm:inline">✦ AI Ranking</span>
          </button>
        </div>
      </header>

      {/* 2. Main Feed Content Wrapper */}
      <div className="mx-auto w-full max-w-[760px] px-4 py-6 space-y-4">
        {/* Profile Creation Prompt Banner if profile is not completed */}
        {!isProfileDone && !profilePromptDismissed && (
          <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0">
                <Sparkles className="size-5 text-accent" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs font-bold text-fg">Complete Your Creator Profile</p>
                <p className="text-[11px] text-muted">
                  Choose your handle (@{profile?.handle || "creator"}), profile picture, and content niches.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/onboarding"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-accent-fg text-xs font-bold shadow hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                <span>Set Up Profile</span>
                <ArrowRight className="size-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setProfilePromptDismissed(true)}
                className="p-1.5 text-muted hover:text-fg rounded-lg cursor-pointer"
                title="Dismiss banner"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Top Feed Switcher: For You vs Following */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setMainTab("for-you")}
              className={cn(
                "font-display text-sm font-black transition-all relative pb-1",
                mainTab === "for-you"
                  ? "text-fg after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-accent shadow-sm"
                  : "text-muted hover:text-fg",
              )}
            >
              For You
            </button>

            <button
              type="button"
              onClick={() => setMainTab("following")}
              className={cn(
                "font-display text-sm font-black transition-all relative pb-1",
                mainTab === "following"
                  ? "text-fg after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-accent shadow-sm"
                  : "text-muted hover:text-fg",
              )}
            >
              Following
              {followingUserIds.length > 0 && (
                <span className="ml-1.5 text-[10px] rounded-full bg-raised px-1.5 py-0.2 font-mono text-muted">
                  {followingUserIds.length}
                </span>
              )}
            </button>
          </div>

          <Link
            to="/create"
            className="flex items-center gap-1 text-[11px] font-bold text-accent hover:underline sm:hidden"
          >
            <Plus className="size-3.5" />
            <span>Create</span>
          </Link>
        </div>

      {/* 3. Category & Format Filter Chips Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-5 -mx-1 px-1">
        {/* All Posts + Reels */}
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "flex items-center gap-1.5 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
            filter === "all"
              ? "bg-accent text-black shadow-[0_0_15px_rgba(0,240,255,0.35)]"
              : "bg-surface/80 text-muted hover:bg-raised hover:text-fg border border-white/5",
          )}
        >
          <LayoutGrid className="size-3.5" />
          <span>All</span>
        </button>

        {/* Featured (Algorithmically Popular) */}
        <button
          type="button"
          onClick={() => setFilter("featured")}
          className={cn(
            "flex items-center gap-1.5 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
            filter === "featured"
              ? "bg-gradient-to-r from-orange-500 to-amber-400 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]"
              : "bg-surface/80 text-muted hover:bg-raised hover:text-fg border border-white/5",
          )}
        >
          <Flame className="size-3.5 fill-orange-400 text-orange-400" />
          <span>Featured</span>
        </button>

        {/* Category Chips with Icons & Approval Points (Posts only) */}
        {categories.map((cat) => {
          const active = filter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id)}
              className={cn(
                "flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all border",
                active
                  ? "bg-accent/20 text-accent border-accent shadow-[0_0_12px_rgba(0,240,255,0.25)] font-bold"
                  : "bg-surface/80 text-muted hover:bg-raised hover:text-fg border-white/5",
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Interactive AI Algorithm Inspector Drawer */}
      {showAiInspector && (
        <div className="mb-6 rounded-3xl border border-accent/30 bg-surface/95 p-4 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-accent/20 text-accent border border-accent/30">
                <Brain className="size-4" />
              </span>
              <div>
                <h3 className="font-display text-xs font-black tracking-tight text-fg">
                  RIFF AI Feed Personalization Engine
                </h3>
                <p className="text-[10px] text-muted">
                  Live weights computed from your likes, watch-time & 'Not Interested' signals
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAiInspector(false)}
              className="text-muted hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* User Category Weights Radar Bar Chart */}
          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
            {categories.slice(0, 8).map((cat) => {
              const weight = userInterestProfile[cat.id] ?? 0.5;
              const pct = Math.round(weight * 100);
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-xl bg-raised/50 px-2.5 py-1.5 border border-white/5"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{cat.icon}</span>
                    <span className="text-[11px] font-semibold text-fg">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent to-mint rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-accent font-bold w-7 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3.5 flex items-center justify-between text-[10px] text-muted border-t border-white/5 pt-2.5">
            <span>Formula: 40% Interest Match + 35% Velocity + 25% Freshness</span>
            <span className="text-emerald-400 font-semibold">● Realtime Adaptive</span>
          </div>
        </div>
      )}

      {/* 5. Feed Stream */}
      <div className="space-y-6">
        {rankedFeed.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0d0d12]/70 p-12 text-center flex flex-col items-center justify-center">
            <div className="size-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-3xl mb-3">
              ✨
            </div>
            <h3 className="font-display text-lg font-bold text-fg">
              {posts.length === 0 ? "Feed is Clean & Ready" : "No posts found"}
            </h3>
            <p className="text-xs text-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
              {posts.length === 0
                ? "All sample posts have been cleared. Be the first creator to drop a fresh meme, thought, or vertical reel on RIFF!"
                : mainTab === "following"
                ? "You haven't followed any creators yet. Switch to 'For You' or follow creators from the feed."
                : "No content matching this category or search query."}
            </p>
            {posts.length === 0 ? (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/create"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-accent/20 hover:opacity-90 transition-all"
                >
                  <Plus className="size-3.5" /> Create Post / Meme
                </Link>
                <Link
                  to="/reel-studio"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-fg hover:bg-white/10 transition-all"
                >
                  <Clapperboard className="size-3.5" /> Reel Studio
                </Link>
              </div>
            ) : mainTab === "following" ? (
              <Button
                size="sm"
                onClick={() => setMainTab("for-you")}
                className="mt-4 rounded-xl bg-accent text-black font-bold"
              >
                Explore For You Feed
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setFilter("all");
                  setSearchQuery("");
                }}
                className="mt-4 rounded-xl bg-accent text-black font-bold"
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          rankedFeed.map((post) => (
            <SocialFeedCard
              key={post.id}
              post={post}
              onTagClick={(tag) => setSearchQuery(tag)}
              onCategoryClick={(catId) => setFilter(catId)}
            />
          ))
        )}
      </div>
    </div>
  </div>
);
}

