import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRiff } from "@/lib/store";
import type { Post, Person } from "@/lib/types";
import type { RenderProgress, RenderResult } from "@/lib/reel-editor/types";
import { playSound } from "@/lib/sounds";
import { fireConfetti } from "@/lib/confetti";
import { toast } from "sonner";
import {
  Check,
  Sparkles,
  Download,
  ShieldCheck,
  Clock,
  ExternalLink,
  Film,
  Zap,
} from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: RenderProgress | null;
  result: RenderResult | null;
  onStartExport: () => void;
  username: string;
  defaultTitle?: string;
  filter?: string;
  speed?: number;
  musicTrackTitle?: string;
}

export function ExportModal({
  isOpen,
  onClose,
  progress,
  result,
  onStartExport,
  username,
  defaultTitle = "My RIFF Reel",
  filter,
  speed,
  musicTrackTitle,
}: ExportModalProps) {
  const navigate = useNavigate();

  // Store bindings
  const categories = useRiff((s) => s.categories) || [];
  const submitContent = useRiff((s) => s.submitContent);
  const profile = useRiff((s) => s.profile);
  const pointsWallet = useRiff((s) => s.pointsWallet) || 0;

  const userRole = (profile?.role as Person["role"]) || "creator";
  const isAdminRole =
    userRole === "admin" || userRole === "super_admin" || userRole === "owner";

  // Form states
  const [title, setTitle] = useState(defaultTitle);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || "cat_relatable",
  );
  const [hashtagsInput, setHashtagsInput] = useState("#riff #viral #creators");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [submittedPost, setSubmittedPost] = useState<Post | null>(null);

  // Sync default title when opened
  useEffect(() => {
    if (defaultTitle && !title) {
      setTitle(defaultTitle);
    }
  }, [defaultTitle, title]);

  // Keep category valid if categories load
  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  if (!isOpen) return null;

  const isRendering = progress !== null && progress.progress < 100;
  const isDone = result !== null && progress?.progress === 100;
  const activeCategory =
    categories.find((c) => c.id === selectedCategoryId) || categories[0];

  function handleDownload() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `riff-reel-@${username}-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    playSound("pop");
    toast.success("Download started!");
  }

  function handlePublish() {
    if (!result) return;
    setIsPublishing(true);

    const parsedHashtags = hashtagsInput
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));

    const targetCat =
      categories.find((c) => c.id === selectedCategoryId) ||
      categories.find((c) => c.isDefault && c.status === "active") ||
      categories[0];

    if (targetCat && targetCat.status !== "active") {
      toast.error(`Category "${targetCat.name}" is currently disabled for new submissions.`);
      setIsPublishing(false);
      return;
    }

    if (targetCat && targetCat.allowedTypes === "post") {
      toast.error(`Category "${targetCat.name}" only accepts standard image posts, not 9:16 reels.`);
      setIsPublishing(false);
      return;
    }

    const newPost = submitContent({
      type: "reel",
      mediaUrl: result.url,
      caption: title.trim() || defaultTitle || "RIFF Reel",
      categoryId: targetCat?.id || "cat_relatable",
      hashtags: parsedHashtags,
      aspectRatio: "9:16",
      musicTrack: musicTrackTitle
        ? { title: musicTrackTitle, artist: `@${username}` }
        : undefined,
      filter,
      speed,
    });

    playSound("cheer");
    fireConfetti(window.innerWidth / 2, window.innerHeight / 2, 40);

    setSubmittedPost(newPost);
    setIsPublished(true);
    setIsPublishing(false);

    if (isAdminRole) {
      toast.success(
        `⚡ Admin reel auto-approved & live on feed! +${targetCat?.approvalPoints || 10} pts credited.`,
      );
    } else {
      toast.success(
        `Reel submitted for review! +${targetCat?.approvalPoints || 10} RIFF points pending approval.`,
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🎬</span> RIFF Reel Export & Publish
            </h2>
            <p className="text-xs text-white/50">
              High-definition 1080×1920 with permanent RIFF watermark
            </p>
          </div>
          {!isRendering && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* RENDERING IN PROGRESS */}
        {isRendering && (
          <div className="my-8 space-y-5 text-center">
            <div className="relative mx-auto h-20 w-20">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#d4ff00]/20 border-t-[#d4ff00]" />
              <div className="flex h-full w-full items-center justify-center font-mono text-sm font-bold text-[#d4ff00]">
                {progress.progress}%
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">{progress.stage}</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#d4ff00] to-cyan-400 transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="text-[11px] text-white/40">
                Compositing clips, WebAudio mixing, typography, and embedding RIFF watermark...
              </p>
            </div>
          </div>
        )}

        {/* INITIAL STATE / PRE-EXPORT */}
        {!isRendering && !isDone && (
          <div className="my-6 space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#d4ff00]">
                Export Specification
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
                <div>
                  📐 Resolution: <span className="text-white font-medium">1080 × 1920 (9:16)</span>
                </div>
                <div>
                  ⚡ Frame Rate: <span className="text-white font-medium">30 FPS</span>
                </div>
                <div>
                  🎧 Audio: <span className="text-white font-medium">Stereo WebAudio Mixed</span>
                </div>
                <div>
                  🏷 Watermark: <span className="text-white font-medium">@{username} Embedded</span>
                </div>
              </div>
            </div>

            <button
              onClick={onStartExport}
              className="w-full rounded-xl bg-[#d4ff00] py-3.5 text-sm font-extrabold text-black transition hover:opacity-90 shadow-lg shadow-[#d4ff00]/20"
            >
              Start 1080p Render
            </button>
          </div>
        )}

        {/* COMPLETED EXPORT */}
        {isDone && result && (
          <div className="my-6 space-y-5">
            {!isPublished ? (
              <>
                {/* VIDEO PREVIEW */}
                <div className="flex gap-4 items-center rounded-xl border border-white/10 bg-black/60 p-3">
                  <video
                    src={result.url}
                    controls
                    playsInline
                    className="h-32 w-20 rounded-lg object-cover bg-black border border-white/10 shrink-0"
                  />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#d4ff00]/20 px-2 py-0.5 text-[10px] font-bold text-[#d4ff00]">
                        RENDER COMPLETE
                      </span>
                    </div>
                    <p className="text-xs text-white/80">
                      Duration: <span className="font-mono text-white">{result.duration.toFixed(1)}s</span>
                    </p>
                    <p className="text-xs text-white/80">
                      Size:{" "}
                      <span className="font-mono text-white">
                        {(result.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </p>
                    <button
                      onClick={handleDownload}
                      className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
                    >
                      <Download className="size-3.5" /> Download File (.webm)
                    </button>
                  </div>
                </div>

                {/* PUBLISH SECTION */}
                <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Publish to RIFF Contest Feed
                    </h3>
                    <span className="text-[10px] font-bold text-[#d4ff00]">
                      +{activeCategory?.approvalPoints || 10} RIFF Points
                    </span>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-white/40">
                      Reel Caption / Title
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your reel a catchy title..."
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#d4ff00]"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-black/60 border border-white/10 px-3 py-2.5 text-xs">
                    <span className="text-white/60 text-[11px] font-semibold">Feed Destination:</span>
                    <span className="font-bold text-[#d4ff00] flex items-center gap-1.5 text-xs">
                      <span>🎬</span>
                      <span>9:16 Creator Reels Feed</span>
                    </span>
                  </div>

                  {/* HASHTAGS */}
                  <div>
                    <label className="mb-1 block text-[11px] text-white/40">Hashtags</label>
                    <input
                      value={hashtagsInput}
                      onChange={(e) => setHashtagsInput(e.target.value)}
                      placeholder="#riff #viral #reels"
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#d4ff00]"
                    />
                  </div>

                  {/* ROLE & MODERATION NOTICE */}
                  <div
                    className={`rounded-xl border p-3 text-xs space-y-1 ${
                      isAdminRole
                        ? "border-[#d4ff00]/30 bg-[#d4ff00]/10 text-white"
                        : "border-amber-500/30 bg-amber-500/10 text-white"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      {isAdminRole ? (
                        <>
                          <Zap className="size-3.5 text-[#d4ff00]" />
                          <span className="text-[#d4ff00]">
                            ⚡ Admin Privileges Detected (@{profile?.handle || username} · {userRole.toUpperCase()})
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5 text-amber-300" />
                          <span className="text-amber-300">
                            Moderator Review & Points Reward
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed">
                      {isAdminRole
                        ? `As a RIFF ${userRole}, your reel will be immediately auto-approved, published live to the feed, and +${activeCategory?.approvalPoints || 10} RIFF points will be credited to your wallet.`
                        : `Your reel will enter the RIFF Admin Review Queue. Once approved by a moderator, it will go live on the main feed and award +${activeCategory?.approvalPoints || 10} RIFF Points to your wallet.`}
                    </p>
                  </div>

                  <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="w-full rounded-xl bg-gradient-to-r from-[#d4ff00] to-emerald-400 py-3 text-xs font-black text-black transition hover:opacity-90 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isPublishing ? (
                      <>
                        <div className="size-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                        <span>Submitting to RIFF Moderation...</span>
                      </>
                    ) : isAdminRole ? (
                      <>
                        <Zap className="size-3.5" />
                        <span>Publish Live to Feed & Claim +{activeCategory?.approvalPoints || 10} pts</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3.5" />
                        <span>🚀 Submit for Admin Review & Rewards (+{activeCategory?.approvalPoints || 10} pts)</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* SUCCESS STATE */
              <div className="rounded-xl border border-[#d4ff00]/30 bg-[#d4ff00]/10 p-6 text-center space-y-4">
                <div className="text-4xl animate-bounce">
                  {isAdminRole ? "⚡" : "🎉"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isAdminRole
                      ? "Reel Auto-Approved & Published Live!"
                      : "Reel Submitted for Review!"}
                  </h3>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        isAdminRole
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {isAdminRole ? (
                        <>
                          <ShieldCheck className="size-3" /> Status: Live & Approved
                        </>
                      ) : (
                        <>
                          <Clock className="size-3" /> Status: Under Review
                        </>
                      )}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      +{submittedPost?.pointsAwarded || activeCategory?.approvalPoints || 10} RIFF Pts
                    </span>
                  </div>
                </div>

                <p className="text-xs text-white/70 max-w-sm mx-auto leading-relaxed">
                  {isAdminRole
                    ? `Your reel "${title || defaultTitle}" is now live on the RIFF reels feed in ${activeCategory?.name}! ${submittedPost?.pointsAwarded || activeCategory?.approvalPoints || 10} RIFF Points have been deposited into your wallet.`
                    : `Your reel "${title || defaultTitle}" (${activeCategory?.name}) is currently in the RIFF Admin Review Queue. You can track its status in your profile or view it in the moderation dashboard.`}
                </p>

                {isAdminRole ? (
                  <div className="rounded-xl bg-black/40 border border-white/10 p-3 text-xs text-left space-y-1">
                    <div className="flex justify-between text-white/60 text-[11px]">
                      <span>Points Wallet Balance:</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {pointsWallet} pts
                      </span>
                    </div>
                    <div className="flex justify-between text-white/60 text-[11px]">
                      <span>Reviewer:</span>
                      <span className="font-mono text-[#d4ff00]">
                        @{profile?.handle || username} (Self-approved)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-black/40 border border-white/10 p-3 text-xs text-left space-y-1">
                    <div className="flex justify-between text-white/60 text-[11px]">
                      <span>Author:</span>
                      <span className="font-mono text-white">@{profile?.handle || username}</span>
                    </div>
                    <div className="flex justify-between text-white/60 text-[11px]">
                      <span>Category:</span>
                      <span className="font-medium text-[#d4ff00]">
                        {activeCategory?.icon} {activeCategory?.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-white/60 text-[11px]">
                      <span>Reward upon approval:</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        +{activeCategory?.approvalPoints || 10} pts
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-2 grid grid-cols-2 gap-2">
                  {isAdminRole ? (
                    <Link
                      to="/reels"
                      search={{ id: submittedPost?.id }}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-[#d4ff00] px-3 py-2.5 text-xs font-black text-black hover:opacity-90 transition"
                    >
                      <Film className="size-3.5" />
                      <span>Watch on Reels</span>
                    </Link>
                  ) : (
                    <Link
                      to="/you"
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-[#d4ff00] px-3 py-2.5 text-xs font-black text-black hover:opacity-90 transition"
                    >
                      <ExternalLink className="size-3.5" />
                      <span>Track in Profile</span>
                    </Link>
                  )}

                  <Link
                    to={isAdminRole ? "/admin" : "/you"}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition"
                  >
                    <span>{isAdminRole ? "Admin Dashboard" : "My Submissions"}</span>
                  </Link>
                </div>

                <div className="flex justify-center gap-3 pt-1">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition"
                  >
                    <Download className="size-3" />
                    <span>Download file (.webm)</span>
                  </button>
                  <span className="text-white/20">•</span>
                  <button
                    onClick={onClose}
                    className="text-[11px] text-white/60 hover:text-white transition"
                  >
                    Close Studio Modal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
