import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  DollarSign,
  ExternalLink,
  Flame,
  Gift,
  Grid,
  Heart,
  Instagram,
  Lock,
  MessageCircle,
  Pencil,
  Play,
  Plus,
  Share2,
  Shield,
  Sparkles,
  TrendingUp,
  Trophy,
  UserCheck,
  UserPlus,
  Wallet,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { PersonMark } from "@/components/person-mark";
import { DailyRewardModal } from "@/components/daily-reward-modal";
import { StreakButton } from "@/components/streak-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { playSound } from "@/lib/sounds";
import { fireConfetti } from "@/lib/confetti";
import { useRiff } from "@/lib/store";
import { evaluateStreakStatus, getTimeUntilNextMidnight, DAILY_REWARD_TIERS } from "@/lib/streaks";
import type { Post, WithdrawalRequest } from "@/lib/types";
import { requestWithdrawalServerFn } from "@/lib/riff-data";
import { cn, formatNumber, inr } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/you")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile & Points Wallet · RIFF" }] }),
});

type ProfileTab = "posts" | "reels" | "saved" | "wallet";

function ProfilePage() {
  const rawProfile = useRiff((s) => s.profile);
  const profile = rawProfile || {
    name: "You",
    handle: "you",
    bio: "Memes, tech bugs & midnight reels. Building popularity on RIFF.",
    instagramHandle: "you_on_riff",
    role: "creator",
    followers: 12480,
    following: 482,
  };
  const setProfile = useRiff((s) => s.setProfile);
  const posts = useRiff((s) => s.posts);
  const pendingSubmissions = useRiff((s) => s.pendingSubmissions);
  const rejectedSubmissions = useRiff((s) => s.rejectedSubmissions) || [];
  const categories = useRiff((s) => s.categories) || [];
  const savedPostIds = useRiff((s) => s.savedPostIds);
  const pointsWallet = useRiff((s) => s.pointsWallet);
  const pointsTransactions = useRiff((s) => s.pointsTransactions);
  const creatorPopularity = useRiff((s) => s.creatorPopularity);
  const withdrawals = useRiff((s) => s.withdrawals) || [];
  const requestWithdrawal = useRiff((s) => s.requestWithdrawal);
  const platformControls = useRiff((s) => s.platformControls) || {
    emergencyWalletFreeze: false,
    pointConversionRate: 0.5,
    minWithdrawalThreshold: 100,
    maxDailyWithdrawalLimit: 10000,
    payoutProcessingFeePercent: 2,
  };

  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");

  // Cashout Modal State
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [cashoutAmount, setCashoutAmount] = useState(platformControls.minWithdrawalThreshold ?? 100);
  const [cashoutMethod, setCashoutMethod] = useState<"upi" | "bank_transfer">("upi");
  const [cashoutUpiId, setCashoutUpiId] = useState("");
  const [cashoutAccountNo, setCashoutAccountNo] = useState("");
  const [cashoutIfsc, setCashoutIfsc] = useState("");
  const [cashoutHolderName, setCashoutHolderName] = useState(profile.name || "");

  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showPopularityModal, setShowPopularityModal] = useState(false);
  const [showDailyRewardModal, setShowDailyRewardModal] = useState(false);
  const streak = useRiff((s) => s.streak);
  const claimDailyReward = useRiff((s) => s.claimDailyReward);
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [instagram, setInstagram] = useState(profile.instagramHandle || "");

  function handleClaimDailyReward() {
    const res = claimDailyReward();
    if (res.success) {
      playSound("cheer");
      playSound("cash");
      if (typeof window !== "undefined") {
        fireConfetti(window.innerWidth / 2, window.innerHeight / 2, 50);
      }
      toast.success(res.message, {
        description: `+${res.pointsAwarded} RIFF Points added to your private wallet!`,
      });
    } else {
      toast.info(res.message);
    }
  }

  function handleCashoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cashoutAmount <= 0) return;

    if (cashoutMethod === "upi" && !cashoutUpiId.trim()) {
      toast.error("Please enter a valid UPI VPA address.");
      return;
    }
    if (cashoutMethod === "bank_transfer" && (!cashoutAccountNo.trim() || !cashoutIfsc.trim())) {
      toast.error("Please enter account number and IFSC code.");
      return;
    }

    const details =
      cashoutMethod === "upi"
        ? { upiId: cashoutUpiId.trim() }
        : {
            accountNumber: cashoutAccountNo.trim(),
            ifsc: cashoutIfsc.trim().toUpperCase(),
            holderName: cashoutHolderName.trim() || profile.name,
          };

    const res = requestWithdrawal({
      amount: Number(cashoutAmount),
      method: cashoutMethod,
      details,
    });

    if (res.success) {
      playSound("cheer");
      toast.success(res.message);
      setShowCashoutModal(false);

      requestWithdrawalServerFn({
        data: {
          amount: Number(cashoutAmount),
          method: cashoutMethod,
          details,
        },
      }).catch(() => {});
    } else {
      toast.error(res.message);
    }
  }

  const myWithdrawals = withdrawals.filter(
    (w) => w.userHandle === profile.handle || w.userId === profile.handle || w.userId === "you",
  );

  // Content Filtering
  const myPosts = posts.filter(
    (p) => p.authorHandle === profile.handle || p.authorId === "you" || p.authorId === profile.handle,
  );
  const myApprovedPosts = myPosts.filter((p) => p.type === "post");
  const myApprovedReels = myPosts.filter((p) => p.type === "reel");
  const myPending = pendingSubmissions.filter(
    (p) => p.authorHandle === profile.handle || p.authorId === "you" || p.authorId === profile.handle,
  );
  const myRejected = rejectedSubmissions.filter(
    (p) => p.authorHandle === profile.handle || p.authorId === "you" || p.authorId === profile.handle,
  );
  const savedPosts = posts.filter((p) => savedPostIds.includes(p.id));

  // Compute breakdown metrics
  const approvedPostsPoints = pointsTransactions
    .filter((t) => t.contentType === "post")
    .reduce((acc, t) => acc + t.amount, 0);
  const approvedReelsPoints = pointsTransactions
    .filter((t) => t.contentType === "reel")
    .reduce((acc, t) => acc + t.amount, 0);

  // Compute total engagement metrics for Popularity breakdown
  const totalLikes = myPosts.reduce((acc, p) => acc + (p.likes || 0), 0);
  const totalViews = myPosts.reduce((acc, p) => acc + (p.views || 0), 0);
  const totalComments = myPosts.reduce((acc, p) => acc + (p.comments || 0), 0);
  const totalShares = myPosts.reduce((acc, p) => acc + (p.shares || 0), 0);
  const totalSaves = myPosts.reduce((acc, p) => acc + (p.saves || 0), 0);

  const role = profile.role || "creator";
  const warnings = profile.warningsCount || 0;
  const isAdminRole = role === "admin" || role === "super_admin" || role === "owner";

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const cleanHandle = handle.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanHandle) {
      toast.error("Please enter a valid unique username.");
      return;
    }

    setProfile({
      name: name.trim(),
      handle: cleanHandle,
      bio: bio.trim(),
      instagramHandle: instagram.replace("@", "").trim(),
    });

    playSound("pop");
    toast.success("Profile updated successfully!");
    setShowEditModal(false);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-20">
      {/* 1. Instagram-Style Profile Header */}
      <header className="rounded-3xl border border-white/10 bg-surface/90 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative">
            <PersonMark mark="you" size="lg" />
            <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] text-black font-black shadow-md">
              ⚡
            </span>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h1 className="font-display text-xl font-bold text-fg">{profile.name}</h1>
                  <CheckCircle2 className="size-4 text-accent fill-accent/20" />
                  {/* Dynamic Role Badge */}
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase border tracking-wider",
                      role === "owner" && "bg-purple-500/20 border-purple-500/40 text-purple-300",
                      role === "super_admin" && "bg-amber-500/20 border-amber-500/40 text-amber-300",
                      role === "admin" && "bg-sky-500/20 border-sky-500/40 text-sky-300",
                      role === "creator" && "bg-accent/15 border-accent/30 text-accent",
                    )}
                  >
                    {role.replace("_", " ")}
                  </span>
                  {warnings > 0 && (
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[9px] font-mono font-black text-amber-300">
                      ⚠️ {warnings}/5 Warnings
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-muted mt-0.5">@{profile.handle}</p>
              </div>

              <div className="flex items-center justify-center gap-2 flex-wrap">
                {isAdminRole && (
                  <Link to="/admin">
                    <Button
                      size="sm"
                      className="rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                    >
                      <Shield className="size-3.5" />
                      <span>Admin Console</span>
                    </Button>
                  </Link>
                )}

                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => setShowEditModal(true)}
                  className="rounded-xl border border-white/10 text-xs font-bold gap-1.5"
                >
                  <Pencil className="size-3" />
                  <span>Edit Profile</span>
                </Button>

                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => {
                    navigator.clipboard?.writeText(`${window.location.origin}/@${profile.handle}`);
                    toast.success("Profile link copied to clipboard!");
                  }}
                  className="rounded-xl border border-white/10 text-xs font-bold"
                >
                  <Share2 className="size-3" />
                </Button>
              </div>
            </div>

            {/* Instagram Connection Pill */}
            {profile.instagramHandle && (
              <a
                href={`https://instagram.com/${profile.instagramHandle}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-semibold text-pink-400 hover:bg-pink-500/20 transition-colors"
              >
                <Instagram className="size-3.5" />
                <span>@{profile.instagramHandle}</span>
                <ExternalLink className="size-2.5 opacity-60" />
              </a>
            )}

            <p className="text-xs text-muted max-w-lg leading-relaxed">
              {profile.bio || "Meme creator & cultural remixer on RIFF."}
            </p>

            {/* 6 Distinct Profile Statistics */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t border-white/5 text-center">
              <div className="p-2 rounded-2xl bg-raised/40 border border-white/5">
                <p className="font-display text-base font-black text-fg">{myPosts.length}</p>
                <p className="text-[10px] text-muted">Posts</p>
              </div>
              <div className="p-2 rounded-2xl bg-raised/40 border border-white/5">
                <p className="font-display text-base font-black text-fg">
                  {formatNumber(profile.followers || 12480)}
                </p>
                <p className="text-[10px] text-muted">Followers</p>
              </div>
              <div className="p-2 rounded-2xl bg-raised/40 border border-white/5">
                <p className="font-display text-base font-black text-fg">
                  {formatNumber(profile.following || 482)}
                </p>
                <p className="text-[10px] text-muted">Following</p>
              </div>
              {/* Creator Popularity (Formula based) */}
              <div
                onClick={() => setShowPopularityModal(true)}
                className="cursor-pointer p-2 rounded-2xl bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/15 transition-all"
                title="Click to view Popularity Score Breakdown & Algorithm Weights"
              >
                <p className="font-display text-base font-black text-orange-400 flex items-center justify-center gap-0.5">
                  <Flame className="size-3.5 fill-orange-400 inline" />
                  {(creatorPopularity / 1000).toFixed(1)}K
                </p>
                <p className="text-[10px] text-orange-300/80 font-medium">Popularity ⓘ</p>
              </div>
              {/* Daily Streak Badge */}
              <div
                onClick={() => setShowDailyRewardModal(true)}
                className="cursor-pointer p-2 rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/10 border border-orange-500/30 hover:border-orange-500 transition-all text-center group"
                title="Daily Login Streak & Free Points"
              >
                <p className="font-display text-base font-black text-orange-400 flex items-center justify-center gap-0.5">
                  <Flame className="size-3.5 fill-orange-400 inline" />
                  {streak?.currentStreak || 0}d
                </p>
                <p className="text-[10px] text-orange-300/80 font-medium flex items-center justify-center gap-1">
                  <span>Streak</span>
                  {evaluateStreakStatus(streak).canClaim && (
                    <span className="text-[8px] bg-[#d4ff00] text-black px-1 rounded font-black animate-pulse">Claim</span>
                  )}
                </p>
              </div>
              {/* Creator RIFF Points Wallet Balance (100% Private) */}
              <div
                onClick={() => setActiveTab("wallet")}
                className="cursor-pointer p-2 rounded-2xl bg-accent/15 border border-accent/30 hover:border-accent transition-all"
                title="Your Private Wallet - Only you can see this"
              >
                <p className="font-display text-base font-black text-accent flex items-center justify-center gap-0.5">
                  <Zap className="size-3.5 fill-accent inline" />
                  {pointsWallet.toLocaleString()}
                </p>
                <p className="text-[10px] text-accent/80 font-medium flex items-center justify-center gap-1">
                  <span>Points</span>
                  <span className="text-[8px] bg-accent/20 px-1 rounded text-accent font-bold flex items-center gap-0.5">
                    <Lock className="size-2" /> Private
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Profile Tabs: Posts | Reels | Saved | RIFF Points */}
      <div className="flex items-center justify-around border-b border-white/10 mt-6 pb-2 text-xs font-bold text-muted">
        <button
          type="button"
          onClick={() => setActiveTab("posts")}
          className={cn(
            "flex items-center gap-2 pb-2 transition-all relative",
            activeTab === "posts"
              ? "text-fg after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-accent"
              : "hover:text-fg",
          )}
        >
          <Grid className="size-4" />
          <span>Posts ({myApprovedPosts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reels")}
          className={cn(
            "flex items-center gap-2 pb-2 transition-all relative",
            activeTab === "reels"
              ? "text-fg after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-accent"
              : "hover:text-fg",
          )}
        >
          <Play className="size-4" />
          <span>Reels ({myApprovedReels.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={cn(
            "flex items-center gap-2 pb-2 transition-all relative",
            activeTab === "saved"
              ? "text-fg after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-accent"
              : "hover:text-fg",
          )}
        >
          <Bookmark className="size-4" />
          <span>Saved ({savedPosts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("wallet")}
          className={cn(
            "flex items-center gap-1.5 pb-2 transition-all relative",
            activeTab === "wallet"
              ? "text-accent after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-accent"
              : "hover:text-fg",
          )}
        >
          <Zap className="size-4 fill-accent/20" />
          <span>Points Wallet</span>
          <span className="flex items-center gap-0.5 rounded bg-accent/15 px-1 py-0.2 text-[9px] text-accent font-bold" title="Only you can see your wallet">
            <Lock className="size-2.5" /> Private
          </span>
        </button>
      </div>

      {/* 3. Under Review & Rejection Status Banner */}
      {(myPending.length > 0 || myRejected.length > 0) && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-surface/90 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5 flex-wrap">
            {myPending.length > 0 && (
              <span className="flex items-center gap-1.5 text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl">
                <Clock className="size-3.5 animate-pulse text-amber-400" />
                <span>{myPending.length} Under Review</span>
              </span>
            )}
            {myRejected.length > 0 && (
              <span className="flex items-center gap-1.5 text-rose-300 font-semibold bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-xl">
                <XCircle className="size-3.5 text-rose-400" />
                <span>{myRejected.length} Rejected</span>
              </span>
            )}
            <span className="text-muted text-[11px]">
              Track moderation status and feedback on your content.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="subtle"
              onClick={() => setShowSubmissionsModal(true)}
              className="text-[11px] font-bold h-7 rounded-xl border border-white/10 hover:border-white/20"
            >
              View Status ({myPending.length + myRejected.length})
            </Button>
            {isAdminRole && (
              <Link
                to="/admin"
                className="text-[11px] font-bold text-amber-400 hover:underline shrink-0"
              >
                Review Queue →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 4. Tab Contents */}
      <div className="mt-6">
        {/* Posts 3-Col Grid */}
        {activeTab === "posts" && (
          <div>
            {myApprovedPosts.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-surface/50 p-12 text-center">
                <span className="text-4xl">📸</span>
                <h3 className="font-display text-sm font-bold text-fg mt-3">No posts yet</h3>
                <p className="text-xs text-muted mt-1">Create your first meme or image post!</p>
                <Link to="/studio">
                  <Button size="sm" className="mt-4 rounded-xl bg-accent text-black font-bold">
                    Create Post
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {myApprovedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-black border border-white/10"
                  >
                    <img
                      src={post.mediaUrl}
                      alt={post.caption}
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-xs font-bold text-white">
                      <span className="flex items-center gap-1">
                        <Heart className="size-4 fill-white" />
                        {formatNumber(post.likes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="size-4 fill-white" />
                        {post.comments}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reels 3-Col Grid */}
        {activeTab === "reels" && (
          <div>
            {myApprovedReels.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-surface/50 p-12 text-center">
                <span className="text-4xl">🎬</span>
                <h3 className="font-display text-sm font-bold text-fg mt-3">No reels yet</h3>
                <p className="text-xs text-muted mt-1">Share short viral reels and earn category points!</p>
                <Link to="/studio">
                  <Button size="sm" className="mt-4 rounded-xl bg-accent text-black font-bold">
                    Create Reel
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {myApprovedReels.map((reel) => (
                  <div
                    key={reel.id}
                    className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-black border border-white/10"
                  >
                    {reel.type === "reel" ||
                    reel.mediaUrl?.endsWith(".mp4") ||
                    reel.mediaUrl?.endsWith(".webm") ||
                    reel.mediaUrl?.startsWith("blob:") ? (
                      <video
                        src={reel.mediaUrl}
                        muted
                        loop
                        playsInline
                        className="size-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <img
                        src={reel.mediaUrl}
                        alt={reel.caption}
                        className="size-full object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-xs font-bold text-white">
                      <span className="flex items-center gap-1">
                        <Play className="size-4 fill-white" />
                        {formatNumber(reel.views)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="size-4 fill-white" />
                        {formatNumber(reel.likes)}
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-mono font-bold text-white drop-shadow">
                      <Play className="size-3 fill-white" />
                      <span>{formatNumber(reel.views)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Saved Posts Grid */}
        {activeTab === "saved" && (
          <div>
            {savedPosts.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-surface/50 p-12 text-center text-xs text-muted">
                No saved posts or reels yet. Tap the bookmark icon on any post to save it here.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {savedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-black border border-white/10"
                  >
                    <img
                      src={post.mediaUrl}
                      alt={post.caption}
                      className="size-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] text-white">
                      @{post.authorHandle}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Creator RIFF Points Wallet */}
        {activeTab === "wallet" && (
          <div className="space-y-6">
            {/* Killswitch & Freeze Warning Banners */}
            {platformControls.emergencyWalletFreeze && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center gap-3 shadow-md">
                <AlertOctagon className="size-5 text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold">Platform Payout Freeze Active:</span> Creator cashouts and wallet transfers are currently paused platform-wide by Platform Governance for liquidity audit.
                </div>
              </div>
            )}

            {profile.isWalletFrozen && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center gap-3 shadow-md">
                <Lock className="size-5 text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold">Account Wallet Frozen:</span> Your creator wallet is currently locked. Outgoing transfers and cashouts are disabled.
                </div>
              </div>
            )}

            {/* Strict Privacy Guarantee Banner */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-xs text-white/60 flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00] border border-[#d4ff00]/20 shrink-0">
                <Lock className="size-4" />
              </div>
              <div className="leading-relaxed">
                <strong className="text-white font-semibold">100% Private Wallet:</strong> Your wallet balance, transaction ledger, and cashout history are strictly confidential and visible only to your account. No other user, follower, or visitor can see your points.
              </div>
            </div>

            {/* Total Balance Card */}
            <div className="rounded-3xl border border-accent/40 bg-gradient-to-br from-surface to-raised p-6 shadow-2xl">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-accent">
                  <Zap className="size-4 fill-accent" />
                  RIFF Creator Points
                </span>
                <span className="rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] text-accent font-bold flex items-center gap-1">
                  <Lock className="size-2.5" /> 100% Private to You
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-3">
                <p className="font-display text-4xl font-black text-fg tracking-tight">
                  {pointsWallet.toLocaleString()}
                </p>
                <span className="text-sm font-bold text-accent">RIFF Points</span>
              </div>

              {/* Monthly and Category Breakdown */}
              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs">
                <div>
                  <p className="text-[10px] text-muted">This Month</p>
                  <p className="font-display text-base font-bold text-emerald-400 mt-0.5">+24 pts</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">Approved Posts</p>
                  <p className="font-display text-base font-bold text-fg mt-0.5">
                    +{approvedPostsPoints || 48} pts
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">Approved Reels</p>
                  <p className="font-display text-base font-bold text-fg mt-0.5">
                    +{approvedReelsPoints || 15} pts
                  </p>
                </div>
              </div>

              {/* Cashout Conversion Card */}
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-black/40 border border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Estimated Fiat Cashout Value:</span>
                    <span className="font-mono font-bold text-base text-white">
                      {inr(pointsWallet * (platformControls.pointConversionRate ?? 0.5))}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted flex items-center gap-2 flex-wrap">
                    <span>Rate: 1 pt = ₹{platformControls.pointConversionRate ?? 0.5}</span>
                    <span>•</span>
                    <span>Min: ₹{platformControls.minWithdrawalThreshold ?? 100}</span>
                    <span>•</span>
                    <span>Fee: {platformControls.payoutProcessingFeePercent ?? 2}%</span>
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setCashoutAmount(Math.max(platformControls.minWithdrawalThreshold ?? 100, 100));
                    setShowCashoutModal(true);
                  }}
                  disabled={
                    platformControls.emergencyWalletFreeze ||
                    Boolean(profile.isWalletFrozen) ||
                    pointsWallet * (platformControls.pointConversionRate ?? 0.5) < (platformControls.minWithdrawalThreshold ?? 100)
                  }
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs h-10 px-5 rounded-xl shadow-lg shrink-0 flex items-center gap-2"
                >
                  <ArrowUpRight className="size-4" />
                  <span>Request Cashout (UPI / Bank)</span>
                </Button>
              </div>

              <div className="mt-4 rounded-2xl bg-black/30 p-3 text-[11px] text-muted border border-white/5 leading-relaxed">
                💡 <strong className="text-fg">Economics Rule:</strong> Points are awarded only when
                your content is reviewed and approved by moderators in a confirmed category. Views and
                likes increase your <strong className="text-orange-400">Creator Popularity</strong> and
                boost your posts in the AI feed algorithm!
              </div>
            </div>

            {/* Daily Streak & Login Rewards Interactive Card */}
            <div className="rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-black/40 to-amber-500/10 p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] shrink-0">
                    <Flame className="size-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black font-display text-white">
                        {streak?.currentStreak || 0} Day Login Streak
                      </h3>
                      {evaluateStreakStatus(streak).canClaim && (
                        <span className="rounded-full bg-[#d4ff00] text-black text-[9px] font-black px-2 py-0.2 animate-pulse">
                          Reward Ready
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/50">
                      Login daily to earn bonus RIFF points credited straight to your private wallet!
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setShowDailyRewardModal(true)}
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 text-xs font-bold shrink-0 self-start sm:self-auto"
                >
                  <Trophy className="size-3.5 text-yellow-400 mr-1.5" />
                  View 7-Day Rewards Track
                </Button>
              </div>

              {/* 7-Day Mini Track */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mt-4 pt-4 border-t border-white/10">
                {DAILY_REWARD_TIERS.map((tier) => {
                  const status = evaluateStreakStatus(streak);
                  const currentDay = status.isClaimedToday
                    ? ((status.activeStreak - 1) % 7) + 1
                    : ((status.nextStreakOnClaim - 1) % 7) + 1;
                  const isClaimed = status.isClaimedToday
                    ? tier.day <= currentDay
                    : tier.day < currentDay;
                  const isCurrent = !status.isClaimedToday && tier.day === currentDay;

                  return (
                    <div
                      key={tier.day}
                      className={cn(
                        "flex flex-col items-center rounded-xl p-2 text-center border transition-all",
                        isCurrent
                          ? "border-[#d4ff00] bg-[#d4ff00]/15 shadow-[0_0_15px_rgba(212,255,0,0.25)] ring-1 ring-[#d4ff00]/60 scale-105"
                          : isClaimed
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-white/5 bg-white/[0.02] text-white/40",
                      )}
                    >
                      <span className="text-[9px] font-bold text-white/50">D{tier.day}</span>
                      <span className="text-[10px] font-black mt-0.5 text-white">+{tier.points}</span>
                      <span className="text-[8px] mt-0.5">
                        {isClaimed ? "✓" : isCurrent ? "🎁" : "🔒"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/5">
                <span className="text-xs text-white/60">
                  {evaluateStreakStatus(streak).canClaim
                    ? `Today's reward: +${evaluateStreakStatus(streak).rewardTier.points} RIFF Points ready!`
                    : `Next daily reward unlocks at midnight (${getTimeUntilNextMidnight().hours}h remaining)`}
                </span>

                {evaluateStreakStatus(streak).canClaim ? (
                  <button
                    onClick={handleClaimDailyReward}
                    className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#d4ff00] via-yellow-400 to-[#d4ff00] px-4 py-2 text-xs font-black text-black shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Gift className="size-4" />
                    <span>Claim +{evaluateStreakStatus(streak).rewardTier.points} pts Now</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">
                    <Check className="size-3.5" /> Claimed for Today
                  </span>
                )}
              </div>
            </div>

            {/* Creator's Recent Cashout Requests */}
            {myWithdrawals.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-display text-xs font-bold text-fg uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="size-3.5 text-accent" />
                  <span>Your Cashout &amp; Escrow Requests ({myWithdrawals.length})</span>
                </h3>

                <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface/90 shadow-xl backdrop-blur-xl divide-y divide-white/5">
                  {myWithdrawals.map((w) => (
                    <div key={w.id} className="p-4 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-white">{inr(w.amount)}</span>
                          <span className="font-mono text-[11px] text-amber-400 font-semibold">({w.pointsEquivalent.toLocaleString()} pts)</span>
                          <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/70 font-mono font-bold">
                            {w.paymentMethod === "upi" ? "UPI" : "Bank IMPS"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted font-mono">
                          {w.paymentMethod === "upi"
                            ? `UPI: ${String(w.paymentDetails?.upiId || "N/A")}`
                            : `A/C: ${String(w.paymentDetails?.accountNumber || "N/A")} (${String(w.paymentDetails?.ifsc || "")})`}
                        </p>
                        {w.adminNote && (
                          <p className="text-[10px] text-muted italic">
                            Note: {w.adminNote}
                          </p>
                        )}
                      </div>

                      <div className="text-right space-y-1">
                        {w.status === "pending" && (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-bold">
                            🟡 In Escrow Review
                          </Badge>
                        )}
                        {w.status === "completed" && (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                            ✅ Settled &amp; Paid
                          </Badge>
                        )}
                        {w.status === "failed" && (
                          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] font-bold">
                            ❌ Refunded / Failed
                          </Badge>
                        )}
                        <p className="text-[9px] text-muted">
                          {new Date(w.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Points Ledger / Transaction History */}
            <div className="space-y-3">
              <h3 className="font-display text-xs font-bold text-fg uppercase tracking-wider">
                Reward Attribution History
              </h3>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface/90 shadow-xl backdrop-blur-xl divide-y divide-white/5">
                {pointsTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-2xl bg-accent/15 border border-accent/30 text-base">
                        {tx.categoryIcon || "⚡"}
                      </span>
                      <div>
                        <p className="font-bold text-fg">
                          {tx.categoryName || "Approved Content"} {tx.contentType === "reel" ? "Reel" : "Meme"}
                        </p>
                        <p className="text-[10px] text-muted">{tx.postTitle}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`font-mono text-sm font-black ${tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {tx.amount >= 0 ? "+" : ""}{tx.amount} pts
                      </p>
                      <p className="text-[9px] text-muted">
                        {Math.max(1, Math.round((Date.now() - tx.timestamp) / 3600000))}h ago
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveProfile}
            className="w-full max-w-md rounded-3xl border border-white/15 bg-surface p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display text-sm font-bold text-fg">Edit Profile</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Display Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Unique Handle (Case-insensitive)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">@</span>
                <Input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  required
                  className="pl-7 text-xs font-mono"
                />
              </div>
              <p className="text-[10px] text-muted mt-1">
                Your profile URL: riff.app/@{handle.toLowerCase()}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1 flex items-center gap-1">
                <Instagram className="size-3 text-pink-400" />
                <span>Connected Instagram Username</span>
              </label>
              <Input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="your_insta_handle"
                className="text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Bio</label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-xl bg-accent text-black font-bold">
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Submissions Moderation Status Modal */}
      {showSubmissionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-surface p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-fg flex items-center gap-1.5">
                  <Clock className="size-4 text-accent" />
                  <span>Your Content Submissions</span>
                </h3>
                <p className="text-[11px] text-muted">
                  Review queue status and moderation notes for your posts &amp; reels.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmissionsModal(false)}
                className="text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Pending Section */}
            {myPending.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Under Review ({myPending.length})</span>
                </h4>
                <div className="space-y-2">
                  {myPending.map((sub) => {
                    const cat =
                      categories.find((c) => c.id === sub.userSelectedCategoryId) || categories[0];
                    return (
                      <div
                        key={sub.id}
                        className="flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs"
                      >
                        <div className="relative size-14 shrink-0 rounded-xl overflow-hidden bg-black border border-white/10">
                          {sub.type === "reel" ||
                          sub.mediaUrl?.endsWith(".mp4") ||
                          sub.mediaUrl?.endsWith(".webm") ||
                          sub.mediaUrl?.startsWith("blob:") ? (
                            <video
                              src={sub.mediaUrl}
                              muted
                              loop
                              playsInline
                              className="size-full object-cover"
                            />
                          ) : (
                            <img
                              src={sub.mediaUrl}
                              alt="Media thumbnail"
                              className="size-full object-cover"
                            />
                          )}
                          <span className="absolute bottom-0.5 right-0.5 text-[8px] px-1 bg-black/80 text-white rounded font-mono font-bold">
                            {sub.type === "reel" ? "9:16" : "1:1"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-fg truncate">
                              {sub.type === "reel" ? "🎬 Reel" : "📸 Post"}
                            </span>
                            <span className="text-[10px] text-amber-300 font-semibold font-mono">
                              🟡 Pending Review
                            </span>
                          </div>
                          <p className="text-xs text-muted truncate">{sub.caption || "No caption"}</p>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-fg font-medium">
                              <span>{cat?.icon}</span>
                              <span>{cat?.name}</span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold font-mono">
                              +{cat?.approvalPoints || 10} pts on approval
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rejected Section */}
            {myRejected.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <XCircle className="size-3.5" />
                  <span>Moderation Feedback ({myRejected.length})</span>
                </h4>
                <div className="space-y-2">
                  {myRejected.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs"
                    >
                      <div className="relative size-14 shrink-0 rounded-xl overflow-hidden bg-black border border-white/10 grayscale opacity-60">
                        {sub.type === "reel" ||
                        sub.mediaUrl?.endsWith(".mp4") ||
                        sub.mediaUrl?.endsWith(".webm") ||
                        sub.mediaUrl?.startsWith("blob:") ? (
                          <video
                            src={sub.mediaUrl}
                            muted
                            loop
                            playsInline
                            className="size-full object-cover"
                          />
                        ) : (
                          <img
                            src={sub.mediaUrl}
                            alt="Media thumbnail"
                            className="size-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-fg truncate">
                            {sub.type === "reel" ? "🎬 Reel" : "📸 Post"}
                          </span>
                          <span className="text-[10px] text-rose-400 font-bold">
                            ❌ Not Approved
                          </span>
                        </div>
                        <p className="text-xs text-muted truncate">{sub.caption || "No caption"}</p>
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-[11px] text-rose-300">
                          <p className="font-semibold text-rose-200">
                            Reason: "{sub.rejectionReason || "Did not meet community standards"}"
                          </p>
                          <p className="text-[10px] text-muted mt-0.5">
                            Reviewed by @{sub.reviewedBy || "moderator"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-raised/40 p-3 text-[11px] text-muted space-y-1">
                  <p className="font-bold text-fg">💡 How to get approved on RIFF:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                    <li>Upload clear, high-resolution media without external watermarks.</li>
                    <li>Choose the most accurate category so your audience finds it.</li>
                    <li>Avoid reposts, offensive language, or misleading hashtags.</li>
                  </ul>
                </div>
              </div>
            )}

            {myPending.length === 0 && myRejected.length === 0 && (
              <div className="p-8 text-center text-muted text-xs">
                No active or pending submissions right now. All your approved posts are live!
              </div>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-white/10">
              <Button
                size="sm"
                onClick={() => setShowSubmissionsModal(false)}
                className="rounded-xl bg-accent text-black font-bold text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Creator Popularity Breakdown Modal */}
      {showPopularityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-orange-500/30 bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Flame className="size-4 fill-orange-400" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-bold text-fg">Creator Popularity Breakdown</h3>
                  <p className="text-[10px] text-muted">Organic Engagement &amp; Feed Algorithm Score</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPopularityModal(false)}
                className="text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Total Popularity Display */}
            <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-amber-500/5 p-4 text-center">
              <span className="text-[11px] font-bold text-orange-300 uppercase tracking-wider">
                Total Popularity Score
              </span>
              <p className="font-display text-3xl font-black text-orange-400 mt-1 flex items-center justify-center gap-1.5">
                <Flame className="size-6 fill-orange-400 inline" />
                <span>{creatorPopularity.toLocaleString()} pts</span>
              </p>
              <p className="text-[10px] text-muted mt-1">
                Recalculated in real-time on every like, comment, view, and share
              </p>
            </div>

            {/* Comparison Pill: Popularity vs RIFF Points */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl border border-orange-500/20 bg-raised/50 p-3 space-y-1">
                <span className="font-bold text-orange-400 flex items-center gap-1 text-[11px]">
                  <Flame className="size-3 fill-orange-400" />
                  Popularity
                </span>
                <p className="text-[10px] text-muted leading-relaxed">
                  <strong className="text-fg">Non-spendable.</strong> Determines ranking in the "For You" feed and algorithmic distribution.
                </p>
              </div>

              <div className="rounded-2xl border border-accent/30 bg-raised/50 p-3 space-y-1">
                <span className="font-bold text-accent flex items-center gap-1 text-[11px]">
                  <Zap className="size-3 fill-accent" />
                  RIFF Points
                </span>
                <p className="text-[10px] text-muted leading-relaxed">
                  <strong className="text-fg">Spendable reward.</strong> Credited directly into your wallet upon moderator approval.
                </p>
              </div>
            </div>

            {/* Engagement Factors Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-fg">Algorithm Weights &amp; Engagement:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-muted text-[11px]">❤️ Likes (30%)</span>
                  <span className="font-mono font-bold text-fg">{totalLikes.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-muted text-[11px]">👁️ Views (20%)</span>
                  <span className="font-mono font-bold text-fg">{totalViews.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-muted text-[11px]">💬 Comments (15%)</span>
                  <span className="font-mono font-bold text-fg">{totalComments.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-muted text-[11px]">↗️ Shares (15%)</span>
                  <span className="font-mono font-bold text-fg">{totalShares.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-muted text-[11px]">🔖 Saves (10%)</span>
                  <span className="font-mono font-bold text-fg">{totalSaves.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-muted text-[11px]">⚡ Velocity (10%)</span>
                  <span className="font-mono font-bold text-emerald-400">Active</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end border-t border-white/10">
              <Button
                size="sm"
                onClick={() => setShowPopularityModal(false)}
                className="rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs"
              >
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Creator Cashout Request Modal */}
      {showCashoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleCashoutSubmit}
            className="w-full max-w-md rounded-3xl border border-white/15 bg-surface p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Wallet className="size-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-fg">Request Cashout</h3>
                  <p className="text-[11px] text-muted">Convert RIFF Points to Direct INR Payout</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCashoutModal(false)}
                className="text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCashoutMethod("upi")}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5",
                    cashoutMethod === "upi"
                      ? "bg-accent/15 border-accent text-accent"
                      : "bg-white/5 border-white/10 text-muted hover:text-fg",
                  )}
                >
                  <span>⚡ Instant UPI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCashoutMethod("bank_transfer")}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5",
                    cashoutMethod === "bank_transfer"
                      ? "bg-accent/15 border-accent text-accent"
                      : "bg-white/5 border-white/10 text-muted hover:text-fg",
                  )}
                >
                  <span>🏦 Bank Transfer (IMPS)</span>
                </button>
              </div>
            </div>

            {/* UPI Details */}
            {cashoutMethod === "upi" ? (
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  UPI VPA Address / ID
                </label>
                <Input
                  placeholder="e.g. mobile@paytm or username@okhdfcbank"
                  value={cashoutUpiId}
                  onChange={(e) => setCashoutUpiId(e.target.value)}
                  className="text-xs font-mono"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Bank Account Number
                  </label>
                  <Input
                    placeholder="e.g. 50100234567890"
                    value={cashoutAccountNo}
                    onChange={(e) => setCashoutAccountNo(e.target.value)}
                    className="text-xs font-mono"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">IFSC Code</label>
                    <Input
                      placeholder="e.g. HDFC0001234"
                      value={cashoutIfsc}
                      onChange={(e) => setCashoutIfsc(e.target.value)}
                      className="text-xs font-mono uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Holder Name</label>
                    <Input
                      placeholder="e.g. Full Name"
                      value={cashoutHolderName}
                      onChange={(e) => setCashoutHolderName(e.target.value)}
                      className="text-xs"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="font-medium text-muted">Cashout Amount (INR)</label>
                <span className="text-muted text-[11px]">
                  Available: <strong className="text-emerald-400 font-mono">{pointsWallet.toLocaleString()} pts</strong> ({inr(pointsWallet * (platformControls.pointConversionRate ?? 0.5))})
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-bold">₹</span>
                <Input
                  type="number"
                  min={platformControls.minWithdrawalThreshold ?? 100}
                  max={Math.min(
                    platformControls.maxDailyWithdrawalLimit ?? 10000,
                    Math.floor(pointsWallet * (platformControls.pointConversionRate ?? 0.5)),
                  )}
                  value={cashoutAmount}
                  onChange={(e) => setCashoutAmount(Number(e.target.value))}
                  className="pl-7 text-sm font-mono font-bold"
                  required
                />
              </div>

              {/* Quick select chips */}
              <div className="flex items-center gap-1.5 mt-2">
                {[100, 250, 500, 1000].map((amt) => {
                  const maxAffordable = Math.floor(pointsWallet * (platformControls.pointConversionRate ?? 0.5));
                  if (amt > maxAffordable) return null;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashoutAmount(amt)}
                      className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-muted hover:text-white"
                    >
                      ₹{amt}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const maxAffordable = Math.min(
                      platformControls.maxDailyWithdrawalLimit ?? 10000,
                      Math.floor(pointsWallet * (platformControls.pointConversionRate ?? 0.5)),
                    );
                    setCashoutAmount(maxAffordable);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-accent/20 border border-accent/40 text-[10px] font-bold text-accent hover:opacity-80"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Live Calculation Preview */}
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted">
                <span>Required RIFF Points:</span>
                <span className="font-mono font-bold text-amber-400">
                  {Math.ceil(cashoutAmount / (platformControls.pointConversionRate || 0.5)).toLocaleString()} pts
                </span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Platform Processing Fee ({platformControls.payoutProcessingFeePercent ?? 2}%):</span>
                <span className="font-mono text-white/70">
                  -₹{((cashoutAmount * (platformControls.payoutProcessingFeePercent ?? 2)) / 100).toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between text-white border-t border-white/5 pt-1 font-bold">
                <span>Net Transfer Amount:</span>
                <span className="font-mono text-emerald-400">
                  ₹{(cashoutAmount * (1 - (platformControls.payoutProcessingFeePercent ?? 2) / 100)).toFixed(0)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowCashoutModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  cashoutAmount <= 0 ||
                  Math.ceil(cashoutAmount / (platformControls.pointConversionRate || 0.5)) > pointsWallet
                }
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs h-9 px-4 disabled:opacity-40"
              >
                Confirm &amp; Lock in Escrow
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Daily Login Rewards & Streaks Modal */}
      <DailyRewardModal
        isOpen={showDailyRewardModal}
        onClose={() => setShowDailyRewardModal(false)}
      />
    </main>
  );
}
