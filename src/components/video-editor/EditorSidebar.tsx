import { useRef, useState } from "react";
import {
  Clapperboard,
  Film,
  Flame,
  FolderOpen,
  Image as ImageIcon,
  Mic,
  Music,
  Plus,
  Radio,
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
import type { EffectType, TransitionType } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";
import { toast } from "sonner";

interface EditorSidebarProps {
  className?: string;
  onCloseMobile?: () => void;
}

type TabId =
  | "media"
  | "audio"
  | "text"
  | "stickers"
  | "effects"
  | "transitions"
  | "templates";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "media", label: "Media", icon: Film },
  { id: "audio", label: "Audio", icon: Music },
  { id: "text", label: "Text", icon: Type },
  { id: "stickers", label: "Stickers", icon: Smile },
  { id: "effects", label: "Effects", icon: Sparkles },
  { id: "transitions", label: "Transitions", icon: Zap },
  { id: "templates", label: "Templates", icon: Clapperboard },
];

const EMOJI_STICKERS = [
  "🔥", "😂", "💀", "❤️", "🧢", "🤡", "👀", "🏏", "🍕", "✨", "🚀", "🤫",
  "🤯", "💯", "🎉", "💰", "👑", "⚡", "🇮🇳", "🎮", "🍿", "😭", "👏", "🗿",
];

const EFFECT_LIST: { id: EffectType; label: string; desc: string; icon: string }[] = [
  { id: "glitch", label: "Digital Glitch", desc: "Cyber artifact glitches", icon: "👾" },
  { id: "vhs", label: "Retro VHS", desc: "Scanlines & 90s tape badge", icon: "📼" },
  { id: "rgb_split", label: "RGB Split", desc: "Chromic aberration split", icon: "🌈" },
  { id: "flash", label: "Strobe Flash", desc: "Intense white strobe", icon: "⚡" },
  { id: "shake", label: "Camera Shake", desc: "Bass boost impact rumble", icon: "📳" },
  { id: "pixelate", label: "8-Bit Pixels", desc: "Pixel block mosaic", icon: "🧱" },
  { id: "blur", label: "Dream Blur", desc: "Soft atmospheric glow", icon: "🌫️" },
  { id: "vintage_grain", label: "Film Grain", desc: "Cinematic 35mm grain", icon: "🎞️" },
];

