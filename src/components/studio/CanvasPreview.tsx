import { useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useStudio } from "@/lib/studio/store";
import {
  getDimensionsForRatio,
  renderStudioFrame,
} from "@/lib/studio/renderer";
import { cn } from "@/lib/utils";

export function CanvasPreview({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const project = useStudio((s) => s.project);
  const isPlaying = useStudio((s) => s.isPlaying);
  const currentTime = useStudio((s) => s.currentTime);
  const togglePlay = useStudio((s) => s.togglePlay);
  const seek = useStudio((s) => s.seek);
  const isMuted = useStudio((s) => s.isMuted);
  const toggleMute = useStudio((s) => s.toggleMute);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const dims = getDimensionsForRatio(project.aspectRatio, "preview");

  // Render on currentTime or project changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    renderStudioFrame(ctx, project, currentTime, dims);
  }, [project, currentTime, dims]);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      const nextTime = currentTime + deltaSec;
      if (nextTime >= project.duration) {
        seek(0);
      } else {
        seek(nextTime);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTime, project.duration, seek]);

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  }

  function handleToggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }

  // Dynamic aspect ratio CSS class
  const aspectClass =
    project.aspectRatio === "9:16"
      ? "aspect-[9/16] max-h-[520px]"
      : project.aspectRatio === "1:1"
        ? "aspect-square max-h-[460px]"
        : project.aspectRatio === "4:5"
          ? "aspect-[4/5] max-h-[480px]"
          : "aspect-video max-h-[420px]";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-3xl bg-black border border-white/10 shadow-2xl overflow-hidden p-2 sm:p-3 select-none",
        className,
      )}
    >
      {/* Top Overlay Badge Bar */}
      <div className="absolute top-4 inset-x-5 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-black/70 border border-white/15 px-2.5 py-0.5 text-[10px] font-mono text-accent backdrop-blur-md uppercase tracking-wider font-bold">
            {project.aspectRatio} • {project.clips.length} {project.clips.length === 1 ? "Clip" : "Clips"}
          </span>
          {project.remixedFrom && (
            <span className="rounded-full bg-pink-500/20 border border-pink-500/40 px-2.5 py-0.5 text-[10px] font-bold text-pink-300 backdrop-blur-md flex items-center gap-1">
              <span>Remix of @{project.remixedFrom.authorHandle}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleToggleFullscreen}
          className="pointer-events-auto rounded-full bg-black/60 border border-white/15 p-1.5 text-muted hover:text-white backdrop-blur-md transition-colors"
          title="Fullscreen Preview"
        >
          {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </button>
      </div>

      {/* Canvas Viewport */}
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-2xl bg-[#0a0a0c] shadow-inner",
          aspectClass,
        )}
      >
        <canvas
          ref={canvasRef}
          width={dims.width}
          height={dims.height}
          className="size-full object-contain cursor-pointer"
          onClick={togglePlay}
        />

        {/* Big Centered Play Overlay when Paused */}
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px] group cursor-pointer"
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-accent/90 text-black shadow-[0_0_30px_rgba(0,240,255,0.6)] group-hover:scale-110 active:scale-95 transition-all">
              <Play className="size-7 fill-black translate-x-0.5" />
            </div>
          </button>
        )}
      </div>

      {/* Bottom Transport Controls Bar */}
      <div className="mt-3 flex w-full max-w-sm items-center justify-between gap-3 px-2">
        {/* Timecode */}
        <div className="font-mono text-[11px] font-bold text-muted flex items-center gap-1">
          <span className="text-accent">{formatTime(currentTime)}</span>
          <span className="text-faint">/</span>
          <span>{formatTime(project.duration)}</span>
        </div>

        {/* Transport buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => seek(0)}
            className="rounded-xl p-1.5 text-muted hover:text-fg hover:bg-white/5 transition-colors"
            title="Rewind to start"
          >
            <RotateCcw className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => seek(Math.max(0, currentTime - 1.0))}
            className="rounded-xl p-1.5 text-muted hover:text-fg hover:bg-white/5 transition-colors"
            title="Step Back 1s"
          >
            <SkipBack className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="flex size-8 items-center justify-center rounded-xl bg-accent text-black font-black hover:scale-105 active:scale-95 shadow-sm transition-all"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? (
              <Pause className="size-4 fill-black" />
            ) : (
              <Play className="size-4 fill-black translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => seek(Math.min(project.duration, currentTime + 1.0))}
            className="rounded-xl p-1.5 text-muted hover:text-fg hover:bg-white/5 transition-colors"
            title="Step Forward 1s"
          >
            <SkipForward className="size-3.5" />
          </button>
        </div>

        {/* Mute button */}
        <button
          type="button"
          onClick={toggleMute}
          className={cn(
            "rounded-xl p-1.5 transition-colors",
            isMuted ? "text-rose-400 bg-rose-500/10" : "text-muted hover:text-fg hover:bg-white/5",
          )}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}
