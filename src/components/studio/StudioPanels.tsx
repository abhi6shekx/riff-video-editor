import { useState } from "react";
import {
  Check,
  Clapperboard,
  Copy,
  Flame,
  Gauge,
  Mic,
  Music,
  Plus,
  Radio,
  RotateCw,
  Scissors,
  Sliders,
  Smile,
  Sparkles,
  Trash2,
  Type,
  Upload,
  Volume2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useStudio } from "@/lib/studio/store";
import {
  PRESET_MUSIC_TRACKS,
  PRESET_SFX,
  playStudioSFX,
  VoiceoverRecorder,
} from "@/lib/studio/audio-engine";
import { STOCK_SCENES, STUDIO_TEMPLATES } from "@/lib/studio/templates";
import {
  AI_MEME_PUNCHLINES,
  AI_SUBTITLE_PRESETS,
  alignClipsToBeatSync,
  generateAiAutoEdit,
} from "@/lib/studio/ai-tools";
import type { FilterPreset, TextAnimationType, TransitionType } from "@/lib/studio/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playSound } from "@/lib/sounds";

const FILTER_PRESETS: { id: FilterPreset; label: string; desc: string }[] = [
  { id: "none", label: "Original", desc: "Natural footage look" },
  { id: "cyber_glow", label: "Cyber Glow", desc: "Vibrant neon blues & contrast" },
  { id: "cinematic", label: "Cinema 35mm", desc: "Moody blockbuster contrast" },
  { id: "vintage", label: "Vintage 90s", desc: "Warm sepia & faded highlights" },
  { id: "dark", label: "Dark Noir", desc: "High contrast shadow crush" },
  { id: "warm", label: "Golden Hour", desc: "Warm sunshine amber glow" },
  { id: "cold", label: "Cold Chill", desc: "Icy blue cyber aesthetic" },
  { id: "meme", label: "Viral Pop", desc: "Punchy oversaturated meme pop" },
];

const TRANSITION_LIST: { type: TransitionType; label: string; icon: string }[] = [
  { type: "none", label: "Cut", icon: "✂️" },
  { type: "flash", label: "Flash", icon: "⚡" },
  { type: "zoom", label: "Zoom In", icon: "🔍" },
  { type: "glitch", label: "Glitch", icon: "👾" },
  { type: "fade", label: "Crossfade", icon: "🔀" },
  { type: "spin", label: "Spin 3D", icon: "🔄" },
  { type: "shake", label: "Cam Shake", icon: "📳" },
  { type: "slide_left", label: "Slide Left", icon: "⬅️" },
  { type: "slide_right", label: "Slide Right", icon: "➡️" },
];

const TEXT_FONTS: { id: "Impact" | "Display" | "Sans" | "Serif" | "Monospace"; label: string }[] = [
  { id: "Impact", label: "Impact (Meme)" },
  { id: "Display", label: "Syne (Display)" },
  { id: "Sans", label: "Sans Bold" },
  { id: "Serif", label: "Serif / Cinematic" },
  { id: "Monospace", label: "Retro Code / Mono" },
];

const TEXT_ANIMATIONS: { id: TextAnimationType; label: string }[] = [
  { id: "none", label: "Static" },
  { id: "pop", label: "Pop In" },
  { id: "bounce", label: "Bounce" },
  { id: "typewriter", label: "Typewriter" },
  { id: "glitch", label: "Glitch" },
  { id: "fade", label: "Fade In" },
];

const EMOJI_STICKERS = [
  "🔥", "😂", "💀", "❤️", "🧢", "🤡", "👀", "🏏", "🍕", "✨", "🚀", "🤫",
  "🤯", "💯", "🎉", "💰", "👑", "⚡", "🇮🇳", "🎮", "🍿", "😭", "👏", "🗿",
];

