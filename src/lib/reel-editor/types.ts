import type { TimelineClip } from "@/components/reel-editor/Timeline";
import type { AudioTrack } from "@/components/reel-editor/AudioPanel";
import type { TextLayer } from "@/components/reel-editor/TextPanel";
import type { PipLayer } from "@/components/reel-editor/PipPanel";

export type FilterPreset =
  | "Normal"
  | "Vivid"
  | "Dark"
  | "Retro"
  | "Cyberpunk"
  | "Cinema"
  | "Monochrome";

export type TransitionType = "none" | "fade" | "zoom" | "flash" | "slide";

export type AspectRatio = "9:16" | "1:1" | "4:5" | "16:9";

export interface ReelProjectState {
  id: string;
  name: string;
  updatedAt: number;
  clips: TimelineClip[];
  selectedClipId: string | null;
  speed: number;
  muted: boolean;
  filter: FilterPreset;
  aspectRatio: AspectRatio;
  transition: TransitionType;
  textLayers: TextLayer[];
  pipLayers: PipLayer[];
  audioTracks: AudioTrack[];
}

export interface RenderProgress {
  progress: number; // 0 to 100
  stage: string;
  currentTime?: number;
  totalTime?: number;
}

export interface RenderOptions {
  width?: number;
  height?: number;
  fps?: number;
  username: string;
  watermarkPosition?: "bottom-left" | "bottom-right";
  watermarkOpacity?: number;
  onProgress?: (info: RenderProgress) => void;
}

export interface RenderResult {
  blob: Blob;
  url: string;
  duration: number;
  sizeBytes: number;
}
