import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  Check,
  CheckCircle2,
  Copy,
  CornerDownRight,
  Eye,
  Flame,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Play,
  Pause,
  Repeat,
  Send,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Instagram,
  Smile,
} from "lucide-react";
import { PersonMark } from "@/components/person-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fireConfetti } from "@/lib/confetti";
import { playSound } from "@/lib/sounds";
import { canPerformModeration, useComments, useRiff } from "@/lib/store";
import type { Person, Post } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { toast } from "sonner";

export function SocialFeedCard({
  post,
  onTagClick,
  onCategoryClick,
}: {
  post: Post;
  onTagClick?: (tag: string) => void;
  onCategoryClick?: (categoryId: string) => void;
}) {
  const categories = useRiff((s) => s.categories) || [];
  const likedPostIds = useRiff((s) => s.likedPostIds) || [];
  const savedPostIds = useRiff((s) => s.savedPostIds) || [];
  const followingUserIds = useRiff((s) => s.followingUserIds) || [];
  const toggleLikePost = useRiff((s) => s.toggleLikePost);
  const toggleSavePost = useRiff((s) => s.toggleSavePost);
  const toggleFollowUser = useRiff((s) => s.toggleFollowUser);
  const recordNegativeSignal = useRiff((s) => s.recordNegativeSignal);
  const reportPost = useRiff((s) => s.reportPost);
  const addCommentToPost = useRiff((s) => s.addCommentToPost);
  const likeComment = useRiff((s) => s.likeComment);
  const deletePost = useRiff((s) => s.deletePost);
  const rawProfile = useRiff((s) => s.profile);
  const myProfile = rawProfile || { name: "You", handle: "you", role: "creator" };
  const myRole = (myProfile?.role as Person["role"]) || "creator";
  const isAdminRole = myRole === "admin" || myRole === "super_admin" || myRole === "owner";

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Inappropriate or offensive content");
  const [reportDetails, setReportDetails] = useState("");

  const comments = useComments(post?.id || "");

  const safeLiked = Array.isArray(likedPostIds) ? likedPostIds : [];
  const safeSaved = Array.isArray(savedPostIds) ? savedPostIds : [];
  const safeFollowing = Array.isArray(followingUserIds) ? followingUserIds : [];

  const isLiked = post ? safeLiked.includes(post.id) : false;
  const isSaved = post ? safeSaved.includes(post.id) : false;
  const isFollowing = post
    ? (post.authorHandle && safeFollowing.includes(post.authorHandle)) ||
      (post.authorId && safeFollowing.includes(post.authorId))
    : false;
  const isSelf = post ? post.authorHandle === myProfile?.handle || post.authorId === "you" : false;

  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Reel video playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);

  // Category matching
  const category =
    categories.find((c) => c.id === (post.approvedCategoryId || post.userSelectedCategoryId)) ||
    categories[0];

  function handleLike(e?: React.MouseEvent) {
    if (!isLiked) {
      playSound("pop");
      if (e) fireConfetti(e.clientX, e.clientY, 25);
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 800);
    }
    toggleLikePost(post.id);
  }

  function handleDoubleTap(e: React.MouseEvent) {
    if (!isLiked) {
      handleLike(e);
    } else {
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 800);
    }
  }

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentToPost(post.id, commentText, replyingToId || undefined);
    setCommentText("");
    setReplyingToId(null);
    playSound("pop");
    toast.success("Comment posted!");
  }

  function handleCopyShareLink() {
    navigator.clipboard?.writeText(window.location.origin + `/?post=${post.id}`);
    setCopiedLink(true);
    playSound("pop");
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  }

  // Format time ago
  const hoursAgo = Math.max(0, Math.round((Date.now() - post.createdAt) / 3600000));
  const timeLabel = hoursAgo < 1 ? "Just now" : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`;

  return (
    <article className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e14] shadow-xl transition-all duration-200 hover:border-white/20">
      {/* 1. Header: Author info, Category Pill, Follow, More Menu */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <Link to="/you" className="relative group">
            <PersonMark mark={(post.authorMark as any) || "you"} size="sm" />
            {post.type === "reel" && (
              <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-gradient-to-tr from-accent to-mint text-[9px] text-black font-black">
                ▶
              </span>
            )}
          </Link>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-fg hover:underline cursor-pointer">
                {post.authorName}
              </span>
              <span className="text-[11px] text-muted font-medium">@{post.authorHandle}</span>
              {post.isVerified && (
                <CheckCircle2 className="size-3 text-accent fill-accent/20" />
              )}
              {post.authorRole && post.authorRole !== "creator" && (
                <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-1.5 py-0.2 text-[8px] font-black uppercase text-purple-300">
                  {post.authorRole.replace("_", " ")}
                </span>
              )}
              <span className="text-muted/60 text-[10px]">• {timeLabel}</span>
            </div>

            {/* Approved Category Badge with points indicator (Posts only - Reels have no categories) */}
            {post.type !== "reel" && category && (
              <div className="mt-0.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCategoryClick?.(category.id)}
                  className="inline-flex items-center gap-1 rounded-full bg-raised/80 hover:bg-raised px-2 py-0.5 text-[10px] font-semibold text-accent transition-colors border border-accent/20"
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                  {(isSelf || isAdminRole) && (
                    <span className="text-emerald-400 font-mono text-[9px] font-bold">
                      +{post.pointsAwarded || category.approvalPoints} pts
                    </span>
                  )}
                </button>
                {post.location && (
                  <span className="text-[10px] text-muted hidden sm:inline">📍 {post.location}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Header Actions: Follow & Menu */}
        <div className="flex items-center gap-2 relative">
          {!isSelf && (
            <Button
              size="sm"
              variant={isFollowing ? "subtle" : "default"}
              onClick={() => toggleFollowUser(post.authorHandle)}
              className={cn(
                "h-7 rounded-full px-3 text-[11px] font-bold transition-all",
                isFollowing
                  ? "bg-white/5 hover:bg-white/10 text-muted"
                  : "bg-accent text-black hover:opacity-90 shadow-[0_0_15px_rgba(0,240,255,0.3)]",
              )}
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
          )}

          {/* 3-Dot Dropdown / Negative Signal Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-fg transition-colors"
            >
              <MoreHorizontal className="size-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-9 z-50 w-56 overflow-hidden rounded-2xl border border-white/15 bg-surface/95 p-1.5 shadow-2xl backdrop-blur-2xl text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      recordNegativeSignal(post.id, "not_interested", category.id, post.authorHandle);
                      setShowMenu(false);
                      toast.success("Feed updated: Showing less of this content.");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-muted hover:bg-raised hover:text-fg"
                  >
                    <span>👎</span>
                    <div>
                      <p className="font-semibold text-fg">Not Interested</p>
                      <p className="text-[10px] text-muted">Tune feed algorithm</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      recordNegativeSignal(post.id, "mute_category", category.id, post.authorHandle);
                      setShowMenu(false);
                      toast.info(`Muted ${category.name} category.`);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-muted hover:bg-raised hover:text-fg"
                  >
                    <span>🔇</span>
                    <div>
                      <p className="font-semibold text-fg">Mute {category.name}</p>
                      <p className="text-[10px] text-muted">Hide posts from this category</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      recordNegativeSignal(post.id, "mute_creator", category.id, post.authorHandle);
                      setShowMenu(false);
                      toast.info(`Muted @${post.authorHandle}.`);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-muted hover:bg-raised hover:text-fg"
                  >
                    <span>🚫</span>
                    <div>
                      <p className="font-semibold text-fg">Mute @{post.authorHandle}</p>
                      <p className="text-[10px] text-muted">Never show this creator</p>
                    </div>
                  </button>

                  <div className="my-1 border-t border-white/10" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowReportModal(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10 font-semibold"
                  >
                    <span>🚩</span>
                    <span>Report Content</span>
                  </button>

                  {isSelf && (
                    <>
                      <div className="my-1 border-t border-white/10" />
                      <button
                        type="button"
                        onClick={() => {
                          deletePost(post.id, myRole);
                          setShowMenu(false);
                          toast.success("Your post was deleted.");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10 font-bold"
                      >
                        <span>🗑️</span>
                        <span>Delete My Post</span>
                      </button>
                    </>
                  )}

                  {!isSelf && isAdminRole && canPerformModeration(myRole, post.authorRole || "creator") && (
                    <>
                      <div className="my-1 border-t border-white/10" />
                      <button
                        type="button"
                        onClick={() => {
                          deletePost(post.id, myRole);
                          setShowMenu(false);
                          toast.success("Post removed by moderator.");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10 font-bold"
                      >
                        <span>🗑️</span>
                        <span>Delete Post ({myRole.toUpperCase()})</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Media Presentation: Post Image or Reel Short Video */}
      <div className="flex justify-center bg-black w-full">
        <div
          className={cn(
            "relative overflow-hidden bg-black select-none cursor-pointer flex items-center justify-center group w-full",
            post.type === "reel" ? "aspect-[9/16] max-w-[420px] max-h-[747px]" : "aspect-square max-w-[540px]",
          )}
          onDoubleClick={handleDoubleTap}
        >
          {post.type === "reel" ||
          post.mediaUrl?.endsWith(".mp4") ||
          post.mediaUrl?.endsWith(".webm") ||
          post.mediaUrl?.startsWith("blob:") ? (
            <video
              src={post.mediaUrl}
              autoPlay
              muted
              loop
              playsInline
              className={cn(
                "size-full object-cover transition-transform duration-300",
                post.type === "reel" ? "scale-105" : "scale-100",
                post.filter === "vintage" && "sepia contrast-110",
                post.filter === "cinema" && "contrast-125 saturate-110",
                post.filter === "mono" && "grayscale",
                post.filter === "glow" &&
                  "brightness-110 contrast-115 drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]",
              )}
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt={post.caption || "Content"}
              className={cn(
                "size-full object-cover transition-transform duration-300",
                "scale-100",
                post.filter === "vintage" && "sepia contrast-110",
                post.filter === "cinema" && "contrast-125 saturate-110",
                post.filter === "mono" && "grayscale",
                post.filter === "glow" &&
                  "brightness-110 contrast-115 drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]",
              )}
            />
          )}

          {/* Floating Heart Animation on Double Tap */}
          {showHeartPop && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 fade-in duration-300">
              <Heart className="size-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.8)]" />
            </div>
          )}

          {/* Traditional Meme Top/Bottom Text Overlay */}
          {(post.topCaption || post.bottomCaption) && (
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 z-10">
              {post.topCaption && (
                <p
                  className="font-impact text-center text-xl sm:text-2xl font-black uppercase tracking-wider text-white select-none leading-tight"
                  style={{
                    textShadow:
                      "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.9)",
                  }}
                >
                  {post.topCaption}
                </p>
              )}
              {post.bottomCaption && (
                <p
                  className="font-impact text-center text-xl sm:text-2xl font-black uppercase tracking-wider text-white select-none leading-tight"
                  style={{
                    textShadow:
                      "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.9)",
                  }}
                >
                  {post.bottomCaption}
                </p>
              )}
            </div>
          )}

          {/* Reel Specific Controls: Audio track pill, Play/Pause toggle, Sound toggle */}
          {post.type === "reel" && (
            <div className="absolute inset-x-0 bottom-0 p-4 pt-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 flex items-end justify-between">
              <div className="space-y-1.5 max-w-[70%]">
                {post.musicTrack && (
                  <div className="flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[11px] text-white">
                    <Music2 className="size-3 text-accent animate-spin" style={{ animationDuration: "3s" }} />
                    <span className="truncate font-semibold">{post.musicTrack.title}</span>
                    {post.musicTrack.isTrending && (
                      <span className="rounded bg-accent/20 px-1 text-[8px] font-black uppercase text-accent">
                        Viral
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/reels"
                  search={{ id: post.id }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full bg-accent/20 border border-accent/40 px-2.5 py-1 text-[10px] font-bold text-accent hover:bg-accent hover:text-black transition-colors"
                  title="Watch in 9:16 Vertical Reel Viewer"
                >
                  9:16 Reel
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="flex size-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white hover:bg-black/80 transition-colors"
                >
                  {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlaying(!isPlaying);
                  }}
                  className="flex size-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white hover:bg-black/80 transition-colors"
                >
                  {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-white" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Social Interaction Bar: Likes, Comments, Share, Save & Popularity */}
      <div className="p-4 pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Like */}
            <button
              type="button"
              onClick={handleLike}
              className="flex items-center gap-1.5 text-xs font-bold transition-all group"
            >
              <Heart
                className={cn(
                  "size-5 transition-transform group-active:scale-125",
                  isLiked ? "text-rose-500 fill-rose-500" : "text-muted hover:text-fg",
                )}
              />
              <span className={cn(isLiked ? "text-rose-400" : "text-muted")}>
                {formatNumber(post.likes)}
              </span>
            </button>

            {/* Comments */}
            <button
              type="button"
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg transition-colors"
            >
              <MessageCircle className="size-5" />
              <span>{formatNumber(comments.length || post.comments)}</span>
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg transition-colors"
            >
              <Share2 className="size-5" />
              <span>{formatNumber(post.shares)}</span>
            </button>
          </div>

          {/* Right Actions: Save Bookmark & Post Popularity Badge */}
          <div className="flex items-center gap-3">
            {/* Calculated Content Popularity Score */}
            <div
              className="flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[11px] font-black text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.2)]"
              title="Post Popularity calculated by AI (Likes 30%, Views 20%, Comments 15%, Shares 15%, Velocity 10%)"
            >
              <Flame className="size-3.5 fill-orange-400 animate-pulse" />
              <span>{(post.popularityScore / 1000).toFixed(1)}K</span>
            </div>

            <button
              type="button"
              onClick={() => {
                toggleSavePost(post.id);
                playSound("pop");
              }}
              className="text-muted hover:text-fg transition-colors"
            >
              <Bookmark className={cn("size-5", isSaved && "text-accent fill-accent")} />
            </button>
          </div>
        </div>

        {/* 4. Caption & Hashtag Chips */}
        {post.caption && (
          <div className="text-xs text-fg leading-relaxed">
            <span className="font-bold mr-1.5">@{post.authorHandle}</span>
            <span>{post.caption}</span>
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {post.hashtags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick?.(tag)}
                className="text-[11px] font-semibold text-accent/80 hover:text-accent hover:underline"
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </button>
            ))}
          </div>
        )}

        {/* Quick Comment Preview */}
        {comments.length > 0 && !showComments && (
          <button
            type="button"
            onClick={() => setShowComments(true)}
            className="text-[11px] text-muted hover:text-fg transition-colors block text-left"
          >
            View all {comments.length} comments
          </button>
        )}

        {/* Inline Quick Comment Input Box */}
        <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1 border-t border-white/5">
          <Input
            placeholder={
              replyingToId ? "Write a reply..." : "Add a comment as @" + (myProfile?.handle || "you") + "..."
            }
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="h-8 text-xs bg-raised/40 border-white/10 rounded-xl"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!commentText.trim()}
            className="h-8 rounded-xl px-3 bg-accent text-black font-bold text-xs hover:opacity-90 disabled:opacity-40"
          >
            Post
          </Button>
        </form>

        {/* Nested Comments Drawer / Expanded Section */}
        {showComments && (
          <div className="space-y-3 pt-3 border-t border-white/10 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-bold text-muted">
              <span>Discussion & Riffs ({comments.length})</span>
              <button
                type="button"
                onClick={() => setShowComments(false)}
                className="text-[10px] hover:text-fg"
              >
                Hide
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-xl bg-raised/40 p-2.5 text-xs border border-white/5",
                    c.parentId && "ml-5 border-l-2 border-l-accent/40 bg-raised/20",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-fg">@{c.authorHandle}</span>
                      <span className="text-[10px] text-muted">
                        {Math.max(1, Math.round((Date.now() - c.createdAt) / 60000))}m ago
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => likeComment(c.id)}
                      className="flex items-center gap-1 text-[10px] text-muted hover:text-rose-400"
                    >
                      <Heart className="size-3" />
                      <span>{c.likes || 0}</span>
                    </button>
                  </div>
                  <p className="mt-1 text-fg/90">{c.text}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToId(c.id);
                        setCommentText(`@${c.authorHandle} `);
                      }}
                      className="hover:text-accent font-semibold flex items-center gap-1"
                    >
                      <CornerDownRight className="size-2.5" />
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Share Modal Dialog */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-display text-sm font-bold">Share Riff</h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-raised/50 p-4 text-center hover:bg-raised transition-colors"
              >
                {copiedLink ? (
                  <Check className="size-6 text-emerald-400" />
                ) : (
                  <Copy className="size-6 text-accent" />
                )}
                <span className="text-xs font-bold text-fg">
                  {copiedLink ? "Copied!" : "Copy Link"}
                </span>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURI(
                  `Check out this meme on RIFF by @${post.authorHandle}: ${post.caption || ""}`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-raised/50 p-4 text-center hover:bg-raised transition-colors"
              >
                <span className="text-2xl">💬</span>
                <span className="text-xs font-bold text-fg">WhatsApp</span>
              </a>

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-raised/50 p-4 text-center hover:bg-raised transition-colors"
              >
                <Instagram className="size-6 text-rose-400" />
                <span className="text-xs font-bold text-fg">Instagram</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  toast.success("Meme forwarded to your active RIFF direct chats!");
                  setShowShareModal(false);
                }}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-raised/50 p-4 text-center hover:bg-raised transition-colors"
              >
                <Send className="size-6 text-cyan-400" />
                <span className="text-xs font-bold text-fg">Direct Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-surface p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display text-sm font-bold text-rose-400 flex items-center gap-1.5">
                <span>🚩</span>
                <span>Report Content to Moderation</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-fg">Violation Category</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-raised p-2.5 text-xs font-semibold text-fg focus:outline-none"
              >
                <option value="Inappropriate or offensive content">Inappropriate or offensive content</option>
                <option value="Harassment or bullying">Harassment or bullying</option>
                <option value="Low effort / watermark / spam">Low effort / watermark / spam</option>
                <option value="Copyright violation / repost">Copyright violation / repost</option>
                <option value="Misleading caption or tags">Misleading caption or tags</option>
                <option value="Other">Other reason</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted">Additional Details (Optional)</label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe what violates RIFF community guidelines..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-raised p-2.5 text-xs text-fg focus:outline-none resize-none"
              />
            </div>

            <p className="text-[10px] text-muted">
              🔒 Reports are confidential. RIFF safety moderators inspect every report and enforce guidelines.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button size="sm" variant="ghost" onClick={() => setShowReportModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const res = reportPost({
                    postId: post.id,
                    reason: reportReason,
                    details: reportDetails,
                  });
                  setShowReportModal(false);
                  setReportDetails("");
                  if (res.success) {
                    toast.success(res.message);
                  } else {
                    toast.info(res.message);
                  }
                }}
                className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs"
              >
                Submit Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
