import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Crown,
  ExternalLink,
  Film,
  Flame,
  HelpCircle,
  Medal,
  Plus,
  Share2,
  Sparkles,
  Swords,
  ThumbsUp,
  TrendingUp,
  Trophy,
  Upload,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { PersonMark } from "@/components/person-mark";
import { useAuth } from "@/lib/auth-context";
import { useRiff } from "@/lib/store";
import { cn, inr } from "@/lib/utils";
import { fireConfetti } from "@/lib/confetti";
import { playSound } from "@/lib/sounds";
import { toast } from "sonner";
import {
  BATTLE_MATCHUPS,
  fetchAllCompetitions,
  getLeaderboardForCompetition,
  getLocalUserEntries,
  getLocalUserUpvotes,
  saveLocalUserEntry,
  toggleLocalUpvote,
  type BattleMatchup,
  type Competition,
  type LeaderboardEntry,
} from "@/lib/services/competitions";
import { submitToCampaign } from "@/lib/services/campaigns";

export const Route = createFileRoute("/challenge")({
  component: CompetitionsArenaPage,
  head: () => ({
    meta: [
      { title: "Meme Arena & Competitions · RIFF" },
      {
        name: "description",
        content: "Compete in viral meme and reel challenges. Climb the 1st, 2nd, 3rd podium leaderboard and win guaranteed cash prizes.",
      },
    ],
  }),
});

type ArenaTab = "leaderboard" | "battles" | "rules" | "my_entries";

