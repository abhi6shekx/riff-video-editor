import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bookmark,
  Copy,
  Download,
  Flag,
  Flame,
  MessageCircle,
  Repeat2,
  Send,
  Share2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MemeView } from "@/components/meme-view";
import { PersonMark } from "@/components/person-mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { copyMemeToClipboard, downloadMeme } from "@/lib/meme-render";
import { HUBS, personMap, YOU_ID } from "@/lib/seed";
import { reportContent, toggleLikePost, toggleSavePost, type Post } from "@/lib/services/posts";
import { playSound } from "@/lib/sounds";
import { useChats, useRiff } from "@/lib/store";
import { fireConfetti } from "@/lib/confetti";
import type { Meme } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export function MemeCard({ meme, compact = false }: { meme: Meme | Post; compact?: boolean }) {
  const { user } = useAuth();
  const id = meme.id;
  const isRealPost = "media_url" in meme;
  const image = isRealPost ? meme.media_url : meme.image;
  const top = isRealPost ? meme.top_caption : meme.top;
  const bottom = isRealPost ? meme.bottom_caption : meme.bottom;
  const authorName = isRealPost
    ? meme.author?.display_name || "Creator"
    : personMap[meme.authorId]?.name || "Creator";
  const authorMark = isRealPost
    ? "you"
    : personMap[meme.authorId]?.mark || "you";
  const hubId = isRealPost ? meme.community_id : meme.hubId;
  const hub = HUBS.find((h) => h.id === hubId);
  const createdAt = isRealPost ? new Date(meme.created_at).getTime() : meme.createdAt;

  // Real or simulated like/save state
  const heatedLocal = useRiff((s) => s.heatedIds.includes(id));
  const savedLocal = useRiff((s) => s.savedIds.includes(id));
  const toggleHeatLocal = useRiff((s) => s.toggleHeat);
  const toggleSaveLocal = useRiff((s) => s.toggleSave);

  const [hasLiked, setHasLiked] = useState<boolean>(
    isRealPost ? Boolean(meme.has_liked) : heatedLocal,
  );
  const [likesCount, setLikesCount] = useState<number>(
    isRealPost ? meme.likes_count : meme.likes,
  );
  const [hasSaved, setHasSaved] = useState<boolean>(
    isRealPost ? Boolean(meme.has_saved) : savedLocal,
  );
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const lastTapRef = useState<{ time: number }>({ time: 0 })[0];

  async function handleLike(e?: React.MouseEvent) {
    const next = !hasLiked;
    setHasLiked(next);
    setLikesCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    toggleHeatLocal(id);

    if (next) {
      playSound("cheer");
      if (e) {
        fireConfetti(e.clientX, e.clientY, 35);
      } else {
        fireConfetti();
      }
    } else {
      playSound("pop");
    }

    if (user && isRealPost) {
      await toggleLikePost(id, user.id, hasLiked);
    }
  }

  function handleDoubleTap(e: React.MouseEvent) {
    const now = Date.now();
    if (now - lastTapRef.time < 300) {
      // Double tap detected!
      setShowHeartBurst(true);
      if (!hasLiked) {
        void handleLike(e);
      } else {
        playSound("pop");
        fireConfetti(e.clientX, e.clientY, 25);
      }
      setTimeout(() => setShowHeartBurst(false), 900);
    }
    lastTapRef.time = now;
  }

  async function handleSave() {
    playSound("pop");
    const next = !hasSaved;
    setHasSaved(next);
    toggleSaveLocal(id);

    if (user && isRealPost) {
      await toggleSavePost(id, user.id, hasSaved);
    }
  }

  async function handleCopy() {
    try {
      await copyMemeToClipboard(image, top, bottom);
      playSound("pop");
      toast.success("Meme copied to clipboard!");
    } catch {
      toast.error("Could not copy directly. Use download instead.");
    }
  }

  async function handleDownload() {
    try {
      await downloadMeme(image, top, bottom, `riff-${id}.jpg`);
      playSound("cash");
      toast.success("Meme downloaded!");
    } catch {
      toast.error("Could not download.");
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/m/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${top || "RIFF"} - Meme`,
          text: `${top} ${bottom}`.trim(),
          url,
        });
        playSound("pop");
        return;
      } catch {
        // user cancelled
      }
    }
    await navigator.clipboard.writeText(url);
    playSound("pop");
    toast.success("Link copied to clipboard!");
  }

  async function submitReport() {
    if (!reportReason.trim()) return;
    playSound("pop");
    const reporterId = user?.id || "00000000-0000-0000-0000-000000000000";
    await reportContent({
      reporterId,
      targetType: "post",
      targetId: id,
      reason: reportReason,
    });
    setReportOpen(false);
    setReportReason("");
    toast.success("Report submitted for review. Thank you.");
  }

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-surface/90 backdrop-blur-xl transition-all duration-300 hover:border-accent/40 hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)]">
      {/* Creator Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
        <PersonMark mark={authorMark} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-fg group-hover:text-accent transition-colors">
              {authorName}
            </p>
            <span className="rounded-full bg-accent/15 px-1.5 py-0.2 text-[9px] font-bold text-accent">
              PRO
            </span>
          </div>
          <p className="truncate text-[11px] text-muted flex items-center gap-1.5">
            <span>{hub ? hub.name : "Open Riff"}</span>
            <span>·</span>
            <span>{timeAgo(createdAt)}</span>
          </p>
        </div>

        {("parentId" in meme && meme.parentId) || ("remix_parent_id" in meme && meme.remix_parent_id) ? (
          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
            ⚡ Remix
          </span>
        ) : null}
      </div>

      {/* Meme Viewer with Double-Tap Heart Burst */}
      <div className="relative cursor-pointer select-none" onClick={handleDoubleTap}>
        <MemeView src={image} top={top} bottom={bottom} alt={top || "Riff"} />

        {/* Double Tap Heart Burst Overlay */}
        {showHeartBurst && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center animate-in zoom-in-50 fade-in duration-200">
            <div className="flex flex-col items-center justify-center rounded-full bg-black/60 p-6 backdrop-blur-md border border-amber-400/40 shadow-[0_0_50px_rgba(245,158,11,0.6)]">
              <Flame className="size-16 fill-amber-400 text-amber-400 animate-bounce" />
              <span className="mt-1 font-display text-xs font-black text-amber-300 tracking-wider">
                HEATED! 🔥
              </span>
            </div>
          </div>
        )}
      </div>

      {compact ? null : (
        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-raised/20 border-t border-white/[0.04]">
          {/* Flame / Heat */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 rounded-full px-3 text-xs transition-all",
              hasLiked
                ? "bg-amber-500/15 text-amber-400 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)] border border-amber-500/30"
                : "text-muted hover:text-fg hover:bg-raised/80",
            )}
            onClick={handleLike}
            aria-pressed={hasLiked}
          >
            <Flame className={cn("size-4 transition-transform group-hover:scale-110", hasLiked && "fill-amber-400")} />
            <span className="tabular-nums font-bold">{likesCount.toLocaleString("en-IN")}</span>
          </Button>

          {/* Comments */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-full px-3 text-xs text-muted hover:text-accent hover:bg-accent/10 transition-colors"
            asChild
          >
            <Link to="/m/$id" params={{ id }} onClick={() => playSound("pop")}>
              <MessageCircle className="size-4" />
              <span className="tabular-nums font-semibold">
                {isRealPost ? meme.comments_count : meme.comments}
              </span>
            </Link>
          </Button>

          {/* Remix Studio Button */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-full px-3 text-xs text-muted hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
            asChild
          >
            <Link to="/studio" search={{ remix: id }} onClick={() => playSound("pop")}>
              <Repeat2 className="size-4" />
              <span className="tabular-nums font-semibold">
                {isRealPost ? meme.shares_count : meme.remixes}
              </span>
            </Link>
          </Button>

          <SendToChat memeId={id} />

          <div className="flex-1" />

          {/* Secondary Actions */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopy}
              className="text-muted hover:text-fg rounded-full"
              title="Copy meme image"
              aria-label="Copy meme image"
            >
              <Copy className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDownload}
              className="text-muted hover:text-fg rounded-full"
              title="Download meme"
              aria-label="Download meme"
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleShare}
              className="text-muted hover:text-accent rounded-full"
              title="Share or copy link"
              aria-label="Share"
            >
              <Share2 className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn("rounded-full", hasSaved ? "text-accent fill-accent" : "text-muted hover:text-fg")}
              onClick={handleSave}
              aria-label={hasSaved ? "Unsave" : "Save"}
            >
              <Bookmark className={cn("size-3.5", hasSaved && "fill-accent")} />
            </Button>

            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-muted hover:text-rose-400 rounded-full" title="Report post" aria-label="Report">
                  <Flag className="size-3" />
                </Button>
              </DialogTrigger>
              <DialogContent title="Report Content">
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-muted">
                    Help keep RIFF safe and authentic. What is wrong with this post?
                  </p>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Reason: spam, copyright, abusive, NSFW..."
                    className="h-24 w-full rounded-xl border border-border bg-raised p-2.5 text-xs text-fg outline-none focus:border-accent"
                  />
                  <Button className="w-full" size="sm" onClick={submitReport} disabled={!reportReason.trim()}>
                    Submit Report
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </article>
  );
}

function SendToChat({ memeId }: { memeId: string }) {
  const [open, setOpen] = useState(false);
  const chats = useChats();
  const sendMeme = useRiff((s) => s.sendMeme);
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Send to chat">
          <Send className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent title="Send to a room">
        <ul className="grid gap-1">
          {chats.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-raised"
                onClick={() => {
                  sendMeme(c.id, memeId);
                  setOpen(false);
                  void navigate({ to: "/chat/$id", params: { id: c.id } });
                }}
              >
                <PersonMark mark={c.mark} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm">{c.name}</span>
                  <span className="block truncate text-xs text-muted">{c.subtitle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
