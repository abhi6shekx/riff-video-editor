import { useRef } from "react";
import {
  Copy,
  Gauge,
  Music,
  Plus,
  RotateCw,
  Scissors,
  Sparkles,
  Trash2,
  Type,
  Video,
  Volume2,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useStudio } from "@/lib/studio/store";
import type { TransitionType } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0];
const TRANSITION_PRESETS: { type: TransitionType; label: string; icon: string }[] = [
  { type: "none", label: "None", icon: "∅" },
  { type: "fade", label: "Fade", icon: "🔀" },
  { type: "zoom", label: "Zoom", icon: "🔍" },
  { type: "flash", label: "Flash", icon: "⚡" },
  { type: "glitch", label: "Glitch", icon: "👾" },
  { type: "spin", label: "Spin", icon: "🔄" },
  { type: "shake", label: "Shake", icon: "📳" },
  { type: "slide_left", label: "Slide", icon: "⬅️" },
];

export function MultiTrackTimeline({ className }: { className?: string }) {
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
  const setClipSpeed = useStudio((s) => s.setClipSpeed);
  const setClipRotation = useStudio((s) => s.setClipRotation);
  const setClipTransition = useStudio((s) => s.setClipTransition);
  const setActiveTab = useStudio((s) => s.setActiveTab);

  const selectedTextId = useStudio((s) => s.selectedTextId);
  const selectText = useStudio((s) => s.selectText);
  const selectedAudioId = useStudio((s) => s.selectedAudioId);
  const selectAudio = useStudio((s) => s.selectAudio);
  const selectedEffectId = useStudio((s) => s.selectedEffectId);
  const selectEffect = useStudio((s) => s.selectEffect);

  const activeClip = project.clips.find((c) => c.id === selectedClipId) || project.clips[0];

  // Pixels per second based on zoomLevel
  const pxPerSec = 40 * zoomLevel;
  const totalTimelineWidth = Math.max(800, project.duration * pxPerSec + 120);

  // Playhead position in pixels
  const playheadX = currentTime * pxPerSec;

  function handleTimelineClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedTime = Math.max(0, Math.min(project.duration, clickX / pxPerSec));
    seek(clickedTime);
  }

  function handleSplit() {
    splitClipAtPlayhead();
    playSound("pop");
  }

  function handleDuplicate() {
    if (activeClip) {
      duplicateClip(activeClip.id);
      playSound("pop");
    }
  }

  function handleDelete() {
    if (activeClip && project.clips.length > 1) {
      removeClip(activeClip.id);
      playSound("boom");
    }
  }

  function handleRotate() {
    if (activeClip) {
      const nextRot = (activeClip.rotation + 90) % 360;
      setClipRotation(activeClip.id, nextRot);
      playSound("pop");
    }
  }

  // Generate ruler tick marks
  const rulerTicks = [];
  const maxSeconds = Math.ceil(project.duration) + 2;
  for (let s = 0; s <= maxSeconds; s++) {
    rulerTicks.push(s);
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl border border-white/10 bg-surface/95 shadow-2xl backdrop-blur-xl overflow-hidden",
        className,
      )}
    >
      {/* 1. Quick Editing Action Toolstrip */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 px-3 py-2 bg-raised/70 gap-2">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none">
          {/* Split at playhead */}
          <button
            type="button"
            onClick={handleSplit}
            className="flex items-center gap-1.5 rounded-xl bg-accent text-black px-2.5 py-1 text-xs font-black shadow-[0_0_12px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95 transition-all"
            title="Split Clip at Playhead"
          >
            <Scissors className="size-3.5 stroke-[2.5]" />
            <span>Split</span>
          </button>

          {/* Delete clip */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={project.clips.length <= 1}
            className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-2 py-1 text-xs font-bold text-muted hover:text-rose-400 hover:border-rose-500/40 disabled:opacity-40 transition-colors"
            title="Delete Selected Clip"
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          {/* Duplicate clip */}
          <button
            type="button"
            onClick={handleDuplicate}
            className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-2 py-1 text-xs font-bold text-muted hover:text-fg hover:border-white/20 transition-colors"
            title="Duplicate Clip"
          >
            <Copy className="size-3.5" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          {/* Rotate 90 deg */}
          <button
            type="button"
            onClick={handleRotate}
            className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-2 py-1 text-xs font-bold text-muted hover:text-fg hover:border-white/20 transition-colors"
            title="Rotate Clip 90°"
          >
            <RotateCw className="size-3.5" />
            <span className="hidden sm:inline">Rotate</span>
          </button>

          {/* Speed Preset Selector */}
          <div className="flex items-center gap-1 rounded-xl bg-black/40 border border-white/10 px-1.5 py-0.5">
            <Gauge className="size-3 text-muted" />
            <select
              value={activeClip?.speed ?? 1.0}
              onChange={(e) => {
                if (activeClip) setClipSpeed(activeClip.id, parseFloat(e.target.value));
              }}
              className="bg-transparent text-[11px] font-bold text-accent focus:outline-none cursor-pointer"
            >
              {SPEED_PRESETS.map((spd) => (
                <option key={spd} value={spd} className="bg-surface text-fg">
                  {spd}x Speed
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Zoom & Add Media buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-black/40 border border-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel(zoomLevel - 0.5)}
              className="p-1 text-muted hover:text-fg"
              title="Zoom Out"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[10px] text-faint">{zoomLevel}x</span>
            <button
              type="button"
              onClick={() => setZoomLevel(zoomLevel + 0.5)}
              className="p-1 text-muted hover:text-fg"
              title="Zoom In"
            >
              <ZoomIn className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("media")}
            className="flex items-center gap-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 px-2.5 py-1 text-xs font-bold hover:bg-purple-500/30 transition-colors"
          >
            <Plus className="size-3.5" />
            <span>Add Media</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Multi-Track Scroll Area */}
      <div className="overflow-x-auto relative min-h-[220px] max-h-[300px] select-none p-3 scrollbar-thin">
        <div
          ref={timelineRef}
          style={{ width: `${totalTimelineWidth}px` }}
          onClick={handleTimelineClick}
          className="relative flex flex-col space-y-2 cursor-pointer"
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
                <span className="font-mono text-[9px] text-muted -translate-x-1/2 mt-0.5">
                  00:{sec.toString().padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>

          {/* TRACK 1: VIDEO TRACK */}
          <div className="relative h-16 rounded-2xl bg-black/50 border border-white/10 p-1 flex items-center overflow-hidden">
            <div className="absolute left-2 top-1 flex items-center gap-1 text-[9px] font-bold text-muted pointer-events-none uppercase tracking-wider z-10">
              <Video className="size-3 text-accent" />
              <span>Video Track</span>
            </div>

            {project.clips.map((clip, idx) => {
              const clipWidth = clip.duration * pxPerSec;
              const clipLeft = clip.timelineStart * pxPerSec;
              const isSelected = clip.id === selectedClipId;

              return (
                <div key={clip.id} className="contents">
                  {/* Clip Block */}
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
                      "absolute top-1 bottom-1 rounded-xl overflow-hidden border transition-all flex items-center justify-between px-2 cursor-pointer group shadow-sm",
                      isSelected
                        ? "border-accent ring-2 ring-accent/30 bg-accent/15 z-10"
                        : "border-white/15 bg-raised/70 hover:border-white/30",
                    )}
                  >
                    {/* Media Thumbnail background */}
                    <img
                      src={clip.sourceUrl}
                      alt={clip.name}
                      className="absolute inset-0 size-full object-cover opacity-30 pointer-events-none"
                    />

                    {/* Left Trim Handle bar */}
                    <div className="h-6 w-1 rounded-full bg-white/40 group-hover:bg-accent pointer-events-none" />

                    {/* Clip Info */}
                    <div className="relative z-10 truncate text-left px-1 pointer-events-none">
                      <p className="truncate text-[10px] font-bold text-fg leading-tight">
                        {clip.name}
                      </p>
                      <p className="font-mono text-[9px] text-muted">
                        {clip.duration.toFixed(1)}s • {clip.speed}x
                      </p>
                    </div>

                    {/* Right Trim Handle bar */}
                    <div className="h-6 w-1 rounded-full bg-white/40 group-hover:bg-accent pointer-events-none" />
                  </div>

                  {/* Transition Connector Button between adjacent clips */}
                  {idx < project.clips.length - 1 && (
                    <div
                      style={{
                        left: `${(clip.timelineEnd * pxPerSec) - 12}px`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Cycle through transitions
                        const nextClip = project.clips[idx + 1];
                        if (nextClip) {
                          const currentType = nextClip.transitionIn?.type || "none";
                          const currentIdx = TRANSITION_PRESETS.findIndex((t) => t.type === currentType);
                          const nextPreset = TRANSITION_PRESETS[(currentIdx + 1) % TRANSITION_PRESETS.length];
                          setClipTransition(nextClip.id, { type: nextPreset.type, duration: 0.4 });
                          playSound("pop");
                        }
                      }}
                      className="absolute top-3.5 z-20 flex size-6 items-center justify-center rounded-full bg-raised border border-white/20 text-[10px] font-bold text-accent shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      title="Click to change Transition"
                    >
                      {project.clips[idx + 1]?.transitionIn?.type === "flash" ? "⚡" :
                       project.clips[idx + 1]?.transitionIn?.type === "zoom" ? "🔍" :
                       project.clips[idx + 1]?.transitionIn?.type === "glitch" ? "👾" :
                       project.clips[idx + 1]?.transitionIn?.type === "fade" ? "🔀" : "➕"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* TRACK 2: AUDIO / MUSIC TRACK */}
          <div className="relative h-10 rounded-2xl bg-black/40 border border-white/10 p-1 flex items-center overflow-hidden">
            <div className="absolute left-2 top-0.5 flex items-center gap-1 text-[8px] font-bold text-muted pointer-events-none uppercase tracking-wider z-10">
              <Music className="size-2.5 text-pink-400" />
              <span>Audio & Music</span>
            </div>

            {project.audioTracks.map((trk) => {
              const trkWidth = trk.duration * pxPerSec;
              const trkLeft = trk.timelineStart * pxPerSec;
              const isSelected = trk.id === selectedAudioId;

              return (
                <div
                  key={trk.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAudio(trk.id);
                  }}
                  style={{ left: `${trkLeft}px`, width: `${trkWidth}px` }}
                  className={cn(
                    "absolute top-1 bottom-1 rounded-xl px-2.5 flex items-center justify-between border cursor-pointer group shadow-sm transition-all",
                    isSelected
                      ? "bg-pink-500/25 border-pink-400 ring-1 ring-pink-400/40"
                      : "bg-pink-950/30 border-pink-500/20 hover:border-pink-500/40",
                  )}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Music className="size-3 text-pink-400 shrink-0" />
                    <span className="truncate text-[10px] font-semibold text-pink-200">
                      {trk.title}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-pink-300 shrink-0">
                    {trk.volume}% vol
                  </span>
                </div>
              );
            })}
          </div>

          {/* TRACK 3: TEXT & SUBTITLES TRACK */}
          <div className="relative h-10 rounded-2xl bg-black/40 border border-white/10 p-1 flex items-center overflow-hidden">
            <div className="absolute left-2 top-0.5 flex items-center gap-1 text-[8px] font-bold text-muted pointer-events-none uppercase tracking-wider z-10">
              <Type className="size-2.5 text-cyan-400" />
              <span>Text & Subtitles</span>
            </div>

            {/* Text Layers */}
            {project.textLayers.map((txt) => {
              const txtWidth = (txt.timelineEnd - txt.timelineStart) * pxPerSec;
              const txtLeft = txt.timelineStart * pxPerSec;
              const isSelected = txt.id === selectedTextId;

              return (
                <div
                  key={txt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectText(txt.id);
                    seek(txt.timelineStart);
                  }}
                  style={{ left: `${txtLeft}px`, width: `${txtWidth}px` }}
                  className={cn(
                    "absolute top-1 bottom-1 rounded-xl px-2 flex items-center truncate border cursor-pointer transition-all",
                    isSelected
                      ? "bg-cyan-500/25 border-cyan-400 ring-1 ring-cyan-400/40"
                      : "bg-cyan-950/30 border-cyan-500/20 hover:border-cyan-500/40",
                  )}
                >
                  <span className="truncate text-[10px] font-bold text-cyan-200">
                    Aa: {txt.text}
                  </span>
                </div>
              );
            })}

            {/* Captions */}
            {project.captions.map((cap) => {
              const capWidth = (cap.timelineEnd - cap.timelineStart) * pxPerSec;
              const capLeft = cap.timelineStart * pxPerSec;

              return (
                <div
                  key={cap.id}
                  style={{ left: `${capLeft}px`, width: `${capWidth}px` }}
                  className="absolute top-1 bottom-1 rounded-xl px-2 flex items-center truncate bg-emerald-950/30 border border-emerald-500/20 pointer-events-none"
                >
                  <span className="truncate text-[9px] font-semibold text-emerald-300">
                    CC: {cap.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* TRACK 4: EFFECTS & STICKERS TRACK */}
          <div className="relative h-9 rounded-2xl bg-black/40 border border-white/10 p-1 flex items-center overflow-hidden">
            <div className="absolute left-2 top-0.5 flex items-center gap-1 text-[8px] font-bold text-muted pointer-events-none uppercase tracking-wider z-10">
              <Sparkles className="size-2.5 text-amber-400" />
              <span>FX & Stickers</span>
            </div>

            {project.effects.map((fx) => {
              const fxWidth = (fx.timelineEnd - fx.timelineStart) * pxPerSec;
              const fxLeft = fx.timelineStart * pxPerSec;
              const isSelected = fx.id === selectedEffectId;

              return (
                <div
                  key={fx.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectEffect(fx.id);
                  }}
                  style={{ left: `${fxLeft}px`, width: `${fxWidth}px` }}
                  className={cn(
                    "absolute top-1 bottom-1 rounded-xl px-2 flex items-center truncate border cursor-pointer transition-all",
                    isSelected
                      ? "bg-amber-500/25 border-amber-400 ring-1 ring-amber-400/40"
                      : "bg-amber-950/30 border-amber-500/20 hover:border-amber-500/40",
                  )}
                >
                  <span className="truncate text-[9px] font-bold text-amber-300 uppercase">
                    ✨ {fx.effect} ({fx.intensity}%)
                  </span>
                </div>
              );
            })}

            {project.stickers.map((stk) => {
              const stkWidth = (stk.timelineEnd - stk.timelineStart) * pxPerSec;
              const stkLeft = stk.timelineStart * pxPerSec;

              return (
                <div
                  key={stk.id}
                  style={{ left: `${stkLeft}px`, width: `${stkWidth}px` }}
                  className="absolute top-1 bottom-1 rounded-xl px-1.5 flex items-center justify-center bg-rose-950/30 border border-rose-500/20"
                >
                  <span className="text-xs">{stk.emojiOrUrl}</span>
                </div>
              );
            })}
          </div>

          {/* 3. Red Playhead Indicator Line with diamond head */}
          <div
            style={{ left: `${playheadX}px` }}
            className="pointer-events-none absolute inset-y-0 z-30 flex flex-col items-center -translate-x-1/2"
          >
            {/* Diamond Playhead top marker */}
            <div className="size-3.5 rotate-45 bg-rose-500 border border-white shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
            {/* Vertical red line */}
            <div className="w-0.5 flex-1 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