function CompetitionsArenaPage() {
  const { user } = useAuth();
  const profile = useRiff((s) => s.profile);
  const battleStore = useRiff((s) => s.battle);
  const voteBattleStore = useRiff((s) => s.voteBattle);
  const navigate = useNavigate();

  // Data states
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>("comp_bollywood");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ArenaTab>("leaderboard");

  // User submissions & upvotes state
  const [userEntries, setUserEntries] = useState<LeaderboardEntry[]>([]);
  const [upvotesMap, setUpvotesMap] = useState<Record<string, boolean>>({});

  // 1v1 Battle state
  const [currentBattleIndex, setCurrentBattleIndex] = useState(0);
  const [battleVotes, setBattleVotes] = useState<Record<string, "left" | "right">>({});

  // Submission Modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitMediaUrl, setSubmitMediaUrl] = useState("");
  const [submitType, setSubmitType] = useState<"meme" | "reel">("meme");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Time remaining countdown clock
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 3, hours: 14, minutes: 22, seconds: 40 });

  // Load competitions and local storage
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const comps = await fetchAllCompetitions();
        if (mounted) {
          setCompetitions(comps);
          if (comps.length > 0 && !comps.some((c) => c.id === selectedCompId)) {
            setSelectedCompId(comps[0].id);
          }
          setUserEntries(getLocalUserEntries());
          setUpvotesMap(getLocalUserUpvotes());
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const activeCompetition = useMemo(() => {
    return competitions.find((c) => c.id === selectedCompId) || competitions[0] || null;
  }, [competitions, selectedCompId]);

  // Live timer tick
  useEffect(() => {
    if (!activeCompetition?.deadline) return;

    function updateCountdown() {
      const target = new Date(activeCompetition!.deadline).getTime();
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    }

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [activeCompetition?.deadline]);

  // Leaderboard data
  const leaderboard = useMemo(() => {
    if (!activeCompetition) return [];
    return getLeaderboardForCompetition(activeCompetition.id, userEntries);
  }, [activeCompetition, userEntries]);

  const topPodium = useMemo(() => {
    const first = leaderboard.find((e) => e.rank === 1) || null;
    const second = leaderboard.find((e) => e.rank === 2) || null;
    const third = leaderboard.find((e) => e.rank === 3) || null;
    return { first, second, third };
  }, [leaderboard]);

  const remainingLeaderboard = useMemo(() => {
    return leaderboard.filter((e) => e.rank > 3);
  }, [leaderboard]);

  const currentMatchup = useMemo(() => {
    return BATTLE_MATCHUPS[currentBattleIndex % BATTLE_MATCHUPS.length];
  }, [currentBattleIndex]);

  // Handle interactive upvote
  function handleUpvote(entryId: string) {
    const hasUpvoted = upvotesMap[entryId];
    const newStatus = toggleLocalUpvote(entryId);

    setUpvotesMap((prev) => ({ ...prev, [entryId]: newStatus }));

    if (newStatus) {
      playSound("pop");
      fireConfetti(undefined, undefined, 25);
      toast.success("Upvote recorded! Leaderboard score boosted.");
    } else {
      toast("Upvote removed");
    }

    // Update in-memory entry score
    setUserEntries((prev) =>
      prev.map((e) => {
        if (e.id === entryId) {
          const delta = newStatus ? 1 : -1;
          return {
            ...e,
            upvotes: Math.max(0, e.upvotes + delta),
            score: Math.max(0, e.score + delta * 25),
          };
        }
        return e;
      }),
    );
  }

  // Handle Battle Vote
  function handleBattleVote(side: "left" | "right") {
    if (battleVotes[currentMatchup.id]) {
      toast("You already voted in this battle!");
      return;
    }

    setBattleVotes((prev) => ({ ...prev, [currentMatchup.id]: side }));
    voteBattleStore(side);
    playSound("cheer");
    fireConfetti(undefined, undefined, 35);
    toast.success(`Voted for ${side === "left" ? currentMatchup.left.creatorHandle : currentMatchup.right.creatorHandle}!`);
  }

  // Handle Direct Entry Submission
  async function handleSubmitEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!submitTitle.trim()) {
      toast.error("Please enter a caption or punchline.");
      return;
    }

    if (!submitMediaUrl.trim()) {
      toast.error("Please provide a media URL or image/video link.");
      return;
    }

    setIsSubmitting(true);
    try {
      const creatorHandle = profile?.handle || user?.email?.split("@")[0] || "you";
      const creatorName = profile?.name || user?.user_metadata?.name || "Abhishek Gawade";
      const newEntryId = `sub_${Date.now()}`;

      // 1. Submit to server / campaign engine if linked to a brief
      if (activeCompetition) {
        await submitToCampaign({
          campaignId: activeCompetition.id,
          creatorId: user?.id || "user_you",
          contentUrl: submitMediaUrl.trim(),
          externalUrl: submitMediaUrl.trim(),
        });
      }

      // 2. Add to local leaderboard entries
      const newEntry: LeaderboardEntry = {
        id: newEntryId,
        competitionId: activeCompetition?.id || "comp_bollywood",
        rank: leaderboard.length + 1,
        creatorId: user?.id || "user_you",
        creatorHandle,
        creatorName,
        creatorAvatar: profile?.avatarUrl || "/memes/cricket.jpg",
        creatorMark: "you",
        creatorRole: profile?.role || "owner",
        title: submitTitle.trim(),
        mediaUrl: submitMediaUrl.trim(),
        contentType: submitType,
        upvotes: 1,
        views: 120,
        shares: 4,
        score: 350,
        estimatedPrize: 0,
        submittedAt: Date.now(),
        isCurrentUser: true,
      };

      saveLocalUserEntry(newEntry);
      setUserEntries((prev) => [newEntry, ...prev]);

      playSound("cash");
      fireConfetti(undefined, undefined, 50);
      toast.success("Entry submitted to Arena! You are now live on the leaderboard.");

      setIsSubmitModalOpen(false);
      setSubmitTitle("");
      setSubmitMediaUrl("");
      setActiveTab("my_entries");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit entry");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-3 sm:px-6 pt-4 pb-20 text-fg">
      {/* 1. HERO ARENA BANNER */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-surface via-surface/90 to-bg p-5 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 size-72 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 size-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-accent">
                <Flame className="size-3.5 fill-accent text-accent" />
                RIFF ARENA · SEASON 1
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-raised px-2.5 py-1 text-[11px] font-bold text-muted">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                ₹45,000 Total Cash Pool Live
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-fg">
              Creator Competitions
            </h1>
            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Drop viral memes and video reels. Compete on real-time engagement scores, climb the
              1st, 2nd, and 3rd podium ranks, and win direct cash rewards.
            </p>
          </div>

          {/* Quick Action CTA Pill Box */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto shrink-0">
            <Button
              onClick={() => setIsSubmitModalOpen(true)}
              className="flex-1 sm:flex-initial h-12 rounded-2xl bg-[#d4ff00] px-6 text-sm font-black text-black shadow-lg shadow-[#d4ff00]/20 hover:bg-[#b8de00] active:scale-95 transition-all"
            >
              <Plus className="size-4 stroke-[3] mr-1.5" />
              Enter Challenge
            </Button>

            <Link
              to="/reel-studio"
              search={{ mode: "multitrack" }}
              className="flex-1 sm:flex-initial inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-raised px-4 text-xs font-bold text-fg hover:border-accent hover:text-accent transition-colors"
            >
              <Film className="size-4 text-cyan-400" />
              <span>Reel Studio</span>
            </Link>
          </div>
        </div>

        {/* 2. ACTIVE COMPETITIONS CAROUSEL / SELECTOR */}
        <div className="mt-8 pt-6 border-t border-border/80">
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
            <Trophy className="size-3.5 text-accent" />
            Active Contests ({competitions.length})
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {competitions.map((comp) => {
              const isSelected = comp.id === selectedCompId;
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => setSelectedCompId(comp.id)}
                  className={cn(
                    "text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden group cursor-pointer",
                    isSelected
                      ? "border-accent bg-accent/10 shadow-md ring-1 ring-accent/30"
                      : "border-border bg-surface/60 hover:bg-surface hover:border-border/80",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-accent truncate">
                      {comp.sponsor}
                    </span>
                    <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] font-bold text-fg tabular-nums shrink-0">
                      {inr(comp.totalPrize)}
                    </span>
                  </div>

                  <h2 className="text-sm font-bold text-fg line-clamp-1 group-hover:text-accent transition-colors">
                    {comp.title}
                  </h2>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                    <span>{comp.entryCount} Entries</span>
                    <span className="text-accent font-semibold">{comp.category}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. ACTIVE COMPETITION SPOTLIGHT & COUNTDOWN */}
      {activeCompetition && (
        <section className="mt-6 rounded-3xl border border-border bg-surface p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Left: Info */}
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge tone="accent" className="text-xs font-black uppercase">
                  {activeCompetition.category}
                </Badge>
                <span className="text-xs font-semibold text-muted">
                  Sponsor: <strong className="text-fg">{activeCompetition.sponsor}</strong>
                </span>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-black text-fg">
                {activeCompetition.title}
              </h2>

              <p className="text-xs sm:text-sm text-muted">
                {activeCompetition.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <span className="text-xs font-bold text-accent">
                  Hashtag: <code className="bg-raised px-2 py-0.5 rounded-md">{activeCompetition.hashtag}</code>
                </span>
                <span className="text-xs text-muted">·</span>
                <span className="text-xs text-muted">
                  Allowed Content: <strong className="text-fg capitalize">{activeCompetition.contentType}</strong>
                </span>
              </div>
            </div>

            {/* Right: Live Countdown Clock & Prize Cards */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col items-center sm:items-stretch gap-4 shrink-0">
              {/* Countdown Clock Box */}
              <div className="w-full rounded-2xl border border-border bg-raised/80 p-3.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted mb-2">
                  <Clock className="size-3.5 text-accent animate-spin" />
                  <span>Competition Deadline</span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl bg-surface px-2 py-1.5 border border-border">
                    <span className="font-display text-lg font-black text-fg tabular-nums">
                      {String(timeLeft.days).padStart(2, "0")}
                    </span>
                    <p className="text-[9px] uppercase font-bold text-muted">Days</p>
                  </div>
                  <div className="rounded-xl bg-surface px-2 py-1.5 border border-border">
                    <span className="font-display text-lg font-black text-fg tabular-nums">
                      {String(timeLeft.hours).padStart(2, "0")}
                    </span>
                    <p className="text-[9px] uppercase font-bold text-muted">Hours</p>
                  </div>
                  <div className="rounded-xl bg-surface px-2 py-1.5 border border-border">
                    <span className="font-display text-lg font-black text-fg tabular-nums">
                      {String(timeLeft.minutes).padStart(2, "0")}
                    </span>
                    <p className="text-[9px] uppercase font-bold text-muted">Mins</p>
                  </div>
                  <div className="rounded-xl bg-surface px-2 py-1.5 border border-border">
                    <span className="font-display text-lg font-black text-accent tabular-nums">
                      {String(timeLeft.seconds).padStart(2, "0")}
                    </span>
                    <p className="text-[9px] uppercase font-bold text-muted">Secs</p>
                  </div>
                </div>
              </div>

              {/* Prize Breakdown Mini Bar */}
              <div className="w-full grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2">
                  <span className="text-[10px] font-black text-amber-400 block">🥇 1st Prize</span>
                  <span className="font-display font-bold text-fg tabular-nums">
                    {inr(activeCompetition.prizeFirst)}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-400/30 bg-slate-400/10 p-2">
                  <span className="text-[10px] font-black text-slate-300 block">🥈 2nd Prize</span>
                  <span className="font-display font-bold text-fg tabular-nums">
                    {inr(activeCompetition.prizeSecond)}
                  </span>
                </div>
                <div className="rounded-xl border border-amber-700/30 bg-amber-700/10 p-2">
                  <span className="text-[10px] font-black text-amber-500 block">🥉 3rd Prize</span>
                  <span className="font-display font-bold text-fg tabular-nums">
                    {inr(activeCompetition.prizeThird)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. SUB-NAVIGATION TABS */}
      <div className="mt-8 flex items-center gap-2 border-b border-border pb-3 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("leaderboard")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
            activeTab === "leaderboard"
              ? "bg-accent text-accent-fg shadow-sm"
              : "bg-surface text-muted hover:text-fg hover:bg-raised",
          )}
        >
          <Trophy className="size-4" />
          <span>Podium & Standings</span>
          <span className="rounded-full bg-black/20 dark:bg-white/20 px-1.5 py-0.2 text-[10px]">
            {leaderboard.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("battles")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
            activeTab === "battles"
              ? "bg-accent text-accent-fg shadow-sm"
              : "bg-surface text-muted hover:text-fg hover:bg-raised",
          )}
        >
          <Swords className="size-4" />
          <span>1v1 Meme Battles</span>
          <span className="rounded-full bg-red-500/20 text-red-500 px-1.5 py-0.2 text-[10px] font-black">
            LIVE
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
            activeTab === "rules"
              ? "bg-accent text-accent-fg shadow-sm"
              : "bg-surface text-muted hover:text-fg hover:bg-raised",
          )}
        >
          <HelpCircle className="size-4" />
          <span>Rules & Scoring</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("my_entries")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
            activeTab === "my_entries"
              ? "bg-accent text-accent-fg shadow-sm"
              : "bg-surface text-muted hover:text-fg hover:bg-raised",
          )}
        >
          <UserCheck className="size-4" />
          <span>My Submissions</span>
          {userEntries.length > 0 && (
            <span className="rounded-full bg-emerald-500 text-white px-1.5 py-0.2 text-[10px] font-black">
              {userEntries.length}
            </span>
          )}
        </button>
      </div>

      {/* 5. TAB VIEW: PODIUM & LEADERBOARD */}
      {activeTab === "leaderboard" && (
        <section className="mt-6 space-y-8">
          {/* THE 3D ESPORTS PODIUM */}
          <div className="rounded-3xl border border-border bg-gradient-to-b from-surface to-bg p-4 sm:p-8">
            <div className="text-center mb-6">
              <span className="text-[11px] font-black uppercase tracking-wider text-accent">
                Leaderboard Podium
              </span>
              <h3 className="font-display text-xl sm:text-2xl font-black text-fg">
                Top 3 Contenders
              </h3>
              <p className="text-xs text-muted mt-1">
                Live rankings calculated from upvotes, video views, and community shares
              </p>
            </div>

            {/* Podium Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end max-w-4xl mx-auto pt-4">
              {/* 🥈 2ND PLACE (SILVER) */}
              {topPodium.second && (
                <div className="order-2 md:order-1 flex flex-col items-center">
                  {/* Card */}
                  <div className="w-full rounded-2xl border border-slate-400/40 bg-surface/90 p-4 shadow-lg text-center relative overflow-hidden group hover:border-slate-300 transition-all">
                    <div className="absolute top-2 left-2 size-7 rounded-full bg-slate-300/20 flex items-center justify-center font-black text-xs text-slate-300 border border-slate-300/40">
                      2
                    </div>

                    <div className="flex justify-center mb-3">
                      <PersonMark mark={topPodium.second.creatorMark} size="lg" />
                    </div>

                    <p className="text-xs font-bold text-fg truncate">
                      @{topPodium.second.creatorHandle}
                    </p>
                    <p className="text-[11px] text-muted line-clamp-1 mt-0.5">
                      {topPodium.second.title}
                    </p>

                    {/* Preview Thumbnail */}
                    <div className="mt-2.5 h-24 w-full rounded-xl overflow-hidden bg-black/40 border border-border relative">
                      <img
                        src={topPodium.second.mediaUrl}
                        alt={topPodium.second.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border">
                      <span className="text-muted tabular-nums">
                        {topPodium.second.upvotes} upvotes
                      </span>
                      <span className="font-bold text-slate-300">
                        {inr(topPodium.second.estimatedPrize)}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleUpvote(topPodium.second!.id)}
                      className="mt-2.5 w-full h-8 text-xs rounded-xl bg-raised border border-border hover:border-accent text-fg"
                    >
                      <ThumbsUp className="size-3 mr-1" />
                      Upvote
                    </Button>
                  </div>

                  {/* Pedestal Base */}
                  <div className="hidden md:flex w-full h-12 bg-gradient-to-t from-slate-600/30 to-slate-500/10 rounded-b-2xl border-x border-b border-slate-400/30 items-center justify-center">
                    <span className="text-xs font-black text-slate-300 tracking-wider">
                      🥈 2ND PLACE
                    </span>
                  </div>
                </div>
              )}

              {/* 🥇 1ST PLACE (GOLD) - ELEVATED */}
              {topPodium.first && (
                <div className="order-1 md:order-2 flex flex-col items-center">
                  {/* Card */}
                  <div className="w-full rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-500/10 via-surface to-surface p-5 shadow-2xl text-center relative overflow-hidden group hover:border-amber-300 transition-all ring-4 ring-amber-400/20">
                    {/* Crown badge */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-black">
                      <Crown className="size-3 fill-black" />
                      RANK 1
                    </div>

                    <div className="flex justify-center mb-3">
                      <div className="relative">
                        <PersonMark mark={topPodium.first.creatorMark} size="lg" />
                        <span className="absolute -top-3 -right-2 text-xl animate-bounce">👑</span>
                      </div>
                    </div>

                    <p className="text-sm font-black text-fg truncate">
                      @{topPodium.first.creatorHandle}
                    </p>
                    <p className="text-xs text-muted line-clamp-1 mt-0.5">
                      {topPodium.first.title}
                    </p>

                    {/* Preview Thumbnail */}
                    <div className="mt-3 h-32 w-full rounded-xl overflow-hidden bg-black/40 border border-amber-400/40 relative">
                      <img
                        src={topPodium.first.mediaUrl}
                        alt={topPodium.first.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-amber-400/30">
                      <span className="text-muted tabular-nums">
                        {topPodium.first.upvotes} upvotes
                      </span>
                      <span className="font-black text-amber-400 text-sm">
                        {inr(topPodium.first.estimatedPrize)}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleUpvote(topPodium.first!.id)}
                      className="mt-3 w-full h-9 text-xs rounded-xl bg-amber-400 font-bold text-black hover:bg-amber-300"
                    >
                      <ThumbsUp className="size-3.5 mr-1" />
                      Boost Champion
                    </Button>
                  </div>

                  {/* Pedestal Base */}
                  <div className="hidden md:flex w-full h-20 bg-gradient-to-t from-amber-500/30 to-amber-500/10 rounded-b-2xl border-x border-b border-amber-400/40 items-center justify-center">
                    <span className="text-sm font-black text-amber-400 tracking-wider">
                      🥇 1ST PLACE
                    </span>
                  </div>
                </div>
              )}

              {/* 🥉 3RD PLACE (BRONZE) */}
              {topPodium.third && (
                <div className="order-3 flex flex-col items-center">
                  {/* Card */}
                  <div className="w-full rounded-2xl border border-amber-700/40 bg-surface/90 p-4 shadow-lg text-center relative overflow-hidden group hover:border-amber-600 transition-all">
                    <div className="absolute top-2 left-2 size-7 rounded-full bg-amber-700/20 flex items-center justify-center font-black text-xs text-amber-500 border border-amber-700/40">
                      3
                    </div>

                    <div className="flex justify-center mb-3">
                      <PersonMark mark={topPodium.third.creatorMark} size="lg" />
                    </div>

                    <p className="text-xs font-bold text-fg truncate">
                      @{topPodium.third.creatorHandle}
                    </p>
                    <p className="text-[11px] text-muted line-clamp-1 mt-0.5">
                      {topPodium.third.title}
                    </p>

                    {/* Preview Thumbnail */}
                    <div className="mt-2.5 h-24 w-full rounded-xl overflow-hidden bg-black/40 border border-border relative">
                      <img
                        src={topPodium.third.mediaUrl}
                        alt={topPodium.third.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border">
                      <span className="text-muted tabular-nums">
                        {topPodium.third.upvotes} upvotes
                      </span>
                      <span className="font-bold text-amber-500">
                        {inr(topPodium.third.estimatedPrize)}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleUpvote(topPodium.third!.id)}
                      className="mt-2.5 w-full h-8 text-xs rounded-xl bg-raised border border-border hover:border-accent text-fg"
                    >
                      <ThumbsUp className="size-3 mr-1" />
                      Upvote
                    </Button>
                  </div>

                  {/* Pedestal Base */}
                  <div className="hidden md:flex w-full h-8 bg-gradient-to-t from-amber-800/30 to-amber-700/10 rounded-b-2xl border-x border-b border-amber-700/30 items-center justify-center">
                    <span className="text-[11px] font-black text-amber-500 tracking-wider">
                      🥉 3RD PLACE
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* EXTENDED STANDINGS TABLE (RANKS 4+) */}
          <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6 shadow-xl">
            <h4 className="font-display text-lg font-bold text-fg mb-4 flex items-center gap-2">
              <Medal className="size-4 text-accent" />
              Complete Standings (Ranks 4 - {leaderboard.length})
            </h4>

            <div className="divide-y divide-border/60">
              {remainingLeaderboard.map((entry) => {
                const hasUpvoted = upvotesMap[entry.id];
                return (
                  <div
                    key={entry.id}
                    className="py-3.5 flex items-center justify-between gap-3 hover:bg-raised/40 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="size-7 rounded-lg bg-raised flex items-center justify-center text-xs font-black text-muted shrink-0">
                        #{entry.rank}
                      </span>

                      <div className="relative shrink-0">
                        <PersonMark mark={entry.creatorMark} size="sm" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-fg truncate">
                            @{entry.creatorHandle}
                          </p>
                          {entry.isCurrentUser && (
                            <span className="rounded-full bg-accent/20 text-accent border border-accent/40 px-1.5 py-0.2 text-[9px] font-black">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted truncate max-w-xs sm:max-w-md">
                          {entry.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-fg tabular-nums">
                          {entry.score} pts
                        </p>
                        <p className="text-[10px] text-muted tabular-nums">
                          {entry.views.toLocaleString()} views
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpvote(entry.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                          hasUpvoted
                            ? "bg-accent text-accent-fg"
                            : "bg-raised border border-border text-muted hover:text-fg hover:border-accent",
                        )}
                      >
                        <ThumbsUp className="size-3" />
                        <span>{entry.upvotes}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 6. TAB VIEW: 1v1 BATTLES */}
      {activeTab === "battles" && (
        <section className="mt-6 space-y-6">
          <div className="rounded-3xl border border-border bg-gradient-to-b from-surface via-surface to-bg p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-400">
                  <Swords className="size-3" />
                  HEAD-TO-HEAD DUEL
                </span>
                <h3 className="font-display text-2xl font-black text-fg mt-1">
                  {currentMatchup.title}
                </h3>
                <p className="text-xs text-muted">
                  Vote for the crispiest meme. Winner takes the community duel spotlight!
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentBattleIndex((prev) => prev + 1)}
                className="rounded-xl border-border hover:border-accent text-xs"
              >
                Next Matchup →
              </Button>
            </div>

            {/* Duel Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              {/* Central VS Badge */}
              <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 size-12 rounded-full bg-black border-2 border-accent items-center justify-center font-display font-black text-accent text-sm shadow-xl shadow-accent/20">
                VS
              </div>

              {/* LEFT CONTENDER */}
              <div
                className={cn(
                  "rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all relative overflow-hidden",
                  battleVotes[currentMatchup.id] === "left"
                    ? "border-accent bg-accent/10 ring-2 ring-accent"
                    : "border-border bg-surface hover:border-border/80",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-muted">
                      @{currentMatchup.left.creatorHandle}
                    </span>
                    <span className="text-xs font-bold text-fg tabular-nums">
                      {currentMatchup.left.votes + (battleVotes[currentMatchup.id] === "left" ? 1 : 0)} votes
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-fg line-clamp-2 mb-3">
                    {currentMatchup.left.title}
                  </h4>

                  <div className="h-52 w-full rounded-xl overflow-hidden bg-black/40 border border-border">
                    <img
                      src={currentMatchup.left.mediaUrl}
                      alt={currentMatchup.left.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => handleBattleVote("left")}
                  disabled={Boolean(battleVotes[currentMatchup.id])}
                  className="mt-4 w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white shadow hover:opacity-90 active:scale-95 transition-all"
                >
                  {battleVotes[currentMatchup.id] === "left" ? "✓ Your Pick" : "Vote Left Meme"}
                </Button>
              </div>

              {/* RIGHT CONTENDER */}
              <div
                className={cn(
                  "rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all relative overflow-hidden",
                  battleVotes[currentMatchup.id] === "right"
                    ? "border-accent bg-accent/10 ring-2 ring-accent"
                    : "border-border bg-surface hover:border-border/80",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-muted">
                      @{currentMatchup.right.creatorHandle}
                    </span>
                    <span className="text-xs font-bold text-fg tabular-nums">
                      {currentMatchup.right.votes + (battleVotes[currentMatchup.id] === "right" ? 1 : 0)} votes
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-fg line-clamp-2 mb-3">
                    {currentMatchup.right.title}
                  </h4>

                  <div className="h-52 w-full rounded-xl overflow-hidden bg-black/40 border border-border">
                    <img
                      src={currentMatchup.right.mediaUrl}
                      alt={currentMatchup.right.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => handleBattleVote("right")}
                  disabled={Boolean(battleVotes[currentMatchup.id])}
                  className="mt-4 w-full h-11 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 font-bold text-white shadow hover:opacity-90 active:scale-95 transition-all"
                >
                  {battleVotes[currentMatchup.id] === "right" ? "✓ Your Pick" : "Vote Right Meme"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 7. TAB VIEW: RULES & SCORING */}
      {activeTab === "rules" && (
        <section className="mt-6 space-y-6">
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h3 className="font-display text-2xl font-black text-fg">
                Official Competition Rules & Guidelines
              </h3>
              <p className="text-xs text-muted mt-1">
                Fair play, anti-sybil protections, and automated payout distributions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-raised p-4 space-y-2">
                <div className="size-8 rounded-lg bg-accent/20 flex items-center justify-center font-bold text-accent">
                  1
                </div>
                <h4 className="text-sm font-bold text-fg">Original Riffs Only</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Submissions pass through an anti-plagiarism perceptual hash filter. Exact copies
                  or reposts are auto-flagged and disqualified.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-raised p-4 space-y-2">
                <div className="size-8 rounded-lg bg-cyan-500/20 flex items-center justify-center font-bold text-cyan-400">
                  2
                </div>
                <h4 className="text-sm font-bold text-fg">Engagement Scoring</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Final score is calculated from unique upvotes (40%), verified view count (35%),
                  and organic community shares (25%).
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-raised p-4 space-y-2">
                <div className="size-8 rounded-lg bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400">
                  3
                </div>
                <h4 className="text-sm font-bold text-fg">Guaranteed Instant Payout</h4>
                <p className="text-xs text-muted leading-relaxed">
                  When the live countdown timer hits zero, the top 3 spots on the podium are locked
                  and cash prizes are credited straight to creator balances.
                </p>
              </div>
            </div>

            {/* Rules list */}
            {activeCompetition?.rules && (
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-bold text-fg mb-3">
                  Specific Contest Criteria ({activeCompetition.title})
                </h4>
                <ul className="space-y-2">
                  {activeCompetition.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-muted">
                      <CheckCircle2 className="size-4 text-accent shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 8. TAB VIEW: MY ENTRIES */}
      {activeTab === "my_entries" && (
        <section className="mt-6 space-y-6">
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-fg">
                  My Challenge Entries
                </h3>
                <p className="text-xs text-muted">
                  Track the performance and live ranking of your drops in active competitions.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsSubmitModalOpen(true)}
                className="rounded-xl bg-accent text-accent-fg font-bold text-xs"
              >
                <Plus className="size-3.5 mr-1" />
                Submit New Entry
              </Button>
            </div>

            {userEntries.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-2xl">
                <Trophy className="size-10 text-muted mx-auto mb-3 opacity-60" />
                <p className="text-sm font-bold text-fg">No entries submitted yet</p>
                <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-4">
                  Drop your first meme or reel in this competition to compete for the ₹20,000 cash pool!
                </p>
                <Button
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="rounded-xl bg-[#d4ff00] text-black font-black text-xs"
                >
                  Enter Challenge Now
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {userEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 rounded-xl overflow-hidden bg-black/40 border border-border shrink-0">
                        <img
                          src={entry.mediaUrl}
                          alt={entry.title}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-accent/20 text-accent px-2 py-0.5 text-[10px] font-black uppercase">
                            Rank #{entry.rank}
                          </span>
                          <span className="text-xs font-semibold text-muted">
                            {new Date(entry.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-fg mt-1">
                          {entry.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-muted mt-1">
                          <span>{entry.upvotes} upvotes</span>
                          <span>·</span>
                          <span>{entry.views} views</span>
                          <span>·</span>
                          <span className="text-accent font-bold">{entry.score} pts</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpvote(entry.id)}
                        className="rounded-xl text-xs"
                      >
                        <ThumbsUp className="size-3 mr-1" />
                        Upvote ({entry.upvotes})
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 9. SUBMIT CONTEST ENTRY MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-muted hover:text-fg rounded-lg"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent">
                {activeCompetition?.category || "Arena"}
              </span>
              <span className="text-xs text-muted">
                {activeCompetition?.hashtag || "#RiffDrop"}
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-fg">
              Enter {activeCompetition?.title || "Competition"}
            </h3>
            <p className="text-xs text-muted mt-1">
              Submit your meme or video reel to compete for the podium cash prize.
            </p>

            <form onSubmit={handleSubmitEntry} className="mt-5 space-y-4">
              {/* Submission Mode Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitType("meme")}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer",
                    submitType === "meme"
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-raised text-muted hover:text-fg",
                  )}
                >
                  Meme Image Drop
                </button>
                <button
                  type="button"
                  onClick={() => setSubmitType("reel")}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer",
                    submitType === "reel"
                      ? "border-cyan-400 bg-cyan-400/15 text-cyan-400"
                      : "border-border bg-raised text-muted hover:text-fg",
                  )}
                >
                  Video Reel / 9:16
                </button>
              </div>

              {/* Title / Caption */}
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Punchline / Caption *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. When the client approves on first revision..."
                  value={submitTitle}
                  onChange={(e) => setSubmitTitle(e.target.value)}
                  className="rounded-xl border-border bg-raised text-xs"
                />
              </div>

              {/* Media URL / Upload link */}
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Media URL or Image Link *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. /memes/desk.jpg or https://... (Instagram / Video link)"
                  value={submitMediaUrl}
                  onChange={(e) => setSubmitMediaUrl(e.target.value)}
                  className="rounded-xl border-border bg-raised text-xs"
                />
                <p className="text-[11px] text-muted mt-1">
                  Tip: You can use existing templates like <code>/memes/desk.jpg</code>, <code>/memes/cricket.jpg</code>, or an Instagram Reel link.
                </p>
              </div>

              {/* Studio Shortcut Jump Buttons */}
              <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                <Link
                  to="/reel-studio"
                  search={{ mode: "multitrack" }}
                  className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Film className="size-3" />
                  <span>Open in Reel Studio first</span>
                </Link>

                <Link
                  to="/studio"
                  search={{ brief: activeCompetition?.id }}
                  className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1"
                >
                  <Sparkles className="size-3" />
                  <span>Open in Meme Studio</span>
                </Link>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="flex-1 rounded-xl border-border text-xs"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-[#d4ff00] text-black font-black text-xs hover:bg-[#b8de00]"
                >
                  {isSubmitting ? "Submitting..." : "Submit to Arena 🚀"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
