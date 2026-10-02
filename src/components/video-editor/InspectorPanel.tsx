import { useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Copy,
  Eye,
  FlipHorizontal,
  FlipVertical,
  Gauge,
  Italic,
  Layers,
  Maximize2,
  Music,
  Palette,
  Play,
  RotateCw,
  Scissors,
  Sliders,
  Sparkles,
  Trash2,
  Type,
  Video,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useStudio } from "@/lib/studio/store";
import type {
  AspectRatio,
  FilterPreset,
  TextAnimationType,
  TransitionType,
} from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";

interface InspectorPanelProps {
  className?: string;
  onCloseMobile?: () => void;
}

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0];

const FILTER_PRESETS: { id: FilterPreset; label: string; desc: string }[] = [
  { id: "none", label: "Original", desc: "Natural footage" },
  { id: "cyber_glow", label: "Cyber Glow", desc: "Vibrant neon blues" },
  { id: "cinematic", label: "Cinema 35mm", desc: "Moody blockbuster contrast" },
  { id: "vintage", label: "Vintage 90s", desc: "Warm sepia & faded tones" },
  { id: "dark", label: "Dark Noir", desc: "Crushed shadows" },
  { id: "warm", label: "Golden Hour", desc: "Warm sunshine amber" },
  { id: "cold", label: "Cold Chill", desc: "Icy blue aesthetic" },
  { id: "meme", label: "Viral Pop", desc: "Oversaturated meme pop" },
];

const TRANSITION_LIST: { type: TransitionType; label: string; icon: string }[] = [
  { type: "none", label: "Cut", icon: "✂️" },
  { type: "flash", label: "Flash", icon: "⚡" },
  { type: "zoom", label: "Zoom In", icon: "🔍" },
  { type: "glitch", label: "Glitch", icon: "👾" },
  { type: "fade", label: "Fade", icon: "🔀" },
  { type: "spin", label: "Spin", icon: "🔄" },
  { type: "shake", label: "Shake", icon: "📳" },
  { type: "slide_left", label: "Slide Left", icon: "⬅️" },
  { type: "slide_right", label: "Slide Right", icon: "➡️" },
];

const TEXT_FONTS: { id: "Impact" | "Display" | "Sans" | "Serif" | "Monospace"; label: string }[] = [
  { id: "Impact", label: "Impact (Meme)" },
  { id: "Display", label: "Syne (Display)" },
  { id: "Sans", label: "Sans Bold" },
  { id: "Serif", label: "Serif / Cinema" },
  { id: "Monospace", label: "Mono / Code" },
];

const TEXT_ANIMATIONS: { id: TextAnimationType; label: string }[] = [
  { id: "none", label: "Static" },
  { id: "pop", label: "Pop In" },
  { id: "bounce", label: "Bounce" },
  { id: "typewriter", label: "Typewriter" },
  { id: "glitch", label: "Glitch" },
  { id: "fade", label: "Fade In" },
];