export function StudioPanels() {
  const activeTab = useStudio((s) => s.activeTab);
  const setActiveTab = useStudio((s) => s.setActiveTab);
  const project = useStudio((s) => s.project);
  const addClips = useStudio((s) => s.addClips);
  const selectedClipId = useStudio((s) => s.selectedClipId);
  const setClipTransition = useStudio((s) => s.setClipTransition);
  const addAudioTrack = useStudio((s) => s.addAudioTrack);
  const addTextLayer = useStudio((s) => s.addTextLayer);
  const setCaptions = useStudio((s) => s.setCaptions);
  const addSticker = useStudio((s) => s.addSticker);
  const addEffect = useStudio((s) => s.addEffect);
  const setAdjustments = useStudio((s) => s.setAdjustments);
  const setFilterPreset = useStudio((s) => s.setFilterPreset);
  const toggleMemeMode = useStudio((s) => s.toggleMemeMode);
  const setMemeText = useStudio((s) => s.setMemeText);
  const applyTemplate = useStudio((s) => s.applyTemplate);
  const currentTime = useStudio((s) => s.currentTime);
  const setClipSpeed = useStudio((s) => s.setClipSpeed);
  const splitClipAtPlayhead = useStudio((s) => s.splitClipAtPlayhead);
  const duplicateClip = useStudio((s) => s.duplicateClip);
  const removeClip = useStudio((s) => s.removeClip);
  const setClipVolume = useStudio((s) => s.setClipVolume);
  const setClipRotation = useStudio((s) => s.setClipRotation);

  // Voiceover state
  const [isRecordingVo, setIsRecordingVo] = useState(false);
  const [voRecorder] = useState(() => new VoiceoverRecorder());

  // Text input state
  const [newTextStr, setNewTextStr] = useState("VIRAL MOMENT 🔥");
  const [selectedFont, setSelectedFont] = useState<"Impact" | "Display" | "Sans" | "Serif" | "Monospace">("Display");
  const [selectedAnim, setSelectedAnim] = useState<TextAnimationType>("pop");
  const [textColor, setTextColor] = useState("#FFFFFF");

  // Custom File Upload
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      addClips([
        {
          name: file.name.slice(0, 16),
          sourceUrl: url,
          mediaType: file.type.startsWith("video") ? "video" : "image",
          duration: 4.0,
          sourceStart: 0,
          sourceEnd: 4.0,
          speed: 1.0,
          volume: 100,
          muted: false,
          rotation: 0,
        },
      ]);
      toast.success("Media clip imported to timeline!");
      playSound("pop");
    }
  }

  // Voiceover record toggle
  async function handleToggleVoiceover() {
    if (!isRecordingVo) {
      const started = await voRecorder.start();
      if (started) {
        setIsRecordingVo(true);
        toast.info("Recording voiceover... Speak now!");
      } else {
        // Fallback simulation
        setIsRecordingVo(true);
        toast.info("Simulating Voiceover recording...");
      }
    } else {
      setIsRecordingVo(false);
      const url = await voRecorder.stop();
      addAudioTrack({
        title: "Voiceover Recording",
        artist: "You",
        type: "voiceover",
        sourceUrl: url || "sfx:pop",
        duration: 3.5,
        volume: 100,
      });
      toast.success("Voiceover added to audio track!");
      playSound("cheer");
    }
  }

  return (
    <div className="flex flex-col rounded-3xl border border-white/10 bg-surface/90 p-4 shadow-xl backdrop-blur-xl space-y-4">
      {/* Tab Navigation Ribbon */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none">
        {[
          { id: "media", label: "Media", icon: Clapperboard },
          { id: "audio", label: "Audio", icon: Music },
          { id: "text", label: "Text", icon: Type },
          { id: "captions", label: "Subtitles", icon: Radio },
          { id: "speed", label: "Speed & Cut", icon: Gauge },
          { id: "effects", label: "Effects FX", icon: Sparkles },
          { id: "filters", label: "Color & LUT", icon: Sliders },
          { id: "transitions", label: "Transitions", icon: Zap },
          { id: "stickers", label: "Stickers", icon: Smile },
          { id: "meme", label: "Meme Mode", icon: Flame },
          { id: "ai", label: "AI Magic", icon: Wand2 },
          { id: "templates", label: "Templates", icon: Clapperboard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-1.5 shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border",
                isActive
                  ? "bg-accent text-black font-black border-accent shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                  : "bg-raised/60 text-muted border-white/5 hover:text-fg hover:bg-raised",
              )}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT PANELS */}

      {/* 1. MEDIA MANAGER */}
      {activeTab === "media" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-fg">Clips & Source Media</h3>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent text-black px-3 py-1 text-xs font-black hover:scale-105 active:scale-95 transition-all">
              <Upload className="size-3.5 stroke-[2.5]" />
              <span>Upload Video / Photo</span>
              <input
                type="file"
                accept="video/*,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted mb-2">
              Add Stock Scene Clips to Timeline:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STOCK_SCENES.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => {
                    addClips([
                      {
                        name: scene.label,
                        sourceUrl: scene.src,
                        mediaType: "image",
                        duration: 3.5,
                        sourceStart: 0,
                        sourceEnd: 3.5,
                        speed: 1.0,
                        volume: 100,
                        muted: false,
                        rotation: 0,
                        transitionIn: { type: "zoom", duration: 0.4 },
                      },
                    ]);
                    playSound("pop");
                    toast.success(`Added ${scene.label} to video track!`);
                  }}
                  className="group relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-raised p-1 text-left transition-all hover:border-accent hover:scale-[1.02]"
                >
                  <img
                    src={scene.src}
                    alt={scene.label}
                    className="size-full object-cover rounded-lg opacity-75 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-2 flex flex-col justify-end">
                    <span className="text-[10px] font-bold text-white truncate">{scene.label}</span>
                    <span className="text-[8px] text-accent font-mono">+ Add to timeline</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. AUDIO & SFX */}
      {activeTab === "audio" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <h3 className="text-xs font-bold text-fg">Soundtracks & SFX Board</h3>
              <p className="text-[10px] text-muted">Offline synthesized beats and viral sound effects</p>
            </div>

            {/* Voiceover Button */}
            <button
              type="button"
              onClick={handleToggleVoiceover}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border",
                isRecordingVo
                  ? "bg-rose-500 text-white border-rose-400 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]"
                  : "bg-white/5 border-white/15 text-muted hover:text-white hover:bg-white/10",
              )}
            >
              <Mic className="size-3.5" />
              <span>{isRecordingVo ? "Stop Recording" : "Record Voiceover"}</span>
            </button>
          </div>

          {/* Music Tracks */}
          <div>
            <label className="block text-[11px] font-bold text-muted mb-2">Trending Soundtracks:</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRESET_MUSIC_TRACKS.map((trk) => (
                <div
                  key={trk.id}
                  className="flex items-center justify-between rounded-xl bg-raised/50 border border-white/10 p-2.5 hover:border-pink-500/40 transition-all"
                >
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold text-fg truncate">{trk.title}</p>
                    <p className="text-[10px] text-muted">{trk.artist} • {trk.genre}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        addAudioTrack({
                          title: trk.title,
                          artist: trk.artist,
                          type: "music",
                          sourceUrl: `synth:${trk.synthType}`,
                          duration: trk.duration,
                          volume: 85,
                          beats: trk.beats,
                        });
                        playSound("pop");
                        toast.success(`Attached ${trk.title} to audio track!`);
                      }}
                      className="rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-1 text-[10px] font-bold hover:bg-pink-500/40 transition-colors"
                    >
                      + Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SFX Board */}
          <div>
            <label className="block text-[11px] font-bold text-muted mb-2">Viral Sound Effects Board:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_SFX.map((sfx) => (
                <button
                  key={sfx.id}
                  type="button"
                  onClick={() => {
                    playStudioSFX(sfx.id);
                    addAudioTrack({
                      title: sfx.label,
                      artist: "SFX",
                      type: "sfx",
                      sourceUrl: `sfx:${sfx.id}`,
                      timelineStart: currentTime,
                      duration: sfx.duration,
                      volume: 100,
                    });
                    toast.success(`Added ${sfx.label} SFX at playhead!`);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-raised/60 border border-white/10 p-2 text-left hover:border-accent hover:bg-raised transition-all active:scale-95"
                >
                  <span className="text-base">{sfx.icon}</span>
                  <div className="truncate">
                    <p className="text-[11px] font-bold text-fg truncate">{sfx.label}</p>
                    <p className="text-[9px] text-muted font-mono">{sfx.duration}s</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. TEXT & SUBTITLES */}
      {activeTab === "text" && (
        <div className="space-y-4">
          <div className="border-b border-white/10 pb-2">
            <h3 className="text-xs font-bold text-fg">Text Overlays & Fonts</h3>
            <p className="text-[10px] text-muted">Multiple animated text layers on timeline</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-muted mb-1">Text Content</label>
              <Input
                value={newTextStr}
                onChange={(e) => setNewTextStr(e.target.value)}
                placeholder="Enter text..."
                className="bg-raised border-white/15 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">Typography Font</label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value as any)}
                  className="w-full rounded-xl bg-raised border border-white/15 p-2 text-xs font-bold text-fg focus:outline-none"
                >
                  {TEXT_FONTS.map((f) => (
                    <option key={f.id} value={f.id} className="bg-surface">
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">Entrance Animation</label>
                <select
                  value={selectedAnim}
                  onChange={(e) => setSelectedAnim(e.target.value as any)}
                  className="w-full rounded-xl bg-raised border border-white/15 p-2 text-xs font-bold text-fg focus:outline-none"
                >
                  {TEXT_ANIMATIONS.map((a) => (
                    <option key={a.id} value={a.id} className="bg-surface">
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted">Color:</span>
                {["#FFFFFF", "#00F0FF", "#F59E0B", "#10B981", "#EC4899", "#EF4444"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTextColor(c)}
                    style={{ backgroundColor: c }}
                    className={cn(
                      "size-5 rounded-full border border-black/40 transition-transform",
                      textColor === c && "scale-125 ring-2 ring-white",
                    )}
                  />
                ))}
              </div>

              <Button
                type="button"
                onClick={() => {
                  addTextLayer({
                    text: newTextStr,
                    fontFamily: selectedFont,
                    animation: selectedAnim,
                    color: textColor,
                    style: selectedFont === "Impact" ? "meme_impact" : "pill",
                  });
                  playSound("pop");
                  toast.success("Text layer added to timeline!");
                }}
                className="rounded-xl bg-accent text-black font-black text-xs px-4"
              >
                + Add Text Layer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUBTITLES & AUTO CAPTIONS */}
      {activeTab === "captions" && (
        <div className="space-y-4">
          <div className="border-b border-white/10 pb-2">
            <h3 className="text-xs font-bold text-fg">Auto Captions & Subtitles</h3>
            <p className="text-[10px] text-muted">Hinglish, Hindi and English timed subtitle templates</p>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-muted">Generate Auto Subtitles:</label>
            <div className="space-y-2">
              {AI_SUBTITLE_PRESETS.map((sub, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-raised/60 border border-white/10 p-3 hover:border-emerald-500/40 transition-all"
                >
                  <div className="pr-3">
                    <span className="rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 uppercase tracking-wider">
                      {sub.lang}
                    </span>
                    <p className="text-xs font-semibold text-fg mt-1 leading-snug">{sub.text}</p>
                    <p className="text-[9px] text-muted font-mono mt-0.5">{sub.duration}s timed words</p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setCaptions([
                        {
                          id: `cap_${Date.now()}`,
                          text: sub.text,
                          timelineStart: currentTime,
                          timelineEnd: currentTime + sub.duration,
                          words: sub.words.map((w) => ({
                            word: w.word,
                            start: currentTime + w.start,
                            end: currentTime + w.end,
                          })),
                        },
                      ]);
                      playSound("cheer");
                      toast.success("Hinglish karaoke captions applied!");
                    }}
                    className="shrink-0 rounded-xl bg-emerald-500 text-black font-bold text-xs"
                  >
                    Apply Subtitle
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4.5. SPEED & RETIMING TOOLS */}
      {activeTab === "speed" && (
        <div className="space-y-4">
          <div className="border-b border-white/10 pb-2 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-fg flex items-center gap-1.5">
                <Gauge className="size-3.5 text-accent" />
                <span>Clip Speed Ramping & Retiming</span>
              </h3>
              <p className="text-[10px] text-muted">Adjust playback speed, split clips & rotate video</p>
            </div>
            {selectedClipId && (
              <span className="rounded-full bg-accent/20 text-accent border border-accent/40 text-[10px] font-mono px-2 py-0.5">
                Selected Clip Active
              </span>
            )}
          </div>

          {/* Speed Presets */}
          <div>
            <label className="block text-[11px] font-bold text-muted mb-2">
              Playback Speed Ramping (Slow-Mo to Hyperlapse):
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { speed: 0.25, label: "0.25x", desc: "Super Slow" },
                { speed: 0.5, label: "0.5x", desc: "Slow Motion" },
                { speed: 1.0, label: "1.0x", desc: "Normal Speed" },
                { speed: 1.5, label: "1.5x", desc: "Fast Pace" },
                { speed: 2.0, label: "2.0x", desc: "Double Speed" },
                { speed: 4.0, label: "4.0x", desc: "Hyperlapse" },
              ].map((sp) => (
                <button
                  key={sp.speed}
                  type="button"
                  onClick={() => {
                    const targetId = selectedClipId || project.clips[0]?.id;
                    if (targetId) {
                      setClipSpeed(targetId, sp.speed);
                      playSound("pop");
                      toast.success(`Set clip speed to ${sp.label} (${sp.desc})`);
                    } else {
                      toast.warning("Select or add a video clip first.");
                    }
                  }}
                  className="flex flex-col items-center justify-center rounded-xl bg-raised border border-white/10 p-2.5 hover:border-accent hover:bg-accent/10 transition-all text-center"
                >
                  <span className="text-xs font-black text-fg">{sp.label}</span>
                  <span className="text-[9px] text-muted">{sp.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Precision Clip Tools */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <label className="block text-[11px] font-bold text-muted mb-1">
              Precision Clip Tools:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  splitClipAtPlayhead();
                  playSound("pop");
                  toast.success("Split clip at playhead position!");
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-raised border border-white/10 px-3 py-2.5 text-xs font-bold text-fg hover:border-accent hover:bg-accent/10 transition-all"
              >
                <Scissors className="size-4 text-accent" />
                <span>Split Clip</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetId = selectedClipId || project.clips[0]?.id;
                  if (targetId) {
                    duplicateClip(targetId);
                    playSound("pop");
                    toast.success("Duplicated clip!");
                  } else {
                    toast.warning("No clip selected.");
                  }
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-raised border border-white/10 px-3 py-2.5 text-xs font-bold text-fg hover:border-accent hover:bg-accent/10 transition-all"
              >
                <Copy className="size-4 text-accent" />
                <span>Duplicate Clip</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetId = selectedClipId || project.clips[0]?.id;
                  const currentClip = project.clips.find((c) => c.id === targetId);
                  if (targetId && currentClip) {
                    const nextRotation = ((currentClip.rotation || 0) + 90) % 360;
                    setClipRotation(targetId, nextRotation);
                    playSound("pop");
                    toast.success(`Rotated clip to ${nextRotation}°`);
                  } else {
                    toast.warning("No clip selected.");
                  }
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-raised border border-white/10 px-3 py-2.5 text-xs font-bold text-fg hover:border-accent hover:bg-accent/10 transition-all"
              >
                <RotateCw className="size-4 text-accent" />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetId = selectedClipId || project.clips[0]?.id;
                  if (targetId) {
                    removeClip(targetId);
                    playSound("pop");
                    toast.info("Removed clip.");
                  } else {
                    toast.warning("No clip selected.");
                  }
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all"
              >
                <Trash2 className="size-4" />
                <span>Delete Clip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. EFFECTS FX */}
      {activeTab === "effects" && (
        <div className="space-y-4">
          <div className="border-b border-white/10 pb-2">
            <h3 className="text-xs font-bold text-fg">Visual Effects (FX)</h3>
            <p className="text-[10px] text-muted">WebGL/Canvas realtime shaders on timeline</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "glitch", label: "Glitch Stutter", icon: "👾" },
              { id: "vhs", label: "Retro VHS Tape", icon: "📼" },
              { id: "rgb_split", label: "RGB Chromatic", icon: "🌈" },
              { id: "shake", label: "Camera Shake", icon: "📳" },
              { id: "flash", label: "White Strobe", icon: "⚡" },
              { id: "blur", label: "Motion Blur", icon: "💨" },
              { id: "pixelate", label: "8-Bit Pixelate", icon: "🕹️" },
            ].map((fx) => (
              <button
                key={fx.id}
                type="button"
                onClick={() => {
                  addEffect({
                    effect: fx.id as any,
                    timelineStart: currentTime,
                    timelineEnd: currentTime + 2.0,
                    intensity: 75,
                  });
                  playSound("pop");
                  toast.success(`Applied ${fx.label} effect!`);
                }}
                className="flex items-center gap-2 rounded-xl bg-raised border border-white/10 p-2.5 text-left hover:border-amber-400 hover:scale-[1.02] transition-all"
              >
                <span className="text-xl">{fx.icon}</span>
                <span className="text-xs font-bold text-fg">{fx.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6. COLOR & FILTERS */}
      {activeTab === "filters" && (
        <div className="space-y-4">
          <div className="border-b border-white/10 pb-2">
            <h3 className="text-xs font-bold text-fg">Color Grading & LUT Filters</h3>
            <p className="text-[10px] text-muted">Cinematic color presets and manual adjustments</p>
          </div>

          {/* Presets */}
          <div>
            <label className="block text-[11px] font-bold text-muted mb-2">Color LUT Presets:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FILTER_PRESETS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFilterPreset(f.id);
                    playSound("pop");
                  }}
                  className={cn(
                    "rounded-xl p-2 text-left border transition-all",
                    project.adjustments.filterPreset === f.id
                      ? "bg-accent/15 border-accent text-accent font-bold"
                      : "bg-raised border-white/10 text-muted hover:border-white/20",
                  )}
                >
                  <p className="text-xs font-bold text-fg">{f.label}</p>
                  <p className="text-[9px] text-muted truncate">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Pro Sliders */}
          <div className="space-y-3 pt-2">
            <label className="block text-[11px] font-bold text-muted">Pro Color Sliders:</label>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="flex justify-between text-[10px] text-muted mb-1">
                  <span>Brightness</span>
                  <span className="font-mono">{project.adjustments.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={project.adjustments.brightness}
                  onChange={(e) => setAdjustments({ brightness: parseInt(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-muted mb-1">
                  <span>Contrast</span>
                  <span className="font-mono">{project.adjustments.contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={project.adjustments.contrast}
                  onChange={(e) => setAdjustments({ contrast: parseInt(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-muted mb-1">
                  <span>Saturation</span>
                  <span className="font-mono">{project.adjustments.saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={project.adjustments.saturation}
                  onChange={(e) => setAdjustments({ saturation: parseInt(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-muted mb-1">
                  <span>Warmth / Temp</span>
                  <span className="font-mono">{project.adjustments.temperature}°</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={project.adjustments.temperature}
                  onChange={(e) => setAdjustments({ temperature: parseInt(e.target.value) })}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-muted mb-1">
                  <span>Vignette Edge</span>
                  <span className="font-mono">{project.adjustments.vignette}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={project.adjustments.vignette}
                  onChange={(e) => setAdjustments({ vignette: parseInt(e.target.value) })}
                  className="w-full accent-purple-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. TRANSITIONS */}
      {activeTab === "transitions" && (
        <div className="space-y-4">
          <div className="border-b border-white/10 pb-2">
            <h3 className="text-xs font-bold text-fg">Transitions Between Clips</h3>
            <p className="text-[10px] text-muted">Apply seamless video transitions</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TRANSITION_LIST.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => {
                  if (selectedClipId) {
                    setClipTransition(selectedClipId, { type: t.type, duration: 0.4 });
                    playSound("pop");
                    toast.success(`Transition ${t.label} applied to clip!`);
                  } else {
                    toast.error("Please click a clip on the timeline first.");
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-raised border border-white/10 p-3 text-left hover:border-accent hover:scale-[1.02] transition-all"
              >
                <span className="text-xl">{t.icon}</span>
                <span className="text-xs font-bold text-fg">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 8. STICKERS */}
      {activeTab === "stickers" && (
        <div className="space-y-4">
          <div className="border-b border-white/10 pb-2">
            <h3 className="text-xs font-bold text-fg">Reaction Stickers & Emojis</h3>
            <p className="text-[10px] text-muted">Add animated bounce stickers to the canvas</p>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {EMOJI_STICKERS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => {
                  addSticker({ emojiOrUrl: em, scale: 1.4 });
                  playSound("pop");
                  toast.success(`Sticker ${em} added!`);
                }}
                className="flex size-11 items-center justify-center rounded-xl bg-raised hover:bg-white/10 text-2xl transition-transform hover:scale-125"
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 9. MEME MODE */}
      {activeTab === "meme" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <h3 className="text-xs font-bold text-fg flex items-center gap-1.5">
                <Flame className="size-3.5 text-amber-400 fill-amber-400" />
                <span>Classic Meme Mode</span>
              </h3>
              <p className="text-[10px] text-muted">Impact font headline & punchline bars</p>
            </div>

            <button
              type="button"
              onClick={() => toggleMemeMode()}
              className={cn(
                "rounded-xl px-3 py-1 text-xs font-bold transition-all border",
                project.memeMode
                  ? "bg-amber-400 text-black border-amber-300 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                  : "bg-raised border-white/10 text-muted hover:text-fg",
              )}
            >
              {project.memeMode ? "Meme Mode: ON" : "Turn ON"}
            </button>
          </div>

          {project.memeMode && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">Top Headline</label>
                <Input
                  value={project.memeTopText}
                  onChange={(e) => setMemeText(e.target.value, project.memeBottomText)}
                  placeholder="e.g. ME AT 7:00 AM..."
                  className="bg-raised border-white/15 text-xs rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">Bottom Punchline</label>
                <Input
                  value={project.memeBottomText}
                  onChange={(e) => setMemeText(project.memeTopText, e.target.value)}
                  placeholder="e.g. WHY DID I AGREE TO THIS 💀"
                  className="bg-raised border-white/15 text-xs rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted mb-1.5">
                  AI Viral Punchline Ideas:
                </label>
                <div className="space-y-1.5">
                  {AI_MEME_PUNCHLINES.slice(0, 3).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setMemeText(item.top, item.bottom);
                        playSound("pop");
                        toast.success("Applied meme punchline!");
                      }}
                      className="w-full text-left rounded-xl bg-raised/60 border border-white/10 p-2 hover:border-amber-400 text-xs text-muted hover:text-fg transition-all"
                    >
                      <p className="font-bold text-amber-300">{item.top}</p>
                      <p className="text-[11px] text-fg">{item.bottom}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 10. AI MAGIC TOOLS */}
      {activeTab === "ai" && (
        <div className="space-y-4">
          <div className="border-b border-white/10 pb-2">
            <h3 className="text-xs font-bold text-fg flex items-center gap-1.5">
              <Wand2 className="size-3.5 text-accent" />
              <span>AI Magic Creator Tools</span>
            </h3>
            <p className="text-[10px] text-muted">Auto-edit, beat sync, and intelligent montages</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* 1-Click AI Auto Edit */}
            <div className="rounded-2xl bg-gradient-to-br from-accent/15 via-purple-500/10 to-transparent border border-accent/30 p-3 space-y-2">
              <span className="text-xl">⚡</span>
              <h4 className="text-xs font-black text-fg">1-Click AI Auto-Edit</h4>
              <p className="text-[10px] text-muted leading-relaxed">
                Analyzes your clips, removes dead space, snaps cuts to the beat, adds transitions & viral subtitles!
              </p>
              <Button
                type="button"
                onClick={() => {
                  const sources = project.clips.map((c) => ({ url: c.sourceUrl, label: c.name }));
                  const autoProject = generateAiAutoEdit(sources);
                  useStudio.setState((s) => ({
                    project: {
                      ...s.project,
                      ...autoProject,
                      updatedAt: Date.now(),
                    },
                    currentTime: 0,
                  }));
                  playSound("cheer");
                  toast.success("AI Smart Montage Generated!");
                }}
                className="w-full rounded-xl bg-accent text-black font-black text-xs"
              >
                Generate AI Montage
              </Button>
            </div>

            {/* AI Beat Sync */}
            <div className="rounded-2xl bg-raised border border-white/10 p-3 space-y-2">
              <span className="text-xl">🎵</span>
              <h4 className="text-xs font-black text-fg">AI Beat Sync</h4>
              <p className="text-[10px] text-muted leading-relaxed">
                Automatically trims clip cut points to match the bass kick drops of your soundtrack.
              </p>
              <Button
                type="button"
                variant="subtle"
                onClick={() => {
                  const musicTrack = project.audioTracks.find((a) => a.type === "music");
                  if (musicTrack?.beats) {
                    const synced = alignClipsToBeatSync(project.clips, musicTrack.beats);
                    useStudio.setState((s) => ({
                      project: { ...s.project, clips: synced },
                    }));
                    playSound("pop");
                    toast.success("Clips synced to audio beats!");
                  } else {
                    toast.info("Music track already beat-synced.");
                  }
                }}
                className="w-full rounded-xl border border-white/15 text-xs font-bold"
              >
                Snap Clips to Beats
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 11. TEMPLATES */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="border-b border-white/10 pb-2">
            <h3 className="text-xs font-bold text-fg">Viral Creator Templates</h3>
            <p className="text-[10px] text-muted">Use pre-configured reels with structure & timing</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {STUDIO_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                className="flex items-center justify-between rounded-xl bg-raised border border-white/10 p-3 hover:border-accent transition-all"
              >
                <div className="flex items-center gap-2.5 truncate pr-2">
                  <span className="text-2xl">{tmpl.icon}</span>
                  <div className="truncate">
                    <p className="text-xs font-bold text-fg truncate">{tmpl.name}</p>
                    <p className="text-[10px] text-muted truncate">{tmpl.description}</p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    applyTemplate(tmpl.id);
                    playSound("cheer");
                    toast.success(`Applied ${tmpl.name} template!`);
                  }}
                  className="shrink-0 rounded-xl bg-accent text-black font-black text-xs"
                >
                  Use Template
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
