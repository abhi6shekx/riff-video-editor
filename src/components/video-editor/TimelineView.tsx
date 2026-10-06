import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  Gauge,
  Layers,
  Music,
  Plus,
  RotateCw,
  Scissors,
  Sparkles,
  Trash2,
  Type,
  Video,
  Volume2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useStudio } from "@/lib/studio/store";
import type { TransitionType } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";
import { toast } from "sonner";

interface TimelineViewProps {
  className?: string;
  onOpenAddMedia?: () => void;
}

const TRANSITION_PRESETS: { type: TransitionType; icon: string; label: string }[] = [
  { type: "none", icon: "✂️", label: "Cut" },
  { type: "fade", icon: "🔀", label: "Fade" },
  { type: "zoom", icon: "🔍", label: "Zoom" },
  { type: "flash", icon: "⚡", label: "Flash" },
  { type: "glitch", icon: "👾", label: "Glitch" },
  { type: "spin", icon: "🔄", label: "Spin" },
  { type: "slide_left", icon: "⬅️", label: "Slide" },
];

export function TimelineView({ className, onOpenAddMedia }: TimelineViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const project = useStudio((s) => s.project);
  const currentTime = useStudio((s) => s.currentTime);
  const seek = useStudio((s) => s.seek);
  const zoomLevel = useStudio((s) => s.zoomLevel);
  const setZoomLevel = useStudio((s) => s.setZoomLevel);

  const selectedClipId = useStudio((s) => s.selectedClipId);
  const selectClip = useStudio((s) => s.selectClip);
  const splitClipAtPlayhead = useStudio((s) => s.splitClipAtPlayhead);
  const duplicateClip = useStudio((s) => s.duplicateClip);
  const removeClip = useStudio((s) => s.removeClip);
  const trimClip = useStudio((s) => s.trimClip);
  const moveClip = useStudio((s) => s.moveClip);
  const setClipTransition = useStudio((s) => s.setClipTransition);

  const selectedTextId = useStudio((s) => s.selectedTextId);
  const selectText = useStudio((s) => s.selectText);
  const updateTextLayer = useStudio((s) => s.updateTextLayer);
  const removeTextLayer = useStudio((s) => s.removeTextLayer);

  const selectedAudioId = useStudio((s) => s.selectedAudioId);
  const selectAudio = useStudio((s) => s.selectAudio);
  const updateAudioTrack = useStudio((s) => s.updateAudioTrack);
  const removeAudioTrack = useStudio((s) => s.removeAudioTrack);

  const selectedStickerId = useStudio((s) => s.selectedStickerId);
  const selectSticker = useStudio((s) => s.selectSticker);
  const updateSticker = useStudio((s) => s.updateSticker);
  const removeSticker = useStudio((s) => s.removeSticker);

  const selectedEffectId = useStudio((s) => s.selectedEffectId);
  const selectEffect = useStudio((s) => s.selectEffect);
  const updateEffect = useStudio((s) => s.updateEffect);
  const removeEffect = useStudio((s) => s.removeEffect);

  // Dragging state for Playhead scrubbing
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Active clip
  const activeClip = project.clips.find((c) => c.id === selectedClipId) || project.clips[0];

  // Pixels per second
  const pxPerSec = 45 * zoomLevel;
  const totalTimelineWidth = Math.max(900, (project.duration + 2) * pxPerSec);
  const playheadX = currentTime * pxPerSec;

  // Handle Playhead dragging & scrubbing
  const handleScrub = (clientX: number) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const time = Math.max(0, Math.min(project.duration, offsetX / pxPerSec));
    seek(time);
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const onMouseMove = (e: MouseEvent) => {
      handleScrub(e.clientX);
    };

    const onMouseUp = () => {
      setIsScrubbing(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isScrubbing, pxPerSec, project.duration]);

  // Handle clip trim handle dragging
  const handleTrimDrag = (
    clipId: string,
    edge: "left" | "right",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const clip = project.clips.find((c) => c.id === clipId);
    if (!clip) return;

    const startX = e.clientX;
    const initialSourceStart = clip.sourceStart;
    const initialSourceEnd = clip.sourceEnd;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = (deltaX / pxPerSec) * clip.speed;

      if (edge === "left") {
        const newStart = Math.max(0, initialSourceStart + deltaTime);
        if (newStart < clip.sourceEnd - 0.4) {
          trimClip(clip.id, newStart, clip.sourceEnd);
        }
      } else {
        const newEnd = Math.max(clip.sourceStart + 0.4, initialSourceEnd + deltaTime);
        trimClip(clip.id, clip.sourceStart, newEnd);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Handle effect trim & stretch dragging (lengthen or shorten effect)
  const handleEffectTrimDrag = (
    effectId: string,
    edge: "left" | "right",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const fx = project.effects.find((item) => item.id === effectId);
    if (!fx) return;

    const startX = e.clientX;
    const initialStart = fx.timelineStart;
    const initialEnd = fx.timelineEnd;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / pxPerSec;

      if (edge === "left") {
        const newStart = Math.min(fx.timelineEnd - 0.2, Math.max(0, initialStart + deltaTime));
        updateEffect(fx.id, { timelineStart: newStart });
      } else {
        const newEnd = Math.max(fx.timelineStart + 0.2, Math.min(project.duration + 5, initialEnd + deltaTime));
        updateEffect(fx.id, { timelineEnd: newEnd });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Handle text layer trim & stretch dragging
  const handleTextTrimDrag = (
    textId: string,
    edge: "left" | "right",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const txt = project.textLayers.find((item) => item.id === textId);
    if (!txt) return;

    const startX = e.clientX;
    const initialStart = txt.timelineStart;
    const initialEnd = txt.timelineEnd;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / pxPerSec;

      if (edge === "left") {
        const newStart = Math.min(txt.timelineEnd - 0.2, Math.max(0, initialStart + deltaTime));
        updateTextLayer(txt.id, { timelineStart: newStart });
      } else {
        const newEnd = Math.max(txt.timelineStart + 0.2, Math.min(project.duration + 5, initialEnd + deltaTime));
        updateTextLayer(txt.id, { timelineEnd: newEnd });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Handle audio track trim & stretch dragging
  const handleAudioTrimDrag = (
    audioId: string,
    edge: "left" | "right",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const trk = project.audioTracks.find((item) => item.id === audioId);
    if (!trk) return;

    const startX = e.clientX;
    const initialStart = trk.timelineStart;
    const initialDuration = trk.duration;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / pxPerSec;

      if (edge === "left") {
        const newStart = Math.max(0, initialStart + deltaTime);
        updateAudioTrack(trk.id, { timelineStart: newStart });
      } else {
        const newDuration = Math.max(0.5, initialDuration + deltaTime);
        updateAudioTrack(trk.id, { duration: newDuration });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Handle sticker trim & stretch dragging
  const handleStickerTrimDrag = (
    stickerId: string,
    edge: "left" | "right",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const stk = project.stickers.find((item) => item.id === stickerId);
    if (!stk) return;

    const startX = e.clientX;
    const initialStart = stk.timelineStart;
    const initialEnd = stk.timelineEnd;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / pxPerSec;

      if (edge === "left") {
        const newStart = Math.min(stk.timelineEnd - 0.2, Math.max(0, initialStart + deltaTime));
        updateSticker(stk.id, { timelineStart: newStart });
      } else {
        const newEnd = Math.max(stk.timelineStart + 0.2, Math.min(project.duration + 5, initialEnd + deltaTime));
        updateSticker(stk.id, { timelineEnd: newEnd });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Delete currently selected item (clip, text, audio, sticker, or effect)
  const handleDeleteSelected = () => {
    if (selectedEffectId) {
      removeEffect(selectedEffectId);
      playSound("boom");
    } else if (selectedTextId) {
      removeTextLayer(selectedTextId);
      playSound("boom");
    } else if (selectedAudioId) {
      removeAudioTrack(selectedAudioId);
      playSound("boom");
    } else if (selectedStickerId) {
      removeSticker(selectedStickerId);
      playSound("boom");
    } else if (selectedClipId && project.clips.length > 1) {
      removeClip(selectedClipId);
      playSound("boom");
    }
  };

  // Keyboard shortcuts (S = split, Del = delete, Space = play/pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        splitClipAtPlayhead();
        playSound("pop");
      } else if (e.key === "Delete" || e.key === "Backspace") {
        handleDeleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedClipId,
    selectedEffectId,
    selectedTextId,
    selectedAudioId,
    selectedStickerId,
    project.clips.length,
    splitClipAtPlayhead,
  ]);

  // Ruler tick intervals
  const rulerInterval = zoomLevel > 2 ? 1 : 2;
  const rulerTicks = [];
  for (let s = 0; s <= Math.ceil(project.duration + 2); s += rulerInterval) {
    rulerTicks.push(s);
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col border-t border-border bg-surface select-none text-fg",
        className,
      )}
    >
      {/* 1. Quick Editing Action Toolbar */}
      <div className="h-11 px-3 md:px-5 border-b border-border bg-raised flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        {/* Left: Core Clip Operations */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Split at Playhead */}
          <button
            type="button"
            onClick={() => {
              splitClipAtPlayhead();
              playSound("pop");
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface border border-border hover:bg-raised text-fg active:scale-95 transition-all"
            title="Split selected clip at current playhead (Press 'S')"
          >
            <Scissors className="size-3.5 text-cyan-400" />
            <span>Split</span>
            <kbd className="hidden lg:inline text-[9px] font-mono px-1 py-0.2 bg-white/10 rounded text-white/60">
              S
            </kbd>
          </button>

          {/* Duplicate Clip */}
          <button
            type="button"
            onClick={() => {
              if (activeClip) {
                duplicateClip(activeClip.id);
                playSound("pop");
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/90 active:scale-95 transition-all"
            title="Duplicate clip"
          >
            <Copy className="size-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          {/* Delete Selected Item */}
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={
              !selectedAudioId &&
              !selectedEffectId &&
              !selectedTextId &&
              !selectedStickerId &&
              !(selectedClipId && project.clips.length > 1)
            }
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:text-red-300 text-white/90 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all"
            title="Delete selected item (Delete / Backspace)"
          >
            <Trash2 className="size-3.5 text-red-400" />
            <span className="hidden sm:inline">
              {selectedAudioId
                ? "Delete Audio"
                : selectedEffectId
                  ? "Delete Effect"
                  : selectedTextId
                    ? "Delete Text"
                    : selectedStickerId
                      ? "Delete Sticker"
                      : "Delete"}
            </span>
          </button>

          {/* Move Sequence Left / Right */}
          {activeClip && (
            <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => moveClip(activeClip.id, "left")}
                className="p-1 text-white/60 hover:text-white transition-colors"
                title="Move clip left"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <div className="w-px h-3 bg-white/10" />
              <button
                type="button"
                onClick={() => moveClip(activeClip.id, "right")}
                className="p-1 text-white/60 hover:text-white transition-colors"
                title="Move clip right"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Zoom & Add Media */}
        <div className="flex items-center gap-2">
          {/* Zoom Slider */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel(Math.max(0.6, zoomLevel - 0.2))}
              className="p-1 text-white/50 hover:text-white"
              title="Zoom out"
            >
              <ZoomOut className="size-3" />
            </button>
            <span className="text-[10px] font-mono text-white/60 w-8 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(Math.min(4.0, zoomLevel + 0.2))}
              className="p-1 text-white/50 hover:text-white"
              title="Zoom in"
            >
              <ZoomIn className="size-3" />
            </button>
          </div>

          {/* Add Media Button */}
          {onOpenAddMedia && (
            <button
              type="button"
              onClick={onOpenAddMedia}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors"
            >
              <Plus className="size-3.5" />
              <span>Add Media</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Scrollable Multi-Track Timeline Canvas */}
      <div className="overflow-x-auto relative flex-1 min-h-[220px] max-h-[340px] p-3 scrollbar-thin select-none">
        <div
          ref={timelineRef}
          style={{ width: `${totalTimelineWidth}px` }}
          className="relative flex flex-col space-y-2.5 cursor-pointer pb-6"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            seek(Math.max(0, Math.min(project.duration, clickX / pxPerSec)));
          }}
        >
          {/* Time Ruler */}
          <div className="relative h-6 border-b border-white/10 flex items-center">
            {rulerTicks.map((sec) => (
              <div
                key={sec}
                style={{ left: `${sec * pxPerSec}px` }}
                className="absolute top-0 flex flex-col items-center pointer-events-none"
              >
                <div className="h-2 w-px bg-white/20" />
                <span className="font-mono text-[9px] text-white/40 -translate-x-1/2 mt-0.5">
                  00:{sec.toString().padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>

          {/* TRACK 1: VIDEO / MEDIA TRACK */}
          <div className="relative h-18 rounded-xl bg-black/60 border border-white/10 p-1 flex items-center overflow-hidden">
            <div className="absolute left-2 top-1 flex items-center gap-1 text-[9px] font-bold text-white/40 uppercase tracking-wider z-20 pointer-events-none">
              <Video className="size-3 text-cyan-400" />
              <span>Video Track</span>
            </div>

            {project.clips.map((clip, idx) => {
              const clipWidth = clip.duration * pxPerSec;
              const clipLeft = clip.timelineStart * pxPerSec;
              const isSelected = clip.id === selectedClipId;

              return (
                <div key={clip.id} className="contents">
                  {/* Clip Box */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      selectClip(clip.id);
                      seek(clip.timelineStart);
                    }}
                    style={{
                      left: `${clipLeft}px`,
                      width: `${clipWidth}px`,
                    }}
                    className={cn(
                      "absolute top-1 bottom-1 rounded-lg overflow-hidden border transition-all flex items-center justify-between px-1 cursor-pointer group shadow-sm select-none",
                      isSelected
                        ? "border-cyan-400 ring-2 ring-cyan-500/30 bg-cyan-950/40 z-10"
                        : "border-white/15 bg-[#171a26] hover:border-white/30",
                    )}
                  >
                    {/* Media Thumbnail Strip */}
                    <img
                      src={clip.sourceUrl}
                      alt={clip.name}
                      className="absolute inset-0 size-full object-cover opacity-35 pointer-events-none"
                    />

                    {/* Left Trim Handle */}
                    <div
                      onMouseDown={(e) => handleTrimDrag(clip.id, "left", e)}
                      className="relative z-20 h-full w-2.5 flex items-center justify-center bg-cyan-500/20 hover:bg-cyan-400/80 rounded-l cursor-ew-resize transition-colors"
                      title="Drag to trim start"
                    >
                      <div className="w-0.5 h-4 bg-white/70 rounded-full" />
                    </div>

                    {/* Clip Info */}
                    <div className="relative z-10 px-1 truncate pointer-events-none text-left">
                      <p className="text-[10px] font-bold text-white leading-tight truncate">
                        {clip.name}
                      </p>
                      <p className="font-mono text-[9px] text-white/60">
                        {clip.duration.toFixed(1)}s • {clip.speed}x
                      </p>
                    </div>

                    {/* Right Trim Handle */}
                    <div
                      onMouseDown={(e) => handleTrimDrag(clip.id, "right", e)}
                      className="relative z-20 h-full w-2.5 flex items-center justify-center bg-cyan-500/20 hover:bg-cyan-400/80 rounded-r cursor-ew-resize transition-colors"
                      title="Drag to trim end"
                    >
                      <div className="w-0.5 h-4 bg-white/70 rounded-full" />
                    </div>
                  </div>

                  {/* Transition Connector Button between adjacent clips */}
                  {idx < project.clips.length - 1 && (
                    <div
                      style={{
                        left: `${clip.timelineEnd * pxPerSec - 10}px`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextClip = project.clips[idx + 1];
                        if (nextClip) {
                          const currentType = nextClip.transitionIn?.type || "none";
                          const currentIdx = TRANSITION_PRESETS.findIndex((t) => t.type === currentType);
                          const nextPreset = TRANSITION_PRESETS[(currentIdx + 1) % TRANSITION_PRESETS.length];
                          setClipTransition(nextClip.id, { type: nextPreset.type, duration: 0.4 });
                          playSound("pop");
                        }
                      }}
                      className="absolute top-4.5 z-20 flex size-5 items-center justify-center rounded-full bg-[#1c2130] border border-white/30 text-[9px] font-bold text-cyan-400 shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      title="Click to cycle Transition"
                    >
                      {TRANSITION_PRESETS.find(
                        (t) => t.type === project.clips[idx + 1]?.transitionIn?.type,
                      )?.icon || "➕"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* TRACK 2: AUDIO TRACK (Supports multiple distinct audio lanes) */}
          <div
            style={{
              height: `${Math.max(48, project.audioTracks.length * 40 + 10)}px`,
            }}
            className="relative rounded-xl bg-black/40 border border-white/10 p-1 overflow-hidden transition-all"
          >
            <div className="absolute left-2 top-0.5 flex items-center gap-1 text-[8px] font-bold text-white/40 uppercase tracking-wider z-20 pointer-events-none">
              <Music className="size-2.5 text-pink-400" />
              <span>Audio & Music ({project.audioTracks.length})</span>
            </div>

            {project.audioTracks.map((trk, idx) => {
              const trkWidth = trk.duration * pxPerSec;
              const trkLeft = trk.timelineStart * pxPerSec;
              const isSelected = trk.id === selectedAudioId;
              const rowTop = 4 + idx * 40;

              return (
                <div
                  key={trk.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAudio(trk.id);
                  }}
                  style={{
                    left: `${trkLeft}px`,
                    width: `${Math.max(50, trkWidth)}px`,
                    top: `${rowTop}px`,
                    height: "34px",
                  }}
                  className={cn(
                    "absolute rounded-lg border px-1 flex items-center justify-between cursor-pointer transition-all group select-none overflow-hidden",
                    isSelected
                      ? "border-pink-400 ring-2 ring-pink-500/40 bg-pink-950/70 z-10 shadow-lg"
                      : "border-pink-500/30 bg-pink-950/30 hover:border-pink-400/60",
                  )}
                  title={`Track ${idx + 1}: ${trk.title} (${trk.duration.toFixed(1)}s)`}
                >
                  {/* Left Trim Handle */}
                  <div
                    onMouseDown={(e) => handleAudioTrimDrag(trk.id, "left", e)}
                    className="relative z-20 h-full w-2 flex items-center justify-center bg-pink-500/20 hover:bg-pink-400/80 rounded-l cursor-ew-resize transition-colors"
                    title="Drag to adjust start"
                  >
                    <div className="w-0.5 h-3 bg-white/70 rounded-full" />
                  </div>

                  <div className="flex items-center gap-1.5 truncate pointer-events-none px-1 min-w-0">
                    <span className="text-[9px] font-bold bg-pink-500/30 text-pink-200 px-1 py-0.2 rounded shrink-0">
                      A{idx + 1}
                    </span>
                    <Music className="size-3 text-pink-400 shrink-0" />
                    <span className="text-[10px] font-bold text-pink-200 truncate">
                      {trk.title}
                    </span>
                    <span className="font-mono text-[9px] text-pink-300/60 shrink-0">
                      {trk.duration.toFixed(1)}s
                    </span>
                  </div>

                  {/* Quick Delete Audio Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAudioTrack(trk.id);
                      playSound("boom");
                      toast.success(`Removed audio "${trk.title}"`);
                    }}
                    className="relative z-20 p-1 rounded hover:bg-red-500/30 text-white/50 hover:text-red-300 transition-colors shrink-0"
                    title={`Delete "${trk.title}"`}
                  >
                    <Trash2 className="size-3" />
                  </button>

                  {/* Right Stretch/Trim Handle */}
                  <div
                    onMouseDown={(e) => handleAudioTrimDrag(trk.id, "right", e)}
                    className="relative z-20 h-full w-2 flex items-center justify-center bg-pink-500/20 hover:bg-pink-400/80 rounded-r cursor-ew-resize transition-colors"
                    title="Drag to adjust length"
                  >
                    <div className="w-0.5 h-3 bg-white/70 rounded-full" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* TRACK 3: TEXT & TITLES TRACK */}
          <div className="relative h-11 rounded-xl bg-black/40 border border-white/10 p-1 flex items-center overflow-hidden">
            <div className="absolute left-2 top-0.5 flex items-center gap-1 text-[8px] font-bold text-white/40 uppercase tracking-wider z-20 pointer-events-none">
              <Type className="size-2.5 text-indigo-400" />
              <span>Text Layers</span>
            </div>

            {project.textLayers.map((txt) => {
              const txtWidth = Math.max(30, (txt.timelineEnd - txt.timelineStart) * pxPerSec);
              const txtLeft = txt.timelineStart * pxPerSec;
              const isSelected = txt.id === selectedTextId;

              return (
                <div
                  key={txt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectText(txt.id);
                  }}
                  style={{ left: `${txtLeft}px`, width: `${txtWidth}px` }}
                  className={cn(
                    "absolute top-1 bottom-1 rounded-lg border px-1 flex items-center justify-between cursor-pointer transition-all group select-none overflow-hidden",
                    isSelected
                      ? "border-indigo-400 ring-2 ring-indigo-500/30 bg-indigo-950/70 z-10"
                      : "border-indigo-500/30 bg-indigo-950/30 hover:border-indigo-400/60",
                  )}
                >
                  {/* Left Trim Handle */}
                  <div
                    onMouseDown={(e) => handleTextTrimDrag(txt.id, "left", e)}
                    className="relative z-20 h-full w-2 flex items-center justify-center bg-indigo-500/30 hover:bg-indigo-400/90 rounded-l cursor-ew-resize transition-colors"
                    title="Drag to lengthen/shorten start"
                  >
                    <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                  </div>

                  <div className="flex items-center gap-1 truncate pointer-events-none px-1">
                    <Type className="size-3 text-indigo-400 shrink-0" />
                    <span className="text-[10px] font-bold text-indigo-200 truncate">
                      {txt.text || "Text"}
                    </span>
                    <span className="font-mono text-[8px] text-indigo-300/60">
                      {(txt.timelineEnd - txt.timelineStart).toFixed(1)}s
                    </span>
                  </div>

                  {/* Right Stretch Handle */}
                  <div
                    onMouseDown={(e) => handleTextTrimDrag(txt.id, "right", e)}
                    className="relative z-20 h-full w-2 flex items-center justify-center bg-indigo-500/30 hover:bg-indigo-400/90 rounded-r cursor-ew-resize transition-colors"
                    title="Drag to lengthen/shorten end"
                  >
                    <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* TRACK 4: VISUAL EFFECTS (FX) TRACK */}
          <div className="relative h-11 rounded-xl bg-black/40 border border-white/10 p-1 flex items-center overflow-hidden">
            <div className="absolute left-2 top-0.5 flex items-center gap-1 text-[8px] font-bold text-white/40 uppercase tracking-wider z-20 pointer-events-none">
              <Sparkles className="size-2.5 text-cyan-400" />
              <span>Visual Effects (FX)</span>
            </div>

            {project.effects.map((fx) => {
              const fxDuration = Math.max(0.2, fx.timelineEnd - fx.timelineStart);
              const fxWidth = Math.max(35, fxDuration * pxPerSec);
              const fxLeft = fx.timelineStart * pxPerSec;
              const isSelected = fx.id === selectedEffectId;

              const fxName =
                fx.effect === "vintage_grain"
                  ? "Film Grain"
                  : fx.effect === "glitch"
                    ? "Cyber Glitch"
                    : fx.effect === "vhs"
                      ? "VHS Retro"
                      : fx.effect === "pixelate"
                        ? "Pixelate"
                        : fx.effect === "blur"
                          ? "Blur"
                          : fx.effect === "motion_blur"
                            ? "Motion Blur"
                            : fx.effect === "rgb_split"
                              ? "RGB Split"
                              : fx.effect.toUpperCase();

              const fxIcon =
                fx.effect === "vintage_grain"
                  ? "🎞️"
                  : fx.effect === "glitch"
                    ? "👾"
                    : fx.effect === "vhs"
                      ? "📼"
                      : fx.effect === "pixelate"
                        ? "🔲"
                        : fx.effect === "blur"
                          ? "💫"
                          : fx.effect === "motion_blur"
                            ? "⚡"
                            : "✨";

              return (
                <div
                  key={fx.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectEffect(fx.id);
                  }}
                  style={{ left: `${fxLeft}px`, width: `${fxWidth}px` }}
                  className={cn(
                    "absolute top-1 bottom-1 rounded-lg border px-1 flex items-center justify-between cursor-pointer transition-all group select-none overflow-hidden",
                    isSelected
                      ? "border-cyan-400 ring-2 ring-cyan-500/40 bg-cyan-950/70 z-10 shadow-lg"
                      : "border-cyan-500/40 bg-cyan-950/30 hover:border-cyan-400/70",
                  )}
                  title={`Effect: ${fxName} (${fxDuration.toFixed(1)}s) - Drag edges to lengthen/shorten`}
                >
                  {/* Left Trim Handle */}
                  <div
                    onMouseDown={(e) => handleEffectTrimDrag(fx.id, "left", e)}
                    className="relative z-20 h-full w-2 flex items-center justify-center bg-cyan-500/30 hover:bg-cyan-400/90 rounded-l cursor-ew-resize transition-colors"
                    title="Drag to adjust start time"
                  >
                    <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                  </div>

                  <div className="flex items-center gap-1 truncate pointer-events-none px-1">
                    <span className="text-xs">{fxIcon}</span>
                    <span className="text-[10px] font-bold text-cyan-200 truncate">
                      {fxName}
                    </span>
                    <span className="font-mono text-[8px] text-cyan-300/80 bg-cyan-950/60 px-1 py-0.2 rounded">
                      {fxDuration.toFixed(1)}s
                    </span>
                  </div>

                  {/* Quick Delete X button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEffect(fx.id);
                      playSound("pop");
                    }}
                    className="relative z-20 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/30 text-white/70 hover:text-red-300 transition-opacity"
                    title="Remove this effect"
                  >
                    <Trash2 className="size-2.5" />
                  </button>

                  {/* Right Stretch Handle */}
                  <div
                    onMouseDown={(e) => handleEffectTrimDrag(fx.id, "right", e)}
                    className="relative z-20 h-full w-2 flex items-center justify-center bg-cyan-500/30 hover:bg-cyan-400/90 rounded-r cursor-ew-resize transition-colors"
                    title="Drag to lengthen/stretch effect"
                  >
                    <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* TRACK 5: STICKERS & OVERLAYS TRACK */}
          <div className="relative h-10 rounded-xl bg-black/40 border border-white/10 p-1 flex items-center overflow-hidden">
            <div className="absolute left-2 top-0.5 flex items-center gap-1 text-[8px] font-bold text-white/40 uppercase tracking-wider z-20 pointer-events-none">
              <Sparkles className="size-2.5 text-amber-400" />
              <span>Stickers</span>
            </div>

            {project.stickers.map((stk) => {
              const stkWidth = Math.max(30, (stk.timelineEnd - stk.timelineStart) * pxPerSec);
              const stkLeft = stk.timelineStart * pxPerSec;
              const isSelected = stk.id === selectedStickerId;

              return (
                <div
                  key={stk.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectSticker(stk.id);
                  }}
                  style={{ left: `${stkLeft}px`, width: `${stkWidth}px` }}
                  className={cn(
                    "absolute top-1 bottom-1 rounded-lg border px-1 flex items-center justify-between cursor-pointer transition-all group select-none overflow-hidden",
                    isSelected
                      ? "border-amber-400 ring-2 ring-amber-500/30 bg-amber-950/60 z-10"
                      : "border-amber-500/30 bg-amber-950/25 hover:border-amber-400/60",
                  )}
                >
                  {/* Left Trim Handle */}
                  <div
                    onMouseDown={(e) => handleStickerTrimDrag(stk.id, "left", e)}
                    className="relative z-20 h-full w-2 flex items-center justify-center bg-amber-500/30 hover:bg-amber-400/90 rounded-l cursor-ew-resize transition-colors"
                    title="Drag to trim start"
                  >
                    <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                  </div>

                  <span className="text-sm pointer-events-none">{stk.emojiOrUrl}</span>

                  {/* Right Stretch Handle */}
                  <div
                    onMouseDown={(e) => handleStickerTrimDrag(stk.id, "right", e)}
                    className="relative z-20 h-full w-2 flex items-center justify-center bg-amber-500/30 hover:bg-amber-400/90 rounded-r cursor-ew-resize transition-colors"
                    title="Drag to lengthen/shorten"
                  >
                    <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Playhead Scrubbing Needle Line spanning across all tracks */}
          <div
            style={{ left: `${playheadX}px` }}
            className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center -translate-x-1/2"
          >
            {/* Playhead Head (scrubber handle) */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsScrubbing(true);
              }}
              className="pointer-events-auto size-3.5 rounded-full bg-cyan-400 border-2 border-white shadow-lg cursor-ew-resize hover:scale-125 transition-transform"
            />
            {/* Red Needle Line */}
            <div className="w-0.5 h-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
