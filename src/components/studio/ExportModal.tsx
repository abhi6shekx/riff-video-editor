import { useState } from "react";
import {
  Check,
  Download,
  Film,
  Flame,
  Loader2,
  Share2,
  Sparkles,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { useStudio } from "@/lib/studio/store";
import { exportStudioVideo } from "@/lib/studio/renderer";
import type { ExportSettings } from "@/lib/studio/types";
import { useRiff } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fireConfetti } from "@/lib/confetti";
import { playSound } from "@/lib/sounds";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function ExportModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const project = useStudio((s) => s.project);
  const categories = useRiff((s) => s.categories);
  const submitContent = useRiff((s) => s.submitContent);

  const [settings, setSettings] = useState<ExportSettings>({
    resolution: "1080p",
    fps: 30,
    quality: "high",
    format: "mp4",
  });

  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStep, setRenderStep] = useState("");
  const [exportedResult, setExportedResult] = useState<{
    url: string;
    blob: Blob;
    thumbnail: string;
  } | null>(null);

  // RIFF Post metadata
  const [postCaption, setPostCaption] = useState(
    project.memeMode
      ? `${project.memeTopText} ${project.memeBottomText}`
      : project.title,
  );
  const [hashtagsStr, setHashtagsStr] = useState("#riff #viral #reels");
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id || "cat_relatable",
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCategory =
    categories.find((c) => c.id === selectedCategoryId) || categories[0];

  async function handleStartExport() {
    setIsRendering(true);
    setRenderProgress(0);
    setRenderStep("Initializing rendering pipeline...");

    try {
      const result = await exportStudioVideo(project, (percent, step) => {
        setRenderProgress(percent);
        setRenderStep(step);
      });

      setExportedResult(result);
      playSound("cheer");
      fireConfetti(window.innerWidth / 2, window.innerHeight / 2, 40);
      toast.success("Video render completed successfully!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to render video in browser. Please try again.");
    } finally {
      setIsRendering(false);
    }
  }

  function handleDownloadFile() {
    if (!exportedResult) return;
    const a = document.createElement("a");
    a.href = exportedResult.url;
    a.download = `riff-reel-${Date.now()}.${settings.format === "mp4" ? "mp4" : "webm"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    playSound("pop");
    toast.success("Download started!");
  }

  function handlePostToRiff() {
    if (!exportedResult) return;
    setIsPublishing(true);

    const hashtags = hashtagsStr
      .split(/[\s,]+/)
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .filter((t) => t.length > 1);

    const created = submitContent({
      type: "reel",
      mediaUrl: exportedResult.thumbnail || project.clips[0]?.sourceUrl || "/memes/desk.jpg",
      caption: postCaption,
      topCaption: project.memeMode ? project.memeTopText : undefined,
      bottomCaption: project.memeMode ? project.memeBottomText : undefined,
      categoryId: selectedCategoryId,
      hashtags,
      aspectRatio: project.aspectRatio === "1:1" ? "1:1" : project.aspectRatio === "4:5" ? "4:5" : "9:16",
      musicTrack: project.audioTracks[0]
        ? { title: project.audioTracks[0].title, artist: project.audioTracks[0].artist, isTrending: true }
        : undefined,
      filter: project.adjustments.filterPreset,
      speed: project.clips[0]?.speed || 1.0,
    });

    playSound("cheer");
    setPublishedPostId(created.id);
    setIsPublishing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-surface p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent/20 text-accent">
              <Film className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-black text-fg">Export Reel & Post</h3>
              <p className="text-[10px] text-muted">Client-side rendering • 1080p / 30fps</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-raised p-1.5 text-muted hover:text-fg hover:bg-white/10 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 1. Pre-render Settings State */}
        {!exportedResult && !isRendering && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">Resolution</label>
                <div className="flex rounded-xl bg-raised p-1 border border-white/10">
                  {(["720p", "1080p", "4K"] as const).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setSettings({ ...settings, resolution: res })}
                      className={cn(
                        "flex-1 rounded-lg py-1 text-xs font-bold transition-all",
                        settings.resolution === res
                          ? "bg-accent text-black shadow-sm"
                          : "text-muted hover:text-fg",
                      )}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">Frame Rate</label>
                <div className="flex rounded-xl bg-raised p-1 border border-white/10">
                  {([24, 30, 60] as const).map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => setSettings({ ...settings, fps })}
                      className={cn(
                        "flex-1 rounded-lg py-1 text-xs font-bold transition-all",
                        settings.fps === fps
                          ? "bg-purple-500 text-white shadow-sm"
                          : "text-muted hover:text-fg",
                      )}
                    >
                      {fps} fps
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-raised/50 border border-white/10 p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Aspect Ratio:</span>
                <span className="font-mono text-accent font-bold">{project.aspectRatio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Total Clips:</span>
                <span className="font-bold text-fg">{project.clips.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Duration:</span>
                <span className="font-mono text-fg">{project.duration.toFixed(1)} seconds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Estimated Render Time:</span>
                <span className="font-mono text-emerald-400 font-bold">~2 to 4 seconds</span>
              </div>
            </div>

            <Button
              type="button"
              size="lg"
              onClick={handleStartExport}
              className="w-full rounded-2xl bg-gradient-to-r from-accent via-cyan-400 to-mint text-black font-black text-xs shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:scale-105 active:scale-95 transition-all"
            >
              Start Video Render
            </Button>
          </div>
        )}

        {/* 2. Rendering Progress State */}
        {isRendering && (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent/20 text-accent border border-accent/40 animate-pulse">
              <Loader2 className="size-8 animate-spin" />
            </div>

            <div>
              <h4 className="font-display text-base font-black text-fg">Rendering Reel...</h4>
              <p className="text-xs text-muted mt-1">{renderStep}</p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="h-3 w-full rounded-full bg-black/60 border border-white/10 overflow-hidden">
                <div
                  style={{ width: `${renderProgress}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-accent to-pink-500 transition-all duration-200"
                />
              </div>
              <p className="font-mono text-[11px] text-accent font-bold">{renderProgress}%</p>
            </div>
          </div>
        )}

        {/* 3. Export Complete & Post to RIFF State */}
        {exportedResult && !publishedPostId && (
          <div className="space-y-4">
            {/* Video Preview Player */}
            <div className="relative aspect-[9/16] max-h-[220px] mx-auto rounded-2xl overflow-hidden bg-black border border-white/10 shadow-inner flex items-center justify-center">
              <video
                src={exportedResult.url}
                controls
                autoPlay
                loop
                playsInline
                className="size-full object-contain"
              />
            </div>

            {/* Download Button */}
            <Button
              type="button"
              variant="subtle"
              onClick={handleDownloadFile}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/20 py-2.5 text-xs font-bold hover:bg-white/10"
            >
              <Download className="size-4" />
              <span>Download MP4 / WebM to Device</span>
            </Button>

            {/* Publishing Settings to RIFF */}
            <div className="border-t border-white/10 pt-3 space-y-3">
              <div>
                <label className="block text-xs font-bold text-fg mb-1">Reel Caption</label>
                <Textarea
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Caption for feed..."
                  rows={2}
                  className="bg-raised border-white/10 text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs">
                <span className="text-muted text-[11px] font-semibold">Feed Destination:</span>
                <span className="font-bold text-accent flex items-center gap-1.5 text-xs">
                  <span>🎬</span>
                  <span>9:16 Creator Reels Feed</span>
                </span>
              </div>

              <Button
                type="button"
                size="lg"
                disabled={isPublishing}
                onClick={handlePostToRiff}
                className="w-full rounded-2xl bg-gradient-to-r from-accent via-cyan-400 to-mint text-black font-black text-xs shadow-[0_0_20px_rgba(0,240,255,0.4)]"
              >
                {isPublishing ? "Submitting..." : "Post Reel to RIFF Community"}
              </Button>
            </div>
          </div>
        )}

        {/* 4. Published Success State */}
        {publishedPostId && (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Check className="size-8" />
            </div>

            <div>
              <h4 className="font-display text-lg font-black text-fg">Reel Submitted!</h4>
              <p className="text-xs text-muted mt-1">
                Your edited reel is sent to moderators under{" "}
                <strong className="text-accent">{currentCategory.name}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="subtle"
                onClick={() => {
                  onClose();
                  void navigate({ to: "/admin" });
                }}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                View Admin Queue
              </Button>
              <Button
                onClick={() => {
                  onClose();
                  void navigate({ to: "/" });
                }}
                className="flex-1 rounded-xl bg-accent text-black font-bold text-xs"
              >
                Go to Feed
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
