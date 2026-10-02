import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart2,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  Flame,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { PersonMark } from "@/components/person-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fireConfetti } from "@/lib/confetti";
import { playSound } from "@/lib/sounds";
import { useComments, useRiff } from "@/lib/store";
import type { Post } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { toast } from "sonner";

interface ReelViewerProps {
  reels: Post[];
  initialPostId?: string;
  onClose?: () => void;
}

export function ReelViewer({ reels, initialPostId, onClose }: ReelViewerProps) {
  const navigate = useNavigate();

  // Store bindings
  const likedPostIds = useRiff((s) => s.likedPostIds) || [];
  const savedPostIds = useRiff((s) => s.savedPostIds) || [];
  const followingUserIds = useRiff((s) => s.followingUserIds) || [];
  const categories = useRiff((s) => s.categories) || [];
  const rawProfile = useRiff((s) => s.profile);
  const myProfile = rawProfile || { name: "You", handle: "you", role: "creator" };
  const toggleLikePost = useRiff((s) => s.toggleLikePost);
  const toggleSavePost = useRiff((s) => s.toggleSavePost);
  const toggleFollowUser = useRiff((s) => s.toggleFollowUser);
  const recordNegativeSignal = useRiff((s) => s.recordNegativeSignal);
  const incrementPostViews = useRiff((s) => s.incrementPostViews);
  const sharePost = useRiff((s) => s.sharePost);
  const deletePost = useRiff((s) => s.deletePost);
  const addCommentToPost = useRiff((s) => s.addCommentToPost);
  const likeComment = useRiff((s) => s.likeComment);

  const safeReels = Array.isArray(reels) ? reels : [];

  // Active index
  const initialIndex = initialPostId
    ? Math.max(0, safeReels.findIndex((r) => r?.id === initialPostId))
    : 0;
  const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  // Active reel
  const activeReel = safeReels[activeIndex] || safeReels[0] || null;

  // Playback & Sound State
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState<"play" | "pause" | null>(null);

  // Modals & Drawers
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedCaption, setExpandedCaption] = useState(false);

  // Touch swipe support
  const touchStartY = useRef<number | null>(null);

  // Comments for active reel
  const comments = useComments(activeReel?.id || "");

  // Track views on active reel change
  useEffect(() => {
    if (activeReel?.id) {
      incrementPostViews(activeReel.id);
      setIsPlaying(true);
      setShowComments(false);
      setShowMenu(false);
      setShowStatsModal(false);
      setExpandedCaption(false);
    }
  }, [activeReel?.id, incrementPostViews]);

  const isWheelLocked = useRef(false);
  const wheelLockTimeout = useRef<NodeJS.Timeout | null>(null);

  const goNext = () => {
    setActiveIndex((prev) => {
      if (prev < safeReels.length - 1) {
        return prev + 1;
      }
      toast.info("You've reached the end of the reel feed.");
      return prev;
    });
  };

  const goPrev = () => {
    setActiveIndex((prev) => {
      if (prev > 0) {
        return prev - 1;
      }
      return prev;
    });
  };

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (showComments || showMenu || showStatsModal) return;
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        goPrev();
      } else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "m") {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showComments, showMenu, showStatsModal, safeReels.length]);

  // Mouse wheel & touchpad scroll navigation with inertia suppression
  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      if (showComments || showMenu || showStatsModal) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest(".overflow-y-auto")) return;

      e.preventDefault();

      if (isWheelLocked.current) {
        // Extend lock while momentum events keep coming to prevent skipping multiple reels
        if (wheelLockTimeout.current) clearTimeout(wheelLockTimeout.current);
        wheelLockTimeout.current = setTimeout(() => {
          isWheelLocked.current = false;
        }, 250);
        return;
      }

      if (Math.abs(e.deltaY) > 25) {
        isWheelLocked.current = true;
        if (e.deltaY > 0) {
          goNext();
        } else if (e.deltaY < 0) {
          goPrev();
        }

        if (wheelLockTimeout.current) clearTimeout(wheelLockTimeout.current);
        wheelLockTimeout.current = setTimeout(() => {
          isWheelLocked.current = false;
        }, 450);
      }
    }

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (wheelLockTimeout.current) clearTimeout(wheelLockTimeout.current);
    };
  }, [showComments, showMenu, showStatsModal, safeReels.length]);

  if (!activeReel) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center text-white">
        <span className="text-4xl">🎬</span>
        <h3 className="mt-3 text-lg font-bold">No Reels Available</h3>
        <p className="mt-1 text-xs text-white/50">Be the first creator to drop a 9:16 Reel on RIFF!</p>
        <Link
          to="/create"
          className="mt-4 rounded-xl bg-[#d4ff00] px-4 py-2 text-xs font-black text-black hover:opacity-90"
        >
          Create a Reel
        </Link>
      </div>
    );
  }

  const safeLiked = Array.isArray(likedPostIds) ? likedPostIds : [];
  const safeSaved = Array.isArray(savedPostIds) ? savedPostIds : [];
  const safeFollowing = Array.isArray(followingUserIds) ? followingUserIds : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  const isLiked = activeReel ? safeLiked.includes(activeReel.id) : false;
  const isSaved = activeReel ? safeSaved.includes(activeReel.id) : false;
  const isFollowing = activeReel
    ? (activeReel.authorHandle && safeFollowing.includes(activeReel.authorHandle)) ||
      (activeReel.authorId && safeFollowing.includes(activeReel.authorId))
    : false;
  const isSelf = activeReel
    ? activeReel.authorHandle === myProfile?.handle ||
      activeReel.authorId === "you" ||
      activeReel.authorId === myProfile?.handle
    : false;

  const category =
    safeCategories.find(
      (c) => c && c.id === (activeReel?.approvedCategoryId || activeReel?.userSelectedCategoryId),
    ) || safeCategories[0] || { id: "general", name: "General", icon: "🔥", approvalPoints: 10 };

  function togglePlayPause() {
    setIsPlaying((prev) => {
      const next = !prev;
      setShowPlayPauseIcon(next ? "play" : "pause");
      setTimeout(() => setShowPlayPauseIcon(null), 600);
      return next;
    });
  }

  function handleLike(e?: React.MouseEvent) {
    if (!isLiked) {
      playSound("pop");
      if (e) fireConfetti(e.clientX, e.clientY, 30);
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 800);
    }
    toggleLikePost(activeReel.id);
  }

  function handleDoubleTap(e: React.MouseEvent) {
    if (!isLiked) {
      handleLike(e);
    } else {
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 800);
    }
  }

  function handleShare() {
    const url = window.location.origin + `/reels?id=${activeReel.id}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    sharePost(activeReel.id);
    playSound("pop");
    toast.success("Reel link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentToPost(activeReel.id, commentText);
    setCommentText("");
    playSound("pop");
    toast.success("Comment posted!");
  }

  // Touch event handlers for swipe
  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    touchStartY.current = null;

    if (diff > 50) {
      // Swiped up -> next
      goNext();
    } else if (diff < -50) {
      // Swiped down -> prev
      goPrev();
    }
  }

  return (
    <div
      className="relative flex h-full w-full items-center justify-center bg-[#050507] overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 9:16 Centered Container */}
      <div className="relative flex h-full max-h-[860px] w-full max-w-[420px] aspect-[9/16] flex-col justify-between overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border border-white/10 bg-black shadow-2xl">
        {/* Top Header Overlay */}
        <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
          <div className="flex items-center gap-2">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="flex size-9 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-md hover:bg-black/80 hover:text-white transition-colors"
                title="Back"
              >
                <ChevronLeft className="size-5" />
              </button>
            ) : (
              <Link
                to="/"
                className="flex size-9 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-md hover:bg-black/80 hover:text-white transition-colors"
                title="Back to Feed"
              >
                <ChevronLeft className="size-5" />
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="flex size-9 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-md hover:bg-black/80 hover:text-white transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="size-4 text-rose-400" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        </header>

        {/* Animated Vertical Reel Track Container with 120Hz GPU Compositing */}
        <div className="relative size-full overflow-hidden bg-black [perspective:1000px]">
          <div
            className="size-full transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] [will-change:transform] [backface-visibility:hidden]"
            style={{ transform: `translate3d(0, -${activeIndex * 100}%, 0)` }}
          >
            {safeReels.map((reel, index) => {
              const isCurrent = index === activeIndex;
              const reelLiked = safeLiked.includes(reel.id);
              const reelSaved = safeSaved.includes(reel.id);
              const reelFollowing =
                (reel.authorHandle && safeFollowing.includes(reel.authorHandle)) ||
                (reel.authorId && safeFollowing.includes(reel.authorId));
              const reelSelf =
                reel.authorHandle === myProfile?.handle ||
                reel.authorId === "you" ||
                reel.authorId === myProfile?.handle;

              return (
                <div
                  key={reel.id}
                  className={cn(
                    "relative size-full shrink-0 overflow-hidden bg-black transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] [will-change:transform,opacity]",
                    isCurrent ? "scale-100 opacity-100" : "scale-[0.97] opacity-80",
                  )}
                >
                  {/* Media Canvas with double-tap & play/pause toggle */}
                  <div
                    className="relative size-full cursor-pointer overflow-hidden bg-black"
                    onClick={togglePlayPause}
                    onDoubleClick={handleDoubleTap}
                  >
                    {reel.mediaUrl?.endsWith(".mp4") ||
                    reel.mediaUrl?.endsWith(".webm") ||
                    reel.mediaUrl?.startsWith("blob:") ||
                    (reel.type === "reel" &&
                      !reel.mediaUrl?.match(/\.(jpg|jpeg|png|webp|gif)$/i)) ? (
                      <video
                        src={reel.mediaUrl}
                        loop
                        playsInline
                        autoPlay={isCurrent && isPlaying}
                        muted={isMuted}
                        className={cn(
                          "size-full object-cover transition-transform duration-300",
                          reel.filter === "vintage" && "sepia contrast-110",
                          reel.filter === "cinema" && "contrast-125 saturate-110",
                          reel.filter === "mono" && "grayscale",
                          reel.filter === "glow" &&
                            "brightness-110 contrast-115 drop-shadow-[0_0_20px_rgba(212,255,0,0.3)]",
                        )}
                      />
                    ) : (
                      <img
                        src={reel.mediaUrl}
                        alt={reel.caption || "Reel"}
                        className={cn(
                          "size-full object-cover select-none transition-transform duration-300",
                          reel.filter === "vintage" && "sepia contrast-110",
                          reel.filter === "cinema" && "contrast-125 saturate-110",
                          reel.filter === "mono" && "grayscale",
                          reel.filter === "glow" &&
                            "brightness-110 contrast-115 drop-shadow-[0_0_20px_rgba(212,255,0,0.3)]",
                        )}
                      />
                    )}

                    {/* Floating Heart Pop Animation on Double Tap */}
                    {isCurrent && showHeartPop && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 fade-in duration-300">
                        <Heart className="size-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_35px_rgba(244,63,94,0.9)]" />
                      </div>
                    )}

                    {/* Play / Pause momentary feedback indicator */}
                    {isCurrent && showPlayPauseIcon && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-75 fade-in duration-200">
                        <div className="flex size-16 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md">
                          {showPlayPauseIcon === "pause" ? (
                            <Pause className="size-8 fill-white" />
                          ) : (
                            <Play className="size-8 fill-white" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Meme text overlay if exists */}
                    {(reel.topCaption || reel.bottomCaption) && (
                      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 pt-16 pb-32 z-20">
                        {reel.topCaption && (
                          <p
                            className="font-impact text-center text-2xl font-black uppercase tracking-wider text-white select-none leading-tight"
                            style={{
                              textShadow:
                                "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.9)",
                            }}
                          >
                            {reel.topCaption}
                          </p>
                        )}
                        {reel.bottomCaption && (
                          <p
                            className="font-impact text-center text-2xl font-black uppercase tracking-wider text-white select-none leading-tight"
                            style={{
                              textShadow:
                                "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.9)",
                            }}
                          >
                            {reel.bottomCaption}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Details & Vertical Action Stack */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 pb-5 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
                    {/* Left Details */}
                    <div className="pointer-events-auto max-w-[75%] space-y-2 text-left">
                      <div className="flex items-center gap-2.5">
                        <Link to="/you" className="relative shrink-0">
                          <PersonMark mark={(reel.authorMark as any) || "you"} size="sm" />
                          <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-400 border border-black" />
                        </Link>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link to="/you" className="truncate text-xs font-bold text-white hover:underline">
                              {reel.authorName}
                            </Link>
                            <span className="text-[11px] text-white/50">@{reel.authorHandle}</span>
                            {reel.isVerified && (
                              <CheckCircle2 className="size-3 text-[#d4ff00] fill-[#d4ff00]/20" />
                            )}
                          </div>
                        </div>

                        {!reelSelf && (
                          <button
                            type="button"
                            onClick={() => toggleFollowUser(reel.authorHandle)}
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all",
                              reelFollowing
                                ? "bg-white/10 text-white/70 hover:bg-white/20"
                                : "bg-[#d4ff00] text-black hover:opacity-90",
                            )}
                          >
                            {reelFollowing ? "Following" : "Follow"}
                          </button>
                        )}
                      </div>

                      {/* Caption */}
                      {reel.caption && (
                        <div className="text-xs text-white/90 leading-snug">
                          <p className={cn(!expandedCaption && "line-clamp-2")}>
                            {reel.caption}
                          </p>
                          {reel.caption.length > 80 && (
                            <button
                              type="button"
                              onClick={() => setExpandedCaption(!expandedCaption)}
                              className="mt-0.5 text-[10px] font-bold text-white/40 hover:text-white"
                            >
                              {expandedCaption ? "Show less" : "...more"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Hashtags */}
                      {reel.hashtags && reel.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {reel.hashtags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-semibold text-[#d4ff00]/80 hover:text-[#d4ff00]"
                            >
                              {tag.startsWith("#") ? tag : `#${tag}`}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Music track */}
                      {reel.musicTrack && (
                        <div className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5 text-[10px] text-white/80 max-w-fit">
                          <Music2 className="size-3 text-[#d4ff00] animate-spin" style={{ animationDuration: "3s" }} />
                          <span className="truncate max-w-[140px] font-medium">{reel.musicTrack.title}</span>
                          {reel.musicTrack.isTrending && (
                            <span className="rounded bg-[#d4ff00]/20 px-1 text-[8px] font-black uppercase text-[#d4ff00]">
                              Viral
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Action Stack */}
                    <div className="pointer-events-auto flex flex-col items-center gap-4 pb-1">
                      {/* Like */}
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => isCurrent ? handleLike(e) : toggleLikePost(reel.id)}
                          className="flex size-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/75 transition-transform active:scale-125"
                          title={reelLiked ? "Unlike" : "Like"}
                        >
                          <Heart
                            className={cn(
                              "size-6 transition-colors",
                              reelLiked ? "text-rose-500 fill-rose-500" : "text-white",
                            )}
                          />
                        </button>
                        <span className="text-[11px] font-bold text-white">
                          {formatNumber(reel.likes)}
                        </span>
                      </div>

                      {/* Comment */}
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowComments(true)}
                          className="flex size-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/75 transition-colors"
                          title="Comments"
                        >
                          <MessageCircle className="size-6 text-white" />
                        </button>
                        <span className="text-[11px] font-bold text-white">
                          {formatNumber(comments.length || reel.comments)}
                        </span>
                      </div>

                      {/* Share */}
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={handleShare}
                          className="flex size-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/75 transition-colors"
                          title="Share Reel"
                        >
                          <Share2 className="size-5 text-white" />
                        </button>
                        <span className="text-[11px] font-bold text-white">
                          {formatNumber(reel.shares)}
                        </span>
                      </div>

                      {/* Save */}
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            toggleSavePost(reel.id);
                            playSound("pop");
                          }}
                          className="flex size-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/75 transition-colors"
                          title={reelSaved ? "Saved" : "Save Reel"}
                        >
                          <Bookmark
                            className={cn(
                              "size-5 transition-colors",
                              reelSaved ? "text-[#d4ff00] fill-[#d4ff00]" : "text-white",
                            )}
                          />
                        </button>
                        <span className="text-[11px] font-bold text-white">
                          {formatNumber(reel.saves || 0)}
                        </span>
                      </div>

                      {/* Creator Stats */}
                      {reelSelf && (
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowStatsModal(true)}
                            className="flex size-11 items-center justify-center rounded-full bg-[#d4ff00]/20 border border-[#d4ff00]/40 text-[#d4ff00] backdrop-blur-md hover:bg-[#d4ff00]/30 transition-colors shadow-[0_0_15px_rgba(212,255,0,0.25)]"
                            title="Your Creator Stats"
                          >
                            <BarChart2 className="size-5" />
                          </button>
                          <span className="text-[9px] font-black text-[#d4ff00]">Stats</span>
                        </div>
                      )}

                      {/* More Options (⋯) */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowMenu(!showMenu)}
                          className="flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/75 transition-colors"
                          title="More Options"
                        >
                          <MoreHorizontal className="size-5" />
                        </button>

                        {isCurrent && showMenu && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowMenu(false)}
                            />
                            <div className="absolute right-0 bottom-12 z-50 w-56 overflow-hidden rounded-2xl border border-white/15 bg-[#121216] p-1.5 shadow-2xl backdrop-blur-2xl text-xs">
                              {/* Negative Signals */}
                              <button
                                type="button"
                                onClick={() => {
                                  recordNegativeSignal(reel.id, "not_interested", category.id, reel.authorHandle);
                                  setShowMenu(false);
                                  toast.success("Feed updated: Showing fewer reels like this.");
                                  goNext();
                                }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-white/70 hover:bg-white/10 hover:text-white"
                              >
                                <span className="text-base">👎</span>
                                <div>
                                  <p className="font-semibold text-white">Not Interested</p>
                                  <p className="text-[10px] text-white/40">Tune algorithm</p>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  recordNegativeSignal(reel.id, "mute_creator", category.id, reel.authorHandle);
                                  setShowMenu(false);
                                  toast.info(`Muted @${reel.authorHandle}`);
                                  goNext();
                                }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-white/70 hover:bg-white/10 hover:text-white"
                              >
                                <span className="text-base">🔇</span>
                                <div>
                                  <p className="font-semibold text-white">Mute @{reel.authorHandle}</p>
                                  <p className="text-[10px] text-white/40">Hide creator's reels</p>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  recordNegativeSignal(reel.id, "mute_category", category.id, reel.authorHandle);
                                  setShowMenu(false);
                                  toast.info(`Muted ${category.name} category.`);
                                  goNext();
                                }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-white/70 hover:bg-white/10 hover:text-white"
                              >
                                <span className="text-base">🚫</span>
                                <div>
                                  <p className="font-semibold text-white">Mute {category.name}</p>
                                  <p className="text-[10px] text-white/40">Hide category</p>
                                </div>
                              </button>

                              <div className="my-1 border-t border-white/10" />

                              <button
                                type="button"
                                onClick={() => {
                                  recordNegativeSignal(reel.id, "report", category.id, reel.authorHandle);
                                  setShowMenu(false);
                                  toast.warning("Reel reported. Sent to moderation review.");
                                }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-rose-400 hover:bg-rose-500/10"
                              >
                                <span className="text-base">🚩</span>
                                <div>
                                  <p className="font-semibold">Report Content</p>
                                  <p className="text-[10px] text-rose-300/60">Community guidelines</p>
                                </div>
                              </button>

                              {/* Self-only delete */}
                              {reelSelf && (
                                <>
                                  <div className="my-1 border-t border-white/10" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deletePost(reel.id, myProfile.role || "creator");
                                      setShowMenu(false);
                                      toast.success("Reel deleted.");
                                      goNext();
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-rose-400 hover:bg-rose-500/10 font-bold"
                                  >
                                    <span className="text-base">🗑️</span>
                                    <span>Delete My Reel</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop Side Navigation Buttons */}
        <div className="hidden sm:flex absolute right-[-54px] top-1/2 -translate-y-1/2 flex-col gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={activeIndex === 0}
            className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-[#121217] text-white shadow-xl hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Previous Reel (Up Arrow)"
          >
            <ChevronUp className="size-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={activeIndex === reels.length - 1}
            className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-[#121217] text-white shadow-xl hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Next Reel (Down Arrow)"
          >
            <ChevronDown className="size-5" />
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* COMMENTS DRAWER / SHEET */}
      {/* ================================================= */}
      {showComments && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setShowComments(false)}
          />

          <div className="relative z-10 flex h-[70vh] sm:h-[600px] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-white/15 bg-[#0f0f14] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-bold text-white">Comments</h3>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono text-white/70">
                  {comments.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowComments(false)}
                className="flex size-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-white/5">
              {comments.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-8 text-white/40">
                  <MessageCircle className="size-8 opacity-40 mb-2" />
                  <p className="text-xs font-semibold text-white/80">No comments yet</p>
                  <p className="text-[11px] mt-0.5">Start the conversation on this Reel!</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 pt-3 first:pt-0">
                    <PersonMark mark="you" size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white">
                          {c.authorName}{" "}
                          <span className="text-[10px] font-normal text-white/40 font-mono">
                            @{c.authorHandle}
                          </span>
                        </p>
                        <span className="text-[9px] text-white/40 font-mono">
                          {Math.max(1, Math.round((Date.now() - c.createdAt) / 60000))}m ago
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/80 leading-relaxed">{c.text}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => likeComment(c.id)}
                      className="flex flex-col items-center text-white/40 hover:text-rose-400 transition-colors pt-1"
                    >
                      <Heart className={cn("size-3.5", c.likes > 0 && "text-rose-500 fill-rose-500")} />
                      {c.likes > 0 && (
                        <span className="text-[9px] font-mono font-bold mt-0.5">{c.likes}</span>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            <form
              onSubmit={handleAddComment}
              className="flex items-center gap-2 border-t border-white/10 bg-[#0d0e12] p-3 shrink-0"
            >
              <PersonMark mark="you" size="sm" />
              <Input
                placeholder={`Comment as @${myProfile.handle}...`}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="h-9 text-xs bg-white/5 border-white/10 rounded-xl flex-1 text-white"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!commentText.trim()}
                className="h-9 rounded-xl bg-[#d4ff00] text-black font-bold text-xs px-4 hover:opacity-90 disabled:opacity-40"
              >
                Post
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* CREATOR STATS MODAL (SELF ONLY) */}
      {/* ================================================= */}
      {showStatsModal && isSelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setShowStatsModal(false)}
          />

          <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/15 bg-[#121217] p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="size-5 text-[#d4ff00]" />
                <h3 className="font-display text-base font-black">Your Reel Insights</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStatsModal(false)}
                className="flex size-7 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-white/50">
              Private performance telemetry visible only to you as creator.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase font-bold text-white/40">Total Views</p>
                <p className="mt-1 text-lg font-black text-white">{formatNumber(activeReel.views)}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase font-bold text-white/40">Likes</p>
                <p className="mt-1 text-lg font-black text-rose-400">{formatNumber(activeReel.likes)}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase font-bold text-white/40">Comments</p>
                <p className="mt-1 text-lg font-black text-cyan-400">
                  {formatNumber(comments.length || activeReel.comments)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase font-bold text-white/40">Shares</p>
                <p className="mt-1 text-lg font-black text-purple-400">{formatNumber(activeReel.shares)}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase font-bold text-white/40">Popularity Score</p>
                <p className="mt-1 text-lg font-black text-orange-400">
                  {Math.round(activeReel.popularityScore).toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-[#d4ff00]/20 bg-[#d4ff00]/10 p-3">
                <p className="text-[10px] uppercase font-bold text-[#d4ff00]/70">RIFF Points Earned</p>
                <p className="mt-1 text-lg font-black text-[#d4ff00]">
                  +{activeReel.pointsAwarded || category?.approvalPoints || 50} pts
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowStatsModal(false)}
              className="mt-5 w-full rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
