import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useStudio } from "@/lib/studio/store";
import {
  getDimensionsForRatio,
  renderStudioFrame,
} from "@/lib/studio/renderer";
import { audioPlayerManager } from "@/lib/studio/audio-engine";
import { cn } from "@/lib/utils";

interface VideoPreviewAreaProps {
  className?: string;
}

export function VideoPreviewArea({ className }: VideoPreviewAreaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const project = useStudio((s) => s.project);
  const isPlaying = useStudio((s) => s.isPlaying);
  const currentTime = useStudio((s) => s.currentTime);
  const togglePlay = useStudio((s) => s.togglePlay);
  const seek = useStudio((s) => s.seek);
  const isMuted = useStudio((s) => s.isMuted);
  const toggleMute = useStudio((s) => s.toggleMute);
  const selectedClipId = useStudio((s) => s.selectedClipId);
  const selectedTextId = useStudio((s) => s.selectedTextId);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const dims = getDimensionsForRatio(project.aspectRatio, "preview");

  // Re-render frame whenever project, currentTime, or dims changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    renderStudioFrame(ctx, project, currentTime, dims);
  }, [project, currentTime, dims]);

  // RequestAnimationFrame playback loop
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const next = currentTime + delta;
      if (next >= project.duration) {
        seek(0);
      } else {
        seek(next);
      }
      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTime, project.duration, seek]);

  // Synchronize audio playback for user-uploaded music, voiceovers & SFX
  useEffect(() => {
    audioPlayerManager.sync(
      project.audioTracks,
      currentTime,
      isPlaying,
      isMuted,
    );
  }, [project.audioTracks, currentTime, isPlaying, isMuted]);

  // Clean up audio on pause or unmount
  useEffect(() => {
    if (!isPlaying) {
      audioPlayerManager.stopAll();
    }
    return () => {
      audioPlayerManager.stopAll();
    };
  }, [isPlaying]);

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  }

  function handleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }

  // Active items for visual overlay indicator
  const activeText = project.textLayers.find((t) => t.id === selectedTextId);

  // Aspect ratio styling for preview container
  const aspectClass =
    project.aspectRatio === "9:16"
      ? "aspect-[9/16] max-h-[460px] md:max-h-[520px]"
      : project.aspectRatio === "1:1"
        ? "aspect-square max-h-[380px] md:max-h-[440px]"
        : project.aspectRatio === "4:5"
          ? "aspect-[4/5] max-h-[420px] md:max-h-[480px]"
          : "aspect-video max-h-[340px] md:max-h-[390px]";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex flex-col items-center justify-center p-3 md:p-6 bg-bg text-fg overflow-hidden select-none",
        className,
      )}
    >
      {/* Background Subtle Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] opacity-5 [background-size:16px_16px] pointer-events-none" />

      {/* Canvas Wrapper */}
      <div
        className={cn(
          "relative flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden border border-border bg-black group",
          aspectClass,
        )}
      >
        <canvas
          ref={canvasRef}
          width={dims.width}
          height={dims.height}
          onClick={togglePlay}
          className="size-full object-contain cursor-pointer"
        />

        {/* Selected Text Layer Bounding Box Indicator */}
        {activeText && (
          <div
            style={{
              left: `${activeText.x}%`,
              top: `${activeText.y}%`,
              transform: `translate(-50%, -50%) rotate(${activeText.rotation || 0}deg)`,
            }}
            className="absolute pointer-events-none border-2 border-dashed border-cyan-400 p-2 rounded-lg"
          >
            <div className="absolute -top-2.5 -left-2.5 size-2 bg-cyan-400 rounded-full" />
            <div className="absolute -top-2.5 -right-2.5 size-2 bg-cyan-400 rounded-full" />
            <div className="absolute -bottom-2.5 -left-2.5 size-2 bg-cyan-400 rounded-full" />
            <div className="absolute -bottom-2.5 -right-2.5 size-2 bg-cyan-400 rounded-full" />
          </div>
        )}

        {/* Big Center Play Icon overlay on pause */}
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 m-auto size-14 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-all group-hover:opacity-100 opacity-80"
          >
            <Play className="size-6 fill-white ml-0.5" />
          </button>
        )}
      </div>

      {/* Modern Player Control Toolbar */}
      <div className="mt-3 flex items-center gap-2 sm:gap-3 px-3 py-1.5 rounded-xl bg-surface border border-border text-fg shadow-lg backdrop-blur-md z-10">
        {/* Reset to Start */}
        <button
          type="button"
          onClick={() => seek(0)}
          className="p-1.5 text-muted hover:text-fg transition-colors"
          title="Restart (0:00)"
        >
          <RotateCcw className="size-3.5" />
        </button>

        {/* Step Back -1s */}
        <button
          type="button"
          onClick={() => seek(Math.max(0, currentTime - 1))}
          className="p-1.5 text-white/60 hover:text-white transition-colors"
          title="Back 1 sec"
        >
          <ChevronLeft className="size-4" />
        </button>

        {/* Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className="flex size-8 items-center justify-center rounded-lg bg-cyan-500 text-black font-bold hover:bg-cyan-400 shadow-md active:scale-95 transition-all"
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
        >
          {isPlaying ? (
            <Pause className="size-4 fill-black" />
          ) : (
            <Play className="size-4 fill-black ml-0.5" />
          )}
        </button>

        {/* Step Forward +1s */}
        <button
          type="button"
          onClick={() => seek(Math.min(project.duration, currentTime + 1))}
          className="p-1.5 text-white/60 hover:text-white transition-colors"
          title="Forward 1 sec"
        >
          <ChevronRight className="size-4" />
        </button>

        <div className="h-4 w-px bg-white/10" />

        {/* Timecode display */}
        <div className="font-mono text-xs text-white/80 tracking-wider">
          <span className="text-cyan-400 font-bold">{formatTime(currentTime)}</span>
          <span className="text-white/40"> / </span>
          <span className="text-white/50">{formatTime(project.duration)}</span>
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* Mute Toggle */}
        <button
          type="button"
          onClick={toggleMute}
          className="p-1.5 text-white/60 hover:text-white transition-colors"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="size-3.5 text-red-400" />
          ) : (
            <Volume2 className="size-3.5" />
          )}
        </button>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={handleFullscreen}
          className="p-1.5 text-white/60 hover:text-white transition-colors"
          title="Fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 className="size-3.5" />
          ) : (
            <Maximize2 className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