export function EditorSidebar({ className, onCloseMobile }: EditorSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>("media");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const project = useStudio((s) => s.project);
  const addClips = useStudio((s) => s.addClips);
  const addAudioTrack = useStudio((s) => s.addAudioTrack);
  const removeAudioTrack = useStudio((s) => s.removeAudioTrack);
  const selectAudio = useStudio((s) => s.selectAudio);
  const selectedAudioId = useStudio((s) => s.selectedAudioId);
  const addTextLayer = useStudio((s) => s.addTextLayer);
  const addSticker = useStudio((s) => s.addSticker);
  const addEffect = useStudio((s) => s.addEffect);
  const applyTemplate = useStudio((s) => s.applyTemplate);
  const selectedClipId = useStudio((s) => s.selectedClipId);
  const setClipTransition = useStudio((s) => s.setClipTransition);

  // Hidden audio file input ref
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // Voiceover recorder state
  const [isRecordingVo, setIsRecordingVo] = useState(false);
  const [voRecorder] = useState(() => new VoiceoverRecorder());

  // Handle uploading custom audio / songs from user device
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, "");

      const tempAudio = new Audio();
      tempAudio.src = url;

      let resolved = false;
      const finishAdd = (duration: number) => {
        addAudioTrack({
          title: cleanName,
          artist: "My Music",
          type: "music",
          sourceUrl: url,
          duration: Math.max(1, duration),
          volume: 85,
          muted: false,
          fadeIn: true,
          fadeOut: true,
        });
        playSound("pop");
        toast.success(`Added "${cleanName}" (${duration.toFixed(1)}s) to audio track!`);
      };

      const onLoaded = () => {
        if (resolved) return;
        resolved = true;
        const dur =
          Number.isFinite(tempAudio.duration) && tempAudio.duration > 0
            ? tempAudio.duration
            : project.duration || 15;
        finishAdd(dur);
        tempAudio.removeEventListener("loadedmetadata", onLoaded);
      };

      tempAudio.addEventListener("loadedmetadata", onLoaded);
      tempAudio.addEventListener("canplaythrough", onLoaded);

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          finishAdd(project.duration || 15);
        }
      }, 1000);
    }

    e.target.value = "";
  };

  // Handle local user media file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newClipsToAdd: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, "");

      // If user uploaded an audio file in the general media picker, add to audio track
      if (file.type.startsWith("audio/") || file.name.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)) {
        const tempAudio = new Audio(url);
        tempAudio.addEventListener("loadedmetadata", () => {
          const dur =
            Number.isFinite(tempAudio.duration) && tempAudio.duration > 0
              ? tempAudio.duration
              : project.duration || 15;
          addAudioTrack({
            title: cleanName,
            artist: "My Music",
            type: "music",
            sourceUrl: url,
            duration: Math.max(1, dur),
            volume: 85,
            muted: false,
            fadeIn: true,
            fadeOut: true,
          });
          playSound("pop");
          toast.success(`Added audio track "${cleanName}"!`);
        });
        continue;
      }

      const isVideo = file.type.startsWith("video/");
      newClipsToAdd.push({
        name: cleanName,
        sourceUrl: url,
        mediaType: isVideo ? "video" : "image",
        duration: isVideo ? 4.0 : 3.0,
        sourceStart: 0,
        sourceEnd: isVideo ? 4.0 : 3.0,
        speed: 1.0,
        volume: 100,
        muted: false,
        rotation: 0,
      });
    }

    if (newClipsToAdd.length > 0) {
      addClips(newClipsToAdd);
      playSound("pop");
      toast.success(`Imported ${newClipsToAdd.length} media file(s)!`);
    }

    // Reset input
    e.target.value = "";
  };

  return (
    <div
      className={cn(
        "flex h-full bg-[#0c0e15] border-r border-white/10 select-none text-white",
        className,
      )}
    >
      {/* 1. Left Icon Rail */}
      <div className="w-16 border-r border-white/10 bg-[#090b10] flex flex-col items-center py-3 gap-2 shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center size-12 rounded-xl text-[10px] font-medium gap-1 transition-all",
                isActive
                  ? "bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5",
              )}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Expanded Drawer Panel */}
      <div className="w-72 md:w-80 flex flex-col p-4 overflow-y-auto scrollbar-thin">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/90">
            {TABS.find((t) => t.id === activeTab)?.label}
          </h3>
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

        {/* ----------------- TAB: MEDIA ----------------- */}
        {activeTab === "media" && (
          <div className="flex flex-col gap-4">
            {/* Upload Area */}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-white/20 hover:border-cyan-400/60 bg-white/5 hover:bg-white/10 transition-all text-center group cursor-pointer"
            >
              <div className="size-10 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Import Videos or Photos</p>
                <p className="text-[10px] text-white/40 mt-0.5">MP4, WebM, MOV, JPG, PNG</p>
              </div>
            </button>

            {/* Stock Scenes Library */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                Sample Media Clips
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STOCK_SCENES.map((scene) => (
                  <div
                    key={scene.id}
                    onClick={() => {
                      addClips([
                        {
                          name: scene.label,
                          sourceUrl: scene.src,
                          mediaType: "image",
                          duration: 4.0,
                          sourceStart: 0,
                          sourceEnd: 4.0,
                          speed: 1.0,
                          volume: 100,
                          muted: false,
                          rotation: 0,
                        },
                      ]);
                      playSound("pop");
                      toast.success(`Added ${scene.label} to timeline!`);
                    }}
                    className="group relative rounded-xl overflow-hidden border border-white/10 bg-black aspect-video cursor-pointer hover:border-cyan-400/80 transition-all shadow-sm"
                  >
                    <img
                      src={scene.src}
                      alt={scene.label}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-white truncate">{scene.label}</p>
                        <p className="text-[9px] text-cyan-400 font-mono">4.0s</p>
                      </div>
                      <div className="size-5 rounded-full bg-cyan-500/80 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="size-3 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: AUDIO ----------------- */}
        {activeTab === "audio" && (
          <div className="flex flex-col gap-4">
            {/* 1. Upload Custom Music / Song from Device */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-950/40 to-cyan-950/40 border border-pink-500/40 flex flex-col gap-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-200 flex items-center gap-1.5">
                  <Music className="size-4 text-pink-400" />
                  <span>Custom Music & Songs</span>
                </span>
                <span className="text-[10px] text-pink-300/80 font-mono">MP3 • WAV • M4A</span>
              </div>

              <p className="text-[11px] text-white/60 leading-relaxed">
                Apna khud ka song ya background music file phone ya computer se upload karke timeline par add karein.
              </p>

              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-pink-500 hover:bg-pink-400 text-black text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Upload className="size-4" />
                <span>Upload Audio / Song File</span>
              </button>

              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                multiple
                className="hidden"
                onChange={handleAudioUpload}
              />
            </div>

            {/* Active Audio Tracks in Project */}
            {project.audioTracks.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                    <Music className="size-3.5 text-pink-400" />
                    <span>Active Audio ({project.audioTracks.length})</span>
                  </span>
                  <span className="text-[10px] text-white/40">Click to select/delete</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {project.audioTracks.map((trk, idx) => {
                    const isSelected = trk.id === selectedAudioId;
                    return (
                      <div
                        key={trk.id}
                        onClick={() => selectAudio(trk.id)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer group",
                          isSelected
                            ? "bg-pink-950/60 border-pink-500/60 ring-1 ring-pink-500/40 text-pink-200"
                            : "bg-black/40 border-white/10 hover:border-pink-500/40 text-white/80",
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold truncate">
                            <span className="text-pink-400 mr-1 font-mono text-[10px]">A{idx + 1}</span>
                            {trk.title}
                          </p>
                          <p className="text-[10px] text-white/40 truncate font-mono mt-0.5">
                            {trk.duration.toFixed(1)}s • Vol: {trk.volume}%
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAudioTrack(trk.id);
                            playSound("boom");
                            toast.success(`Removed "${trk.title}"`);
                          }}
                          className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 hover:border-red-500/50 text-[10px] font-bold transition-colors shrink-0 flex items-center gap-1 shadow-sm"
                          title={`Delete "${trk.title}"`}
                        >
                          <Trash2 className="size-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Voiceover Recording */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/40 to-pink-950/40 border border-purple-500/30 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                  <Mic className="size-4 text-pink-400" />
                  <span>Voiceover Record</span>
                </span>
                {isRecordingVo && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400 animate-pulse font-mono">
                    <span className="size-2 rounded-full bg-red-500" />
                    REC
                  </span>
                )}
              </div>

              {!isRecordingVo ? (
                <button
                  type="button"
                  onClick={async () => {
                    const started = await voRecorder.start();
                    if (started) {
                      setIsRecordingVo(true);
                      toast.info("Recording voiceover... Click again to stop!");
                    } else {
                      toast.error("Microphone permission needed.");
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-black text-xs font-bold transition-colors shadow-md"
                >
                  <Radio className="size-3.5" />
                  <span>Start Recording Mic</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const voUrl = await voRecorder.stop();
                    setIsRecordingVo(false);
                    if (voUrl) {
                      addAudioTrack({
                        title: "Voiceover Recording",
                        artist: "You",
                        type: "voiceover",
                        sourceUrl: voUrl,
                        duration: 5.0,
                        volume: 100,
                        muted: false,
                        fadeIn: false,
                        fadeOut: false,
                      });
                      playSound("pop");
                      toast.success("Voiceover added to audio track!");
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors animate-pulse"
                >
                  <span className="size-2 bg-white rounded-sm" />
                  <span>Stop & Save Voiceover</span>
                </button>
              )}
            </div>

            {/* Background Music Tracks */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                Music Tracks
              </label>
              <div className="flex flex-col gap-1.5">
                {PRESET_MUSIC_TRACKS.map((trk) => (
                  <div
                    key={trk.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-white truncate">{trk.title}</p>
                      <p className="text-[10px] text-white/40 truncate">
                        {trk.artist} • {trk.duration}s
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        addAudioTrack({
                          title: trk.title,
                          artist: trk.artist,
                          type: "music",
                          sourceUrl: trk.id,
                          duration: trk.duration,
                          volume: 85,
                          muted: false,
                          fadeIn: true,
                          fadeOut: true,
                        });
                        playSound("pop");
                        toast.success(`Added ${trk.title} to audio track!`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-bold hover:bg-pink-500/30 transition-colors shrink-0"
                    >
                      Use Track
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sound Effects SFX */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                Sound Effects (SFX)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
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
                        sourceUrl: "",
                        duration: sfx.duration,
                        volume: 100,
                        muted: false,
                        fadeIn: false,
                        fadeOut: false,
                      });
                      toast.success(`Added ${sfx.label} sound effect!`);
                    }}
                    className="flex items-center gap-1.5 p-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400 text-xs text-left text-white/80 hover:text-white transition-colors"
                  >
                    <Volume2 className="size-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{sfx.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: TEXT ----------------- */}
        {activeTab === "text" && (
          <div className="flex flex-col gap-4">
            {/* Quick Add Custom Text */}
            <button
              type="button"
              onClick={() => {
                addTextLayer({
                  text: "DOUBLE TAP TO EDIT",
                  fontFamily: "Impact",
                  fontSize: 36,
                  color: "#FFFFFF",
                  strokeColor: "#000000",
                  strokeWidth: 4,
                  animation: "pop",
                });
                playSound("pop");
                toast.success("Added text layer to timeline!");
              }}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
            >
              <Plus className="size-4" />
              <span>Add Text Layer</span>
            </button>

            {/* Preset Text Styles */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                Trending Text Styles
              </label>

              {/* Meme Impact */}
              <button
                type="button"
                onClick={() => {
                  addTextLayer({
                    text: "POV: MONDAY MORNING",
                    fontFamily: "Impact",
                    fontSize: 42,
                    color: "#FFFFFF",
                    strokeColor: "#000000",
                    strokeWidth: 5,
                    style: "meme_impact",
                    animation: "pop",
                  });
                  playSound("pop");
                }}
                className="p-3 rounded-xl bg-black border border-white/15 text-center font-black tracking-wider text-base text-white hover:border-cyan-400 transition-colors uppercase"
              >
                MEME IMPACT
              </button>

              {/* Neon Glow */}
              <button
                type="button"
                onClick={() => {
                  addTextLayer({
                    text: "CYBER GLOW ✨",
                    fontFamily: "Display",
                    fontSize: 34,
                    color: "#00D2D3",
                    shadowColor: "#00D2D3",
                    shadowBlur: 14,
                    animation: "bounce",
                  });
                  playSound("pop");
                }}
                className="p-3 rounded-xl bg-[#09151f] border border-cyan-500/40 text-center font-bold text-sm text-cyan-300 hover:border-cyan-400 transition-colors"
              >
                CYBER NEON GLOW ✨
              </button>

              {/* Subtitle Pill */}
              <button
                type="button"
                onClick={() => {
                  addTextLayer({
                    text: "Clean Subtitle Caption",
                    fontFamily: "Sans",
                    fontSize: 24,
                    color: "#FFFFFF",
                    bgColor: "rgba(0,0,0,0.85)",
                    style: "pill",
                    animation: "typewriter",
                  });
                  playSound("pop");
                }}
                className="p-3 rounded-xl bg-white/5 border border-white/15 text-center text-xs font-semibold text-white hover:border-cyan-400 transition-colors"
              >
                Subtitles Pill Box
              </button>
            </div>
          </div>
        )}

        {/* ----------------- TAB: STICKERS ----------------- */}
        {activeTab === "stickers" && (
          <div className="flex flex-col gap-3">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Emoji & Reaction Stickers
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EMOJI_STICKERS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    addSticker({
                      emojiOrUrl: emoji,
                      type: "emoji",
                      scale: 1.5,
                      animation: "bounce",
                    });
                    playSound("pop");
                    toast.success(`Added ${emoji} sticker!`);
                  }}
                  className="flex items-center justify-center p-3 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/80 hover:bg-white/10 text-2xl active:scale-95 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ----------------- TAB: EFFECTS ----------------- */}
        {activeTab === "effects" && (
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Visual FX
            </label>
            <div className="flex flex-col gap-1.5">
              {EFFECT_LIST.map((fx) => (
                <button
                  key={fx.id}
                  type="button"
                  onClick={() => {
                    addEffect({
                      effect: fx.id,
                      intensity: 65,
                    });
                    playSound("pop");
                    toast.success(`Applied ${fx.label}! Drag its handles on the timeline FX track to adjust duration.`);
                  }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/80 text-left transition-colors"
                >
                  <span className="text-xl">{fx.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white">{fx.label}</p>
                    <p className="text-[10px] text-white/40 truncate">{fx.desc}</p>
                  </div>
                  <Plus className="size-3.5 text-cyan-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ----------------- TAB: TRANSITIONS ----------------- */}
        {activeTab === "transitions" && (
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Clip Transitions
            </label>
            <p className="text-[10px] text-white/50 mb-1">
              Select a transition below to apply to the active clip.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: "flash" as TransitionType, label: "Flash", icon: "⚡" },
                { type: "zoom" as TransitionType, label: "Zoom In", icon: "🔍" },
                { type: "glitch" as TransitionType, label: "Glitch", icon: "👾" },
                { type: "fade" as TransitionType, label: "Crossfade", icon: "🔀" },
                { type: "spin" as TransitionType, label: "Spin 3D", icon: "🔄" },
                { type: "shake" as TransitionType, label: "Cam Shake", icon: "📳" },
                { type: "slide_left" as TransitionType, label: "Slide Left", icon: "⬅️" },
                { type: "slide_right" as TransitionType, label: "Slide Right", icon: "➡️" },
              ].map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => {
                    const targetId = selectedClipId || project.clips[0]?.id;
                    if (targetId) {
                      setClipTransition(targetId, { type: t.type, duration: 0.4 });
                      playSound("pop");
                      toast.success(`Applied ${t.label} transition!`);
                    }
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400 text-left transition-colors"
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-xs font-semibold text-white/80">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ----------------- TAB: TEMPLATES ----------------- */}
        {activeTab === "templates" && (
          <div className="flex flex-col gap-2.5">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Meme & Video Templates
            </label>
            <div className="flex flex-col gap-2">
              {STUDIO_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="flex flex-col gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{tmpl.name}</p>
                      <p className="text-[10px] text-white/40">{tmpl.category}</p>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                      {tmpl.project.aspectRatio}
                    </span>
                  </div>

                  <p className="text-[11px] text-white/60 italic">"{tmpl.description}"</p>

                  <button
                    type="button"
                    onClick={() => {
                      applyTemplate(tmpl.id);
                      playSound("pop");
                      toast.success(`Loaded "${tmpl.name}" template!`);
                    }}
                    className="w-full py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/25 transition-colors"
                  >
                    Apply Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