export function InspectorPanel({ className, onCloseMobile }: InspectorPanelProps) {
  const project = useStudio((s) => s.project);
  const selectedClipId = useStudio((s) => s.selectedClipId);
  const selectedTextId = useStudio((s) => s.selectedTextId);
  const selectedAudioId = useStudio((s) => s.selectedAudioId);
  const selectedStickerId = useStudio((s) => s.selectedStickerId);
  const selectedEffectId = useStudio((s) => s.selectedEffectId);

  const clearSelection = useStudio((s) => s.clearSelection);
  const selectEffect = useStudio((s) => s.selectEffect);
  const setClipSpeed = useStudio((s) => s.setClipSpeed);
  const setClipVolume = useStudio((s) => s.setClipVolume);
  const setClipRotation = useStudio((s) => s.setClipRotation);
  const flipClipHorizontal = useStudio((s) => s.flipClipHorizontal);
  const flipClipVertical = useStudio((s) => s.flipClipVertical);
  const setClipTransform = useStudio((s) => s.setClipTransform);
  const setClipTransition = useStudio((s) => s.setClipTransition);
  const splitClipAtPlayhead = useStudio((s) => s.splitClipAtPlayhead);
  const duplicateClip = useStudio((s) => s.duplicateClip);
  const removeClip = useStudio((s) => s.removeClip);

  const updateTextLayer = useStudio((s) => s.updateTextLayer);
  const removeTextLayer = useStudio((s) => s.removeTextLayer);

  const updateAudioTrack = useStudio((s) => s.updateAudioTrack);
  const removeAudioTrack = useStudio((s) => s.removeAudioTrack);

  const updateSticker = useStudio((s) => s.updateSticker);
  const removeSticker = useStudio((s) => s.removeSticker);

  const updateEffect = useStudio((s) => s.updateEffect);
  const removeEffect = useStudio((s) => s.removeEffect);
  const clearAllEffects = useStudio((s) => s.clearAllEffects);

  const setAdjustments = useStudio((s) => s.setAdjustments);
  const setFilterPreset = useStudio((s) => s.setFilterPreset);
  const setAspectRatio = useStudio((s) => s.setAspectRatio);

  const selectedClip = project.clips.find((c) => c.id === selectedClipId);
  const selectedText = project.textLayers.find((t) => t.id === selectedTextId);
  const selectedAudio = project.audioTracks.find((a) => a.id === selectedAudioId);
  const selectedSticker = project.stickers.find((s) => s.id === selectedStickerId);
  const selectedEffect = project.effects.find((e) => e.id === selectedEffectId);

  return (
    <aside
      className={cn(
        "w-80 border-l border-white/10 bg-[#0e111a] p-4 flex flex-col gap-4 overflow-y-auto scrollbar-thin select-none text-white",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Sliders className="size-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/90">
            {selectedClip
              ? "Clip Properties"
              : selectedText
                ? "Text Inspector"
                : selectedAudio
                  ? "Audio Settings"
                  : selectedSticker
                    ? "Sticker Inspector"
                    : selectedEffect
                      ? "Visual FX Properties"
                      : "Canvas & Effects"}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          {(selectedClip || selectedText || selectedAudio || selectedSticker || selectedEffect) && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-[10px] text-white/50 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10"
            >
              Deselect
            </button>
          )}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1 text-white/60 hover:text-white"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* ----------------- 1. CLIP SELECTED INSPECTOR ----------------- */}
      {selectedClip && (
        <div className="flex flex-col gap-4">
          {/* Clip Identity Card */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
            <img
              src={selectedClip.sourceUrl}
              alt={selectedClip.name}
              className="size-12 rounded-lg object-cover bg-black shrink-0 border border-white/10"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{selectedClip.name}</p>
              <p className="text-[10px] text-white/50 font-mono mt-0.5">
                {selectedClip.duration.toFixed(1)}s • {selectedClip.mediaType}
              </p>
            </div>
          </div>

          {/* Transform & Crop */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
              <Maximize2 className="size-3 text-cyan-400" />
              <span>Transform & Scale</span>
            </label>

            {/* Scale Slider */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70">Scale</span>
              <span className="font-mono text-cyan-400 text-[11px]">
                {((selectedClip.scale || 1.0) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.05"
              value={selectedClip.scale || 1.0}
              onChange={(e) =>
                setClipTransform(selectedClip.id, { scale: Number.parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-400"
            />

            {/* Flips & Rotation buttons */}
            <div className="grid grid-cols-3 gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => flipClipHorizontal(selectedClip.id)}
                className={cn(
                  "flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs border transition-colors",
                  selectedClip.flipH
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:text-white",
                )}
                title="Flip Horizontal"
              >
                <FlipHorizontal className="size-3.5" />
                <span className="text-[10px]">Flip H</span>
              </button>

              <button
                type="button"
                onClick={() => flipClipVertical(selectedClip.id)}
                className={cn(
                  "flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs border transition-colors",
                  selectedClip.flipV
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:text-white",
                )}
                title="Flip Vertical"
              >
                <FlipVertical className="size-3.5" />
                <span className="text-[10px]">Flip V</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextRot = ((selectedClip.rotation || 0) + 90) % 360;
                  setClipRotation(selectedClip.id, nextRot);
                  playSound("pop");
                }}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs border border-white/10 bg-white/5 text-white/70 hover:text-white transition-colors"
                title="Rotate 90°"
              >
                <RotateCw className="size-3.5" />
                <span className="text-[10px] font-mono">{selectedClip.rotation || 0}°</span>
              </button>
            </div>

            {/* Opacity Slider */}
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-white/70">Opacity</span>
              <span className="font-mono text-cyan-400 text-[11px]">
                {Math.round((selectedClip.opacity ?? 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={selectedClip.opacity ?? 1}
              onChange={(e) =>
                setClipTransform(selectedClip.id, { opacity: Number.parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="h-px bg-white/10" />

          {/* Speed Controls */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Gauge className="size-3 text-cyan-400" />
                <span>Speed Control</span>
              </span>
              <span className="font-mono text-cyan-400 text-xs">{selectedClip.speed}x</span>
            </label>

            <div className="grid grid-cols-4 gap-1">
              {SPEED_PRESETS.map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setClipSpeed(selectedClip.id, spd)}
                  className={cn(
                    "py-1 rounded text-[11px] font-mono font-semibold transition-colors border",
                    selectedClip.speed === spd
                      ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white",
                  )}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Volume Control */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="size-3 text-cyan-400" />
                <span>Clip Volume</span>
              </span>
              <span className="font-mono text-cyan-400 text-xs">{selectedClip.volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={selectedClip.volume}
              onChange={(e) => setClipVolume(selectedClip.id, Number.parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="h-px bg-white/10" />

          {/* Transition In */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="size-3 text-cyan-400" />
              <span>Transition In</span>
            </label>

            <div className="grid grid-cols-3 gap-1.5">
              {TRANSITION_LIST.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() =>
                    setClipTransition(selectedClip.id, {
                      type: t.type,
                      duration: selectedClip.transitionIn?.duration || 0.4,
                    })
                  }
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all",
                    selectedClip.transitionIn?.type === t.type
                      ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white",
                  )}
                >
                  <span className="text-base">{t.icon}</span>
                  <span className="text-[9px] font-medium mt-1 truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Quick Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                duplicateClip(selectedClip.id);
                playSound("pop");
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-white/90 transition-colors"
            >
              <Copy className="size-3.5" />
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              onClick={() => {
                removeClip(selectedClip.id);
                playSound("boom");
              }}
              disabled={project.clips.length <= 1}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ----------------- 2. TEXT LAYER SELECTED INSPECTOR ----------------- */}
      {selectedText && (
        <div className="flex flex-col gap-4">
          {/* Text Input Content */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Text Content
            </label>
            <textarea
              value={selectedText.text}
              onChange={(e) => updateTextLayer(selectedText.id, { text: e.target.value })}
              rows={3}
              className="w-full rounded-xl bg-white/5 border border-white/15 p-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
              placeholder="Enter text..."
            />
          </div>

          {/* Typography: Font Family */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Font Family
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {TEXT_FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => updateTextLayer(selectedText.id, { fontFamily: f.id })}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-xs border text-left truncate transition-colors",
                    selectedText.fontFamily === f.id
                      ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-bold"
                      : "bg-white/5 border-white/10 text-white/70 hover:text-white",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size & Formatting (Bold, Italic, Alignment) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70">Font Size</span>
              <span className="font-mono text-cyan-400 text-xs">{selectedText.fontSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="72"
              value={selectedText.fontSize}
              onChange={(e) =>
                updateTextLayer(selectedText.id, { fontSize: Number.parseInt(e.target.value, 10) })
              }
              className="w-full accent-cyan-400"
            />

            {/* Formatting Row */}
            <div className="flex items-center gap-1.5 mt-1">
              <button
                type="button"
                onClick={() =>
                  updateTextLayer(selectedText.id, {
                    fontWeight: selectedText.fontWeight === "bold" ? "normal" : "bold",
                  })
                }
                className={cn(
                  "p-1.5 rounded-lg border text-xs",
                  selectedText.fontWeight === "bold"
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white",
                )}
                title="Bold"
              >
                <Bold className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  updateTextLayer(selectedText.id, {
                    fontStyle: selectedText.fontStyle === "italic" ? "normal" : "italic",
                  })
                }
                className={cn(
                  "p-1.5 rounded-lg border text-xs",
                  selectedText.fontStyle === "italic"
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white",
                )}
                title="Italic"
              >
                <Italic className="size-3.5" />
              </button>

              <div className="w-px h-4 bg-white/10 mx-1" />

              <button
                type="button"
                onClick={() => updateTextLayer(selectedText.id, { textAlign: "left" })}
                className={cn(
                  "p-1.5 rounded-lg border text-xs",
                  selectedText.textAlign === "left"
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white",
                )}
                title="Align Left"
              >
                <AlignLeft className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={() => updateTextLayer(selectedText.id, { textAlign: "center" })}
                className={cn(
                  "p-1.5 rounded-lg border text-xs",
                  (!selectedText.textAlign || selectedText.textAlign === "center")
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white",
                )}
                title="Align Center"
              >
                <AlignCenter className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={() => updateTextLayer(selectedText.id, { textAlign: "right" })}
                className={cn(
                  "p-1.5 rounded-lg border text-xs",
                  selectedText.textAlign === "right"
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white",
                )}
                title="Align Right"
              >
                <AlignRight className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Color & Styling */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Colors & Background
            </label>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-white/50 block mb-1">Text Color</span>
                <input
                  type="color"
                  value={selectedText.color || "#ffffff"}
                  onChange={(e) => updateTextLayer(selectedText.id, { color: e.target.value })}
                  className="w-full h-8 rounded-lg cursor-pointer bg-white/5 border border-white/10 p-0.5"
                />
              </div>

              <div>
                <span className="text-[10px] text-white/50 block mb-1">Stroke Color</span>
                <input
                  type="color"
                  value={selectedText.strokeColor || "#000000"}
                  onChange={(e) =>
                    updateTextLayer(selectedText.id, {
                      strokeColor: e.target.value,
                      strokeWidth: selectedText.strokeWidth || 4,
                    })
                  }
                  className="w-full h-8 rounded-lg cursor-pointer bg-white/5 border border-white/10 p-0.5"
                />
              </div>
            </div>

            {/* Background pill toggle */}
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-white/70">Background Pill</span>
              <button
                type="button"
                onClick={() =>
                  updateTextLayer(selectedText.id, {
                    bgColor: selectedText.bgColor ? undefined : "rgba(0, 0, 0, 0.75)",
                  })
                }
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-medium border",
                  selectedText.bgColor
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-white/5 border-white/10 text-white/50",
                )}
              >
                {selectedText.bgColor ? "Enabled" : "Off"}
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Animation Presets */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Animation
            </label>
            <div className="grid grid-cols-3 gap-1">
              {TEXT_ANIMATIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => updateTextLayer(selectedText.id, { animation: a.id })}
                  className={cn(
                    "py-1.5 rounded-lg text-[10px] font-medium border text-center transition-colors",
                    selectedText.animation === a.id
                      ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-bold"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white",
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timing & Duration (Length of text layer) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                Text Duration (Length)
              </span>
              <span className="font-mono text-indigo-400 text-xs">
                {(selectedText.timelineEnd - selectedText.timelineStart).toFixed(1)}s
              </span>
            </div>

            <input
              type="range"
              min="0.5"
              max={Math.max(10, Math.ceil(project.duration))}
              step="0.1"
              value={selectedText.timelineEnd - selectedText.timelineStart}
              onChange={(e) => {
                const len = Number.parseFloat(e.target.value);
                updateTextLayer(selectedText.id, {
                  timelineEnd: selectedText.timelineStart + len,
                });
              }}
              className="w-full accent-indigo-400"
            />

            <div className="grid grid-cols-3 gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => {
                  updateTextLayer(selectedText.id, {
                    timelineEnd: selectedText.timelineEnd + 1.0,
                  });
                }}
                className="py-1 px-2 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-400 text-[10px] text-white/80 transition-colors"
              >
                +1.0s
              </button>
              <button
                type="button"
                onClick={() => {
                  updateTextLayer(selectedText.id, {
                    timelineEnd: selectedText.timelineEnd + 3.0,
                  });
                }}
                className="py-1 px-2 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-400 text-[10px] text-white/80 transition-colors"
              >
                +3.0s
              </button>
              <button
                type="button"
                onClick={() => {
                  updateTextLayer(selectedText.id, {
                    timelineStart: 0,
                    timelineEnd: project.duration,
                  });
                }}
                className="py-1 px-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-bold text-indigo-300 hover:bg-indigo-500/30 transition-colors"
              >
                Entire Video
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Delete Text */}
          <button
            type="button"
            onClick={() => {
              removeTextLayer(selectedText.id);
              playSound("boom");
            }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 text-xs font-semibold transition-colors"
          >
            <Trash2 className="size-3.5" />
            <span>Delete Text Layer</span>
          </button>
        </div>
      )}

      {/* ----------------- 3. AUDIO TRACK SELECTED INSPECTOR ----------------- */}
      {selectedAudio && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-pink-950/20 border border-pink-500/30">
            <Music className="size-6 text-pink-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-pink-200 truncate">{selectedAudio.title}</p>
              <p className="text-[10px] text-pink-300/60 font-mono mt-0.5">
                {selectedAudio.artist} • {selectedAudio.duration.toFixed(1)}s
              </p>
            </div>
          </div>

          {/* Volume Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70">Track Volume</span>
              <span className="font-mono text-pink-400 text-xs">{selectedAudio.volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedAudio.volume}
              onChange={(e) =>
                updateAudioTrack(selectedAudio.id, {
                  volume: Number.parseInt(e.target.value, 10),
                })
              }
              className="w-full accent-pink-400"
            />
          </div>

          {/* Timing & Duration (Length of audio track) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                Track Duration
              </span>
              <span className="font-mono text-pink-400 text-xs">
                {selectedAudio.duration.toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max={Math.max(10, Math.ceil(project.duration))}
              step="0.1"
              value={selectedAudio.duration}
              onChange={(e) => {
                const len = Number.parseFloat(e.target.value);
                updateAudioTrack(selectedAudio.id, { duration: len });
              }}
              className="w-full accent-pink-400"
            />
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => {
                  updateAudioTrack(selectedAudio.id, {
                    duration: selectedAudio.duration + 2.0,
                  });
                }}
                className="py-1 px-2 rounded-lg bg-white/5 border border-white/10 hover:border-pink-400 text-[10px] text-white/80 transition-colors"
              >
                +2.0s Length
              </button>
              <button
                type="button"
                onClick={() => {
                  updateAudioTrack(selectedAudio.id, {
                    timelineStart: 0,
                    duration: project.duration,
                  });
                }}
                className="py-1 px-2 rounded-lg bg-pink-500/20 border border-pink-500/40 text-[10px] font-bold text-pink-300 hover:bg-pink-500/30 transition-colors"
              >
                Match Video Length
              </button>
            </div>
          </div>

          {/* Fade In / Out */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                updateAudioTrack(selectedAudio.id, { fadeIn: !selectedAudio.fadeIn })
              }
              className={cn(
                "py-2 rounded-xl border text-center font-medium transition-colors",
                selectedAudio.fadeIn
                  ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                  : "bg-white/5 border-white/10 text-white/50",
              )}
            >
              Fade In {selectedAudio.fadeIn ? "✓" : ""}
            </button>
            <button
              type="button"
              onClick={() =>
                updateAudioTrack(selectedAudio.id, { fadeOut: !selectedAudio.fadeOut })
              }
              className={cn(
                "py-2 rounded-xl border text-center font-medium transition-colors",
                selectedAudio.fadeOut
                  ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                  : "bg-white/5 border-white/10 text-white/50",
              )}
            >
              Fade Out {selectedAudio.fadeOut ? "✓" : ""}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              removeAudioTrack(selectedAudio.id);
              playSound("boom");
            }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 text-xs font-semibold mt-2 transition-colors"
          >
            <Trash2 className="size-3.5" />
            <span>Remove Audio Track</span>
          </button>
        </div>
      )}

      {/* ----------------- 4. VISUAL EFFECT SELECTED INSPECTOR ----------------- */}
      {selectedEffect && (
        <div className="flex flex-col gap-4">
          {/* Effect Identity Card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
            <span className="text-2xl">
              {selectedEffect.effect === "vintage_grain"
                ? "🎞️"
                : selectedEffect.effect === "glitch"
                  ? "👾"
                  : selectedEffect.effect === "vhs"
                    ? "📼"
                    : selectedEffect.effect === "pixelate"
                      ? "🔲"
                      : selectedEffect.effect === "blur"
                        ? "💫"
                        : selectedEffect.effect === "motion_blur"
                          ? "⚡"
                          : "✨"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-cyan-200">
                {selectedEffect.effect === "vintage_grain"
                  ? "Film Grain (35mm)"
                  : selectedEffect.effect === "glitch"
                    ? "Cyber Glitch"
                    : selectedEffect.effect === "vhs"
                      ? "VHS Retro Tape"
                      : selectedEffect.effect === "pixelate"
                        ? "8-Bit Pixelate"
                        : selectedEffect.effect === "blur"
                          ? "Radial Blur"
                          : selectedEffect.effect === "motion_blur"
                            ? "Action Motion Blur"
                            : selectedEffect.effect.toUpperCase()}
              </p>
              <p className="text-[10px] text-cyan-300/60 font-mono mt-0.5">
                {(selectedEffect.timelineEnd - selectedEffect.timelineStart).toFixed(1)}s Duration
              </p>
            </div>
          </div>

          {/* Timing & Duration (Length of effect) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                Effect Duration (Length)
              </span>
              <span className="font-mono text-cyan-400 text-xs">
                {(selectedEffect.timelineEnd - selectedEffect.timelineStart).toFixed(1)}s
              </span>
            </div>

            <input
              type="range"
              min="0.5"
              max={Math.max(10, Math.ceil(project.duration))}
              step="0.1"
              value={selectedEffect.timelineEnd - selectedEffect.timelineStart}
              onChange={(e) => {
                const len = Number.parseFloat(e.target.value);
                updateEffect(selectedEffect.id, {
                  timelineEnd: selectedEffect.timelineStart + len,
                });
              }}
              className="w-full accent-cyan-400"
            />

            <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
              <span>Start: {selectedEffect.timelineStart.toFixed(1)}s</span>
              <span>End: {selectedEffect.timelineEnd.toFixed(1)}s</span>
            </div>

            {/* Quick Extension Buttons */}
            <div className="grid grid-cols-3 gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => {
                  updateEffect(selectedEffect.id, {
                    timelineEnd: selectedEffect.timelineEnd + 1.0,
                  });
                  playSound("pop");
                }}
                className="py-1 px-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400 text-[10px] text-white/80 transition-colors"
              >
                +1.0s
              </button>
              <button
                type="button"
                onClick={() => {
                  updateEffect(selectedEffect.id, {
                    timelineEnd: selectedEffect.timelineEnd + 3.0,
                  });
                  playSound("pop");
                }}
                className="py-1 px-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400 text-[10px] text-white/80 transition-colors"
              >
                +3.0s
              </button>
              <button
                type="button"
                onClick={() => {
                  updateEffect(selectedEffect.id, {
                    timelineStart: 0,
                    timelineEnd: project.duration,
                  });
                  playSound("pop");
                }}
                className="py-1 px-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/30 transition-colors"
              >
                Fill Video
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Intensity Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                Effect Intensity
              </span>
              <span className="font-mono text-cyan-400 text-xs">
                {selectedEffect.intensity}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={selectedEffect.intensity}
              onChange={(e) =>
                updateEffect(selectedEffect.id, {
                  intensity: Number.parseInt(e.target.value, 10),
                })
              }
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Clean Overlay Notice */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white/60 leading-relaxed">
            💡 <strong className="text-white/80">Clean Typography:</strong> Effects render directly onto video footage beneath text & stickers. Text remains crisp and unaffected.
          </div>

          <div className="h-px bg-white/10" />

          {/* Remove / Delete Effect */}
          <button
            type="button"
            onClick={() => {
              removeEffect(selectedEffect.id);
              playSound("boom");
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 text-xs font-semibold transition-colors shadow-sm"
          >
            <Trash2 className="size-3.5" />
            <span>Remove Effect</span>
          </button>
        </div>
      )}

      {/* ----------------- 5. STICKER SELECTED INSPECTOR ----------------- */}
      {selectedSticker && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
            <span className="text-3xl">{selectedSticker.emojiOrUrl}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-200">Sticker / Overlay</p>
              <p className="text-[10px] text-amber-300/60 font-mono mt-0.5">
                {(selectedSticker.timelineEnd - selectedSticker.timelineStart).toFixed(1)}s
              </p>
            </div>
          </div>

          {/* Scale */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70">Size / Scale</span>
              <span className="font-mono text-amber-400 text-xs">
                {(selectedSticker.scale * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={selectedSticker.scale}
              onChange={(e) =>
                updateSticker(selectedSticker.id, {
                  scale: Number.parseFloat(e.target.value),
                })
              }
              className="w-full accent-amber-400"
            />
          </div>

          {/* Timing & Duration */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                Duration (Length)
              </span>
              <span className="font-mono text-amber-400 text-xs">
                {(selectedSticker.timelineEnd - selectedSticker.timelineStart).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max={Math.max(10, Math.ceil(project.duration))}
              step="0.1"
              value={selectedSticker.timelineEnd - selectedSticker.timelineStart}
              onChange={(e) => {
                const len = Number.parseFloat(e.target.value);
                updateSticker(selectedSticker.id, {
                  timelineEnd: selectedSticker.timelineStart + len,
                });
              }}
              className="w-full accent-amber-400"
            />

            <div className="grid grid-cols-3 gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => {
                  updateSticker(selectedSticker.id, {
                    timelineEnd: selectedSticker.timelineEnd + 1.0,
                  });
                }}
                className="py-1 px-2 rounded-lg bg-white/5 border border-white/10 hover:border-amber-400 text-[10px] text-white/80 transition-colors"
              >
                +1.0s
              </button>
              <button
                type="button"
                onClick={() => {
                  updateSticker(selectedSticker.id, {
                    timelineEnd: selectedSticker.timelineEnd + 3.0,
                  });
                }}
                className="py-1 px-2 rounded-lg bg-white/5 border border-white/10 hover:border-amber-400 text-[10px] text-white/80 transition-colors"
              >
                +3.0s
              </button>
              <button
                type="button"
                onClick={() => {
                  updateSticker(selectedSticker.id, {
                    timelineStart: 0,
                    timelineEnd: project.duration,
                  });
                }}
                className="py-1 px-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 hover:bg-amber-500/30 transition-colors"
              >
                Entire Video
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              removeSticker(selectedSticker.id);
              playSound("boom");
            }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 text-xs font-semibold mt-2 transition-colors"
          >
            <Trash2 className="size-3.5" />
            <span>Remove Sticker</span>
          </button>
        </div>
      )}

      {/* ----------------- 6. DEFAULT: CANVAS & GLOBAL EFFECTS ----------------- */}
      {!selectedClip && !selectedText && !selectedAudio && !selectedSticker && !selectedEffect && (
        <div className="flex flex-col gap-4">
          {/* Active Visual Effects on Project */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-cyan-400" />
                <span className="text-[11px] font-bold text-white/90 uppercase tracking-wider">
                  Active Visual FX ({project.effects.length})
                </span>
              </div>
              {project.effects.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearAllEffects();
                    playSound("boom");
                  }}
                  className="text-[9px] text-red-400 hover:text-red-300 font-medium px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  Remove All
                </button>
              )}
            </div>

            {project.effects.length === 0 ? (
              <p className="text-[11px] text-white/40 italic">
                No visual effects active. Add an effect from the sidebar Effects tab.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 mt-1">
                {project.effects.map((fx) => {
                  const fxDuration = Math.max(0.1, fx.timelineEnd - fx.timelineStart);
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
                      onClick={() => selectEffect(fx.id)}
                      className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10 hover:border-cyan-400 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{fxIcon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{fxName}</p>
                          <p className="text-[9px] text-white/50 font-mono">
                            {fxDuration.toFixed(1)}s • {fx.intensity}%
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEffect(fx.id);
                          playSound("pop");
                        }}
                        className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
                        title="Remove effect"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Canvas Aspect Ratio */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Canvas Ratio
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["9:16", "1:1", "4:5", "16:9"] as AspectRatio[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAspectRatio(r)}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-colors",
                    project.aspectRatio === r
                      ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Color Filter Presets */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Filter Presets
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {FILTER_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFilterPreset(p.id)}
                  className={cn(
                    "p-2 rounded-xl border text-left transition-colors",
                    project.adjustments.filterPreset === p.id
                      ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold"
                      : "bg-white/5 border-white/10 text-white/70 hover:text-white",
                  )}
                >
                  <p className="text-xs truncate">{p.label}</p>
                  <p className="text-[9px] text-white/40 truncate mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Fine Adjustments (Sliders) */}
          <div className="flex flex-col gap-3">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Color Adjustments
            </label>

            {/* Brightness */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/70">Brightness</span>
                <span className="font-mono text-cyan-400 text-[11px]">
                  {project.adjustments.brightness}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={project.adjustments.brightness}
                onChange={(e) =>
                  setAdjustments({ brightness: Number.parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/70">Contrast</span>
                <span className="font-mono text-cyan-400 text-[11px]">
                  {project.adjustments.contrast}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={project.adjustments.contrast}
                onChange={(e) =>
                  setAdjustments({ contrast: Number.parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/70">Saturation</span>
                <span className="font-mono text-cyan-400 text-[11px]">
                  {project.adjustments.saturation}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={project.adjustments.saturation}
                onChange={(e) =>
                  setAdjustments({ saturation: Number.parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Blur */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/70">Blur</span>
                <span className="font-mono text-cyan-400 text-[11px]">
                  {project.adjustments.blur || 0}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={project.adjustments.blur || 0}
                onChange={(e) =>
                  setAdjustments({ blur: Number.parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Vignette */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/70">Vignette</span>
                <span className="font-mono text-cyan-400 text-[11px]">
                  {project.adjustments.vignette}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={project.adjustments.vignette}
                onChange={(e) =>
                  setAdjustments({ vignette: Number.parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400"
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
