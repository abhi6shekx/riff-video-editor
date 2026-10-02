export type AspectRatio = "9:16" | "1:1" | "4:5" | "16:9";

export type TransitionType =
  | "none"
  | "fade"
  | "zoom"
  | "blur"
  | "flash"
  | "spin"
  | "glitch"
  | "shake"
  | "slide_left"
  | "slide_right";

export type TextAnimationType =
  | "none"
  | "typewriter"
  | "pop"
  | "bounce"
  | "fade"
  | "slide"
  | "glitch"
  | "karaoke";

export type EffectType =
  | "glitch"
  | "vhs"
  | "rgb_split"
  | "blur"
  | "shake"
  | "flash"
  | "pixelate"
  | "motion_blur"
  | "vintage_grain";

export type FilterPreset =
  | "none"
  | "cinematic"
  | "vintage"
  | "dark"
  | "warm"
  | "cold"
  | "retro"
  | "meme"
  | "viral"
  | "cyber_glow";

export type VideoClip = {
  id: string;
  name: string;
  sourceUrl: string;
  mediaType: "video" | "image";
  duration: number; // Duration of trimmed segment in seconds
  sourceStart: number; // In-point on raw source (seconds)
  sourceEnd: number; // Out-point on raw source (seconds)
  timelineStart: number; // Position on timeline (seconds)
  timelineEnd: number; // End position on timeline (seconds)
  speed: number; // 0.25 to 8.0
  volume: number; // 0 to 200 (100 is normal)
  muted: boolean;
  cropRatio?: AspectRatio;
  rotation: number; // 0, 90, 180, 270
  flipH?: boolean;
  flipV?: boolean;
  scale?: number; // 0.2 to 3.0, default 1
  x?: number; // percentage offset -100 to 100, default 0
  y?: number; // percentage offset -100 to 100, default 0
  opacity?: number; // 0 to 1, default 1
  transitionIn?: {
    type: TransitionType;
    duration: number; // seconds (e.g. 0.5)
  };
};

export type AudioTrackItem = {
  id: string;
  title: string;
  artist: string;
  type: "music" | "sfx" | "voiceover";
  sourceUrl: string;
  timelineStart: number; // seconds
  duration: number; // seconds
  volume: number; // 0 to 100
  muted: boolean;
  fadeIn: boolean;
  fadeOut: boolean;
  beats?: number[]; // beat timestamps for auto-cutting
  isTrending?: boolean;
};

export type TextTrackItem = {
  id: string;
  text: string;
  timelineStart: number;
  timelineEnd: number;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  fontFamily: "Impact" | "Display" | "Sans" | "Monospace" | "Serif";
  fontSize: number; // px at standard scale
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  bgColor?: string;
  bgPadding?: number;
  bgRadius?: number;
  rotation?: number;
  animation: TextAnimationType;
  style: "plain" | "meme_impact" | "neon" | "pill" | "subtitles";
  wordTiming?: { word: string; start: number; end: number }[];
};

export type CaptionItem = {
  id: string;
  text: string;
  timelineStart: number;
  timelineEnd: number;
  highlightedWordIndex?: number;
  words?: { word: string; start: number; end: number }[];
};

export type StickerTrackItem = {
  id: string;
  emojiOrUrl: string;
  type: "emoji" | "gif" | "custom";
  timelineStart: number;
  timelineEnd: number;
  x: number; // 0 - 100
  y: number; // 0 - 100
  scale: number; // 0.5 - 3
  rotation: number;
  animation?: "bounce" | "pulse" | "spin" | "none";
};

export type EffectTrackItem = {
  id: string;
  effect: EffectType;
  timelineStart: number;
  timelineEnd: number;
  intensity: number; // 0 - 100
};

export type ColorAdjustments = {
  brightness: number; // 50 - 150 (default 100)
  contrast: number; // 50 - 150 (default 100)
  saturation: number; // 0 - 200 (default 100)
  exposure: number; // -50 - 50 (default 0)
  temperature: number; // -50 - 50 (warm/cool, default 0)
  vignette: number; // 0 - 100 (default 0)
  blur?: number; // 0 - 20 (default 0)
  sharpen?: number; // 0 - 100 (default 0)
  filterPreset: FilterPreset;
};

export type ExportSettings = {
  resolution: "720p" | "1080p" | "2K" | "4K";
  fps: 24 | 30 | 60;
  quality: "standard" | "high" | "maximum";
  format: "mp4" | "webm";
};

export type EditorProject = {
  id: string;
  title: string;
  aspectRatio: AspectRatio;
  duration: number; // Total project duration in seconds
  clips: VideoClip[];
  audioTracks: AudioTrackItem[];
  textLayers: TextTrackItem[];
  stickers: StickerTrackItem[];
  effects: EffectTrackItem[];
  captions: CaptionItem[];
  adjustments: ColorAdjustments;
  memeMode: boolean;
  memeTopText: string;
  memeBottomText: string;
  remixedFrom?: {
    authorHandle: string;
    authorName: string;
    reelId: string;
  };
  updatedAt: number;
};

export type StudioToolTab =
  | "media"
  | "audio"
  | "text"
  | "captions"
  | "effects"
  | "filters"
  | "transitions"
  | "stickers"
  | "meme"
  | "ai"
  | "templates"
  | "export"
  | "speed";
