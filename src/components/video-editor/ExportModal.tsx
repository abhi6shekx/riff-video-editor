import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Film,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { useStudio } from "@/lib/studio/store";
import { useRiff } from "@/lib/store";
import { exportStudioVideo } from "@/lib/studio/renderer";
import { fireConfetti } from "@/lib/confetti";
import { playSound } from "@/lib/sounds";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const navigate = useNavigate();
  const project = useStudio((s) => s.project);
  const submitContent = useRiff((s) => s.submitContent);
  const categories = useRiff((s) => s.categories) || [];

  const [resolution, setResolution] = useState<"720p" | "1080p">("720p");
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [format, setFormat] = useState<"mp4" | "webm">("mp4");
  const [exportedFormat, setExportedFormat] = useState<"mp4" | "webm">("webm");

  const [isExporting, setIsExporting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [exportedThumbnail, setExportedThumbnail] = useState<string | null>(null);

  if (!isOpen) return null;

  function handlePublishToReels() {
    if (!exportedUrl) return;
    setIsPublishing(true);

    try {
      const activeCat = categories.find((c) => c.status === "active") || categories[0];
      submitContent({
        type: "reel",
        mediaUrl: exportedUrl,
        caption: project.title || "My RIFF Reel",
        categoryId: activeCat?.id || "cat_relatable",
        hashtags: ["#riff", "#reel", "#studio"],
        aspectRatio: project.aspectRatio === "9:16" ? "9:16" : "1:1",
      });

      fireConfetti();
      playSound("cheer");
      toast.success("🚀 Reel published live to RIFF Feed!");
      onClose();
      void navigate({ to: "/reels" });
    } catch (e: any) {
      toast.error(`Publish failed: ${e.message}`);
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleStartExport() {
    setIsExporting(true);
    setProgress(0);
    setStatusText("Initializing canvas export engine...");

    try {
      const result = await exportStudioVideo(
        project,
        (pct, step) => {
          setProgress(pct);
          setStatusText(step);
        },
        { resolution, fps, format },
      );

      setExportedUrl(result.url);
      setExportedThumbnail(result.thumbnail);
      setExportedFormat((result.format as "mp4" | "webm") || "webm");
      fireConfetti();
      playSound("cheer");
      toast.success("Video exported successfully!");
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error(`Export failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  }

  function handleDownload() {
    if (!exportedUrl) return;
    const a = document.createElement("a");
    a.href = exportedUrl;
    const ext = exportedFormat || "webm";
    a.download = `${(project.title || "video").toLowerCase().replace(/\s+/g, "_")}_${resolution}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleReset() {
    setExportedUrl(null);
    setProgress(0);
    setStatusText("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none text-white animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#11141f] border border-white/15 p-6 shadow-2xl flex flex-col gap-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            if (!isExporting) onClose();
          }}
          disabled={isExporting}
          className="absolute top-5 right-5 p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 text-white shadow-md">
            <Film className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Export Video</h2>
            <p className="text-xs text-white/50">
              High-definition client-side render • {project.aspectRatio} canvas
            </p>
          </div>
        </div>

        {/* ----------------- STATE A: EXPORT FINISHED ----------------- */}
        {exportedUrl ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center justify-center">
              <div className="relative aspect-[9/16] max-h-56 rounded-2xl overflow-hidden border border-cyan-500/40 shadow-xl bg-black">
                <video
                  src={exportedUrl}
                  controls
                  autoPlay
                  playsInline
                  className="size-full object-contain"
                />
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm font-bold text-white flex items-center justify-center gap-1.5 text-cyan-400">
                <CheckCircle2 className="size-4" />
                <span>Ready for Download!</span>
              </p>
              <p className="text-xs text-white/50 mt-0.5">
                {resolution} • {fps} FPS • {project.duration.toFixed(1)}s •{" "}
                <span className="font-semibold text-cyan-300 uppercase">{exportedFormat}</span>
              </p>
            </div>

            {/* Mac QuickTime Compatibility Info */}
            {exportedFormat === "webm" && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs text-left">
                <AlertCircle className="size-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-amber-300">Mac / QuickTime Tip:</span>
                  <span className="text-[11px] text-amber-200/80 leading-relaxed">
                    QuickTime Player WebM files ko support nahi karta. Video dekhne ke liye file par{" "}
                    <strong>Right-click &rarr; Open With &rarr; Google Chrome ya VLC</strong> karein, ya directly Instagram / WhatsApp par upload karein.
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handlePublishToReels}
                disabled={isPublishing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#d4ff00] hover:bg-[#bce600] text-black font-black text-xs shadow-lg shadow-[#d4ff00]/20 active:scale-95 transition-all"
              >
                <Sparkles className="size-4" />
                <span>{isPublishing ? "Publishing to Feed..." : "Publish Reel to RIFF Feed"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
                >
                  <Download className="size-3.5" />
                  <span>Download .{exportedFormat} File</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  title="Export with different settings"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ----------------- STATE B: SETTINGS OR RENDERING ----------------- */
          <div className="flex flex-col gap-4">
            {/* Resolution Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                Resolution
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "720p" as const, label: "720p HD", desc: "Fast export • Social ready" },
                  { id: "1080p" as const, label: "1080p Full HD", desc: "Crisp studio clarity" },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={isExporting}
                    onClick={() => setResolution(r.id)}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all",
                      resolution === r.id
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm"
                        : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10",
                    )}
                  >
                    <p className="text-xs font-bold">{r.label}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Rate FPS */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                Frame Rate
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([24, 30, 60] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    disabled={isExporting}
                    onClick={() => setFps(f)}
                    className={cn(
                      "py-2 rounded-xl border text-xs font-mono font-bold transition-colors",
                      fps === f
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                        : "bg-white/5 border-white/10 text-white/60 hover:text-white",
                    )}
                  >
                    {f} FPS
                  </button>
                ))}
              </div>
            </div>

            {/* Video Format */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                Container Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "mp4" as const, label: "MP4 (Universal)" },
                  { id: "webm" as const, label: "WebM (High Compression)" },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    disabled={isExporting}
                    onClick={() => setFormat(fmt.id)}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-colors",
                      format === fmt.id
                        ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                        : "bg-white/5 border-white/10 text-white/60 hover:text-white",
                    )}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-white/40 mt-0.5">
                Note: In modern Chromium browsers, WebM is the native high-efficiency format. Plays everywhere (Chrome, VLC, Instagram, WhatsApp).
              </p>
            </div>

            {/* Rendering Progress View */}
            {isExporting ? (
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-cyan-400">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Rendering Video...</span>
                  </span>
                  <span className="font-mono text-cyan-300">{progress}%</span>
                </div>

                <div className="h-2 w-full rounded-full bg-black/60 overflow-hidden border border-white/10">
                  <div
                    style={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-150"
                  />
                </div>

                <p className="text-[10px] text-white/50 text-center font-mono mt-1">
                  {statusText}
                </p>
              </div>
            ) : (
              /* Export Trigger Button */
              <button
                type="button"
                onClick={handleStartExport}
                className="mt-2 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <Download className="size-4" />
                <span>Render & Export {resolution}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
