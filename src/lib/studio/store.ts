import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  EditorProject,
  VideoClip,
  AudioTrackItem,
  TextTrackItem,
  StickerTrackItem,
  EffectTrackItem,
  CaptionItem,
  AspectRatio,
  FilterPreset,
  TransitionType,
  StudioToolTab,
} from "./types";
import { STUDIO_TEMPLATES } from "./templates";
import { audioPlayerManager, musicSynthesizer, playStudioSFX } from "./audio-engine";

export type StudioState = {
  // Active Project
  project: EditorProject;
  activeTab: StudioToolTab;
  setActiveTab: (tab: StudioToolTab) => void;

  // Playback & Scrubber State
  isPlaying: boolean;
  currentTime: number;
  zoomLevel: number; // 1 to 5 (timeline zoom)
  isMuted: boolean;

  // Selection
  selectedClipId: string | null;
  selectedTextId: string | null;
  selectedAudioId: string | null;
  selectedStickerId: string | null;
  selectedEffectId: string | null;

  // History for Undo / Redo
  undoStack: EditorProject[];
  redoStack: EditorProject[];

  // Actions: Playback
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setZoomLevel: (zoom: number) => void;
  toggleMute: () => void;

  // Actions: Selection
  selectClip: (id: string | null) => void;
  selectText: (id: string | null) => void;
  selectAudio: (id: string | null) => void;
  selectSticker: (id: string | null) => void;
  selectEffect: (id: string | null) => void;
  clearSelection: () => void;

  // Actions: Clips & Video Editing (Trim, Split, Reorder, Delete, Speed, Flip, Transform)
  addClips: (clips: Omit<VideoClip, "id" | "timelineStart" | "timelineEnd">[]) => void;
  removeClip: (id: string) => void;
  reorderClips: (fromIndex: number, toIndex: number) => void;
  moveClip: (id: string, direction: "left" | "right") => void;
  updateClip: (id: string, updates: Partial<VideoClip>) => void;
  trimClip: (id: string, newStart: number, newEnd: number) => void;
  splitClipAtPlayhead: () => void;
  duplicateClip: (id: string) => void;
  setClipSpeed: (id: string, speed: number) => void;
  setClipVolume: (id: string, volume: number) => void;
  setClipRotation: (id: string, rotation: number) => void;
  flipClipHorizontal: (id: string) => void;
  flipClipVertical: (id: string) => void;
  setClipTransform: (id: string, updates: { scale?: number; x?: number; y?: number; opacity?: number; rotation?: number }) => void;
  setClipTransition: (clipId: string, transition: { type: TransitionType; duration: number }) => void;

  // Actions: Text & Captions
  addTextLayer: (layer: Partial<TextTrackItem>) => void;
  updateTextLayer: (id: string, updates: Partial<TextTrackItem>) => void;
  removeTextLayer: (id: string) => void;
  setCaptions: (captions: CaptionItem[]) => void;

  // Actions: Audio & SFX
  addAudioTrack: (track: Partial<AudioTrackItem>) => void;
  updateAudioTrack: (id: string, updates: Partial<AudioTrackItem>) => void;
  removeAudioTrack: (id: string) => void;

  // Actions: Stickers & Meme
  addSticker: (sticker: Partial<StickerTrackItem>) => void;
  updateSticker: (id: string, updates: Partial<StickerTrackItem>) => void;
  removeSticker: (id: string) => void;
  toggleMemeMode: (enabled?: boolean) => void;
  setMemeText: (top: string, bottom: string) => void;

  // Actions: Effects & Filters
  addEffect: (effect: Partial<EffectTrackItem>) => void;
  updateEffect: (id: string, updates: Partial<EffectTrackItem>) => void;
  removeEffect: (id: string) => void;
  clearAllEffects: () => void;
  setAdjustments: (updates: Partial<EditorProject["adjustments"]>) => void;
  setFilterPreset: (preset: FilterPreset) => void;

  // Actions: Global Project Settings
  setAspectRatio: (ratio: AspectRatio) => void;
  applyTemplate: (templateId: string) => void;
  applyRemix: (remixData: {
    authorHandle: string;
    authorName: string;
    reelId: string;
    mediaUrl: string;
    caption?: string;
  }) => void;
  resetProject: () => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
};

// Helper: Recalculate timeline starts/ends for clips sequentially
function recalculateClipTimelines(clips: VideoClip[]): { clips: VideoClip[]; totalDuration: number } {
  let currentTime = 0;
  const updated = clips.map((clip) => {
    const effectiveDuration = (clip.sourceEnd - clip.sourceStart) / clip.speed;
    const start = currentTime;
    const end = currentTime + effectiveDuration;
    currentTime = end;
    return {
      ...clip,
      duration: effectiveDuration,
      timelineStart: start,
      timelineEnd: end,
    };
  });
  return { clips: updated, totalDuration: Math.max(1.0, currentTime) };
}

const DEFAULT_PROJECT: EditorProject = {
  ...STUDIO_TEMPLATES[0].project,
  id: "proj_default",
  updatedAt: Date.now(),
};

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      project: DEFAULT_PROJECT,
      activeTab: "media",
      setActiveTab: (tab) => set({ activeTab: tab }),

      isPlaying: false,
      currentTime: 0,
      zoomLevel: 2,
      isMuted: false,

      selectedClipId: DEFAULT_PROJECT.clips[0]?.id ?? null,
      selectedTextId: null,
      selectedAudioId: null,
      selectedStickerId: null,
      selectedEffectId: null,

      undoStack: [],
      redoStack: [],

      // Save state before mutating
      _pushHistory: () => {
        const { project, undoStack } = get();
        set({
          undoStack: [...undoStack.slice(-15), JSON.parse(JSON.stringify(project))],
          redoStack: [],
        });
      },

      play: () => {
        const { isMuted, project, currentTime } = get();
        set({ isPlaying: true });

        // Start music synthesizer if synth track exists
        const musicTrack = project.audioTracks.find((a) => a.type === "music");
        if (musicTrack && !isMuted) {
          const synthType = musicTrack.sourceUrl.replace("synth:", "") as any;
          musicSynthesizer.start(synthType || "phonk", 130, musicTrack.volume / 100);
        }
      },

      pause: () => {
        set({ isPlaying: false });
        musicSynthesizer.stop();
        audioPlayerManager.stopAll();
      },

      togglePlay: () => {
        const { isPlaying } = get();
        if (isPlaying) get().pause();
        else get().play();
      },

      seek: (time: number) => {
        const { project, isPlaying, isMuted } = get();
        const clamped = Math.max(0, Math.min(project.duration, time));
        set({ currentTime: clamped });
        audioPlayerManager.sync(project.audioTracks, clamped, isPlaying, isMuted);
      },

      setZoomLevel: (zoom: number) => set({ zoomLevel: Math.max(1, Math.min(5, zoom)) }),

      toggleMute: () => {
        const next = !get().isMuted;
        set({ isMuted: next });
        if (next) {
          musicSynthesizer.stop();
          audioPlayerManager.stopAll();
        }
      },

      selectClip: (id) =>
        set({
          selectedClipId: id,
          selectedTextId: null,
          selectedAudioId: null,
          selectedStickerId: null,
          selectedEffectId: null,
        }),
      selectText: (id) =>
        set({
          selectedTextId: id,
          selectedClipId: null,
          selectedAudioId: null,
          selectedStickerId: null,
          selectedEffectId: null,
        }),
      selectAudio: (id) =>
        set({
          selectedAudioId: id,
          selectedClipId: null,
          selectedTextId: null,
          selectedStickerId: null,
          selectedEffectId: null,
        }),
      selectSticker: (id) =>
        set({
          selectedStickerId: id,
          selectedClipId: null,
          selectedTextId: null,
          selectedAudioId: null,
          selectedEffectId: null,
        }),
      selectEffect: (id) =>
        set({
          selectedEffectId: id,
          selectedClipId: null,
          selectedTextId: null,
          selectedAudioId: null,
          selectedStickerId: null,
        }),
      clearSelection: () =>
        set({
          selectedClipId: null,
          selectedTextId: null,
          selectedAudioId: null,
          selectedStickerId: null,
          selectedEffectId: null,
        }),

      // Add Clips
      addClips: (newClips) => {
        const { project, undoStack } = get();
        const baseClips = [...project.clips];

        const prepared: VideoClip[] = newClips.map((c, i) => ({
          ...c,
          id: `clip_${Date.now()}_${i}`,
          timelineStart: 0,
          timelineEnd: 0,
        }));

        const combined = [...baseClips, ...prepared];
        const { clips: updatedClips, totalDuration } = recalculateClipTimelines(combined);

        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            clips: updatedClips,
            duration: totalDuration,
            updatedAt: Date.now(),
          },
          selectedClipId: prepared[0]?.id ?? project.clips[0]?.id,
        });
      },

      // Remove Clip
      removeClip: (id) => {
        const { project, undoStack } = get();
        if (project.clips.length <= 1) return; // Keep at least one clip
        const remaining = project.clips.filter((c) => c.id !== id);
        const { clips: updatedClips, totalDuration } = recalculateClipTimelines(remaining);

        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            clips: updatedClips,
            duration: totalDuration,
            updatedAt: Date.now(),
          },
          selectedClipId: updatedClips[0]?.id ?? null,
        });
      },

      // Reorder Clips
      reorderClips: (fromIndex, toIndex) => {
        const { project, undoStack } = get();
        const list = [...project.clips];
        const [moved] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, moved);
        const { clips: updatedClips, totalDuration } = recalculateClipTimelines(list);

        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            clips: updatedClips,
            duration: totalDuration,
            updatedAt: Date.now(),
          },
        });
      },

      // Trim Clip
      trimClip: (id, newStart, newEnd) => {
        const { project, undoStack } = get();
        const list = project.clips.map((c) => {
          if (c.id !== id) return c;
          const s = Math.max(0, newStart);
          const e = Math.max(s + 0.3, newEnd);
          return {
            ...c,
            sourceStart: s,
            sourceEnd: e,
          };
        });
        const { clips: updatedClips, totalDuration } = recalculateClipTimelines(list);

        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            clips: updatedClips,
            duration: totalDuration,
            updatedAt: Date.now(),
          },
        });
      },

      // Split Clip at Playhead
      splitClipAtPlayhead: () => {
        const { project, currentTime, undoStack } = get();
        const targetIndex = project.clips.findIndex(
          (c) => currentTime > c.timelineStart + 0.2 && currentTime < c.timelineEnd - 0.2,
        );
        if (targetIndex === -1) return;

        const target = project.clips[targetIndex];
        const relativeSplitTime = (currentTime - target.timelineStart) * target.speed;
        const splitSourcePoint = target.sourceStart + relativeSplitTime;

        const clipA: VideoClip = {
          ...target,
          id: `clip_${Date.now()}_a`,
          sourceEnd: splitSourcePoint,
        };

        const clipB: VideoClip = {
          ...target,
          id: `clip_${Date.now()}_b`,
          sourceStart: splitSourcePoint,
          transitionIn: { type: "zoom", duration: 0.4 },
        };

        const newClips = [...project.clips];
        newClips.splice(targetIndex, 1, clipA, clipB);
        const { clips: updatedClips, totalDuration } = recalculateClipTimelines(newClips);

        playStudioSFX("whoosh");

        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            clips: updatedClips,
            duration: totalDuration,
            updatedAt: Date.now(),
          },
          selectedClipId: clipB.id,
        });
      },

      // Duplicate Clip
      duplicateClip: (id) => {
        const { project, undoStack } = get();
        const targetIndex = project.clips.findIndex((c) => c.id === id);
        if (targetIndex === -1) return;

        const target = project.clips[targetIndex];
        const duplicated: VideoClip = {
          ...target,
          id: `clip_${Date.now()}_dup`,
          name: `${target.name} (Copy)`,
        };

        const newClips = [...project.clips];
        newClips.splice(targetIndex + 1, 0, duplicated);
        const { clips: updatedClips, totalDuration } = recalculateClipTimelines(newClips);

        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            clips: updatedClips,
            duration: totalDuration,
            updatedAt: Date.now(),
          },
          selectedClipId: duplicated.id,
        });
      },

      // Speed control
      setClipSpeed: (id, speed) => {
        const { project, undoStack } = get();
        const list = project.clips.map((c) => (c.id === id ? { ...c, speed } : c));
        const { clips: updatedClips, totalDuration } = recalculateClipTimelines(list);
        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            clips: updatedClips,
            duration: totalDuration,
            updatedAt: Date.now(),
          },
        });
      },

      // Clip volume
      setClipVolume: (id, volume) => {
        const { project } = get();
        set({
          project: {
            ...project,
            clips: project.clips.map((c) => (c.id === id ? { ...c, volume } : c)),
          },
        });
      },

      // Clip rotation
      setClipRotation: (id, rotation) => {
        const { project } = get();
        set({
          project: {
            ...project,
            clips: project.clips.map((c) => (c.id === id ? { ...c, rotation } : c)),
          },
        });
      },

      // Update clip generic
      updateClip: (id, updates) => {
        const { project, undoStack } = get();
        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            clips: project.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
            updatedAt: Date.now(),
          },
        });
      },

      // Move clip left/right in sequence
      moveClip: (id, direction) => {
        const { project, reorderClips } = get();
        const index = project.clips.findIndex((c) => c.id === id);
        if (index === -1) return;
        const targetIndex = direction === "left" ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < project.clips.length) {
          reorderClips(index, targetIndex);
        }
      },

      // Flip Horizontal
      flipClipHorizontal: (id) => {
        const { project } = get();
        set({
          project: {
            ...project,
            clips: project.clips.map((c) => (c.id === id ? { ...c, flipH: !c.flipH } : c)),
          },
        });
      },

      // Flip Vertical
      flipClipVertical: (id) => {
        const { project } = get();
        set({
          project: {
            ...project,
            clips: project.clips.map((c) => (c.id === id ? { ...c, flipV: !c.flipV } : c)),
          },
        });
      },

      // Set Transform
      setClipTransform: (id, updates) => {
        const { project } = get();
        set({
          project: {
            ...project,
            clips: project.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
          },
        });
      },

      // Clip transition
      setClipTransition: (clipId, transition) => {
        const { project, undoStack } = get();
        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            clips: project.clips.map((c) =>
              c.id === clipId ? { ...c, transitionIn: transition } : c,
            ),
          },
        });
      },

      // Text Layer Actions
      addTextLayer: (layer) => {
        const { project, currentTime, undoStack } = get();
        const newLayer: TextTrackItem = {
          id: `txt_${Date.now()}`,
          text: layer.text || "DOUBLE CLICK TO EDIT",
          timelineStart: currentTime,
          timelineEnd: Math.min(project.duration, currentTime + 3.0),
          x: 50,
          y: 50,
          fontFamily: layer.fontFamily || "Display",
          fontSize: layer.fontSize || 22,
          color: layer.color || "#FFFFFF",
          strokeColor: layer.strokeColor || "#000000",
          strokeWidth: layer.strokeWidth || 4,
          animation: layer.animation || "pop",
          style: layer.style || "pill",
          ...layer,
        };

        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            textLayers: [...project.textLayers, newLayer],
          },
          selectedTextId: newLayer.id,
        });
      },

      updateTextLayer: (id, updates) => {
        const { project } = get();
        set({
          project: {
            ...project,
            textLayers: project.textLayers.map((t) => (t.id === id ? { ...t, ...updates } : t)),
          },
        });
      },

      removeTextLayer: (id) => {
        const { project } = get();
        set({
          project: {
            ...project,
            textLayers: project.textLayers.filter((t) => t.id !== id),
          },
          selectedTextId: null,
        });
      },

      setCaptions: (captions) => {
        const { project, undoStack } = get();
        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            captions,
          },
        });
      },

      // Audio Track Actions
      addAudioTrack: (track) => {
        const { project, undoStack } = get();
        const newTrack: AudioTrackItem = {
          id: `aud_${Date.now()}`,
          title: track.title || "Sound Track",
          artist: track.artist || "Original",
          type: track.type || "music",
          sourceUrl: track.sourceUrl || "synth:phonk",
          timelineStart: track.timelineStart ?? 0,
          duration: track.duration || project.duration,
          volume: track.volume ?? 80,
          muted: false,
          fadeIn: false,
          fadeOut: true,
          ...track,
        };

        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            audioTracks: [...project.audioTracks, newTrack],
          },
          selectedAudioId: newTrack.id,
        });
      },

      updateAudioTrack: (id, updates) => {
        const { project } = get();
        set({
          project: {
            ...project,
            audioTracks: project.audioTracks.map((a) => (a.id === id ? { ...a, ...updates } : a)),
          },
        });
      },

      removeAudioTrack: (id) => {
        const { project } = get();
        set({
          project: {
            ...project,
            audioTracks: project.audioTracks.filter((a) => a.id !== id),
          },
          selectedAudioId: null,
        });
      },

      // Stickers
      addSticker: (stk) => {
        const { project, currentTime, undoStack } = get();
        const newSticker: StickerTrackItem = {
          id: `stk_${Date.now()}`,
          emojiOrUrl: stk.emojiOrUrl || "🔥",
          type: "emoji",
          timelineStart: currentTime,
          timelineEnd: Math.min(project.duration, currentTime + 3.0),
          x: 50,
          y: 50,
          scale: 1.2,
          rotation: 0,
          animation: "bounce",
          ...stk,
        };
        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            stickers: [...project.stickers, newSticker],
          },
          selectedStickerId: newSticker.id,
        });
      },

      updateSticker: (id, updates) => {
        const { project } = get();
        set({
          project: {
            ...project,
            stickers: project.stickers.map((s) => (s.id === id ? { ...s, ...updates } : s)),
          },
        });
      },

      removeSticker: (id) => {
        const { project } = get();
        set({
          project: {
            ...project,
            stickers: project.stickers.filter((s) => s.id !== id),
          },
          selectedStickerId: null,
        });
      },

      // Meme Mode
      toggleMemeMode: (enabled) => {
        const { project } = get();
        const next = enabled !== undefined ? enabled : !project.memeMode;
        set({
          project: {
            ...project,
            memeMode: next,
            memeTopText: next ? project.memeTopText || "WHEN THE CODE RUNS FIRST TRY" : "",
            memeBottomText: next ? project.memeBottomText || "BUT YOU DO NOT KNOW WHY 💀" : "",
          },
        });
      },

      setMemeText: (top, bottom) => {
        const { project } = get();
        set({
          project: {
            ...project,
            memeTopText: top,
            memeBottomText: bottom,
          },
        });
      },

      // Effects
      addEffect: (fx) => {
        const { project, currentTime, undoStack } = get();
        const start = Math.max(0, currentTime);
        const end = Math.min(project.duration, start + 3.0);
        const newEffect: EffectTrackItem = {
          id: `fx_${Date.now()}`,
          effect: fx.effect || "glitch",
          timelineStart: start,
          timelineEnd: end <= start ? start + 3.0 : end,
          intensity: fx.intensity ?? 75,
          ...fx,
        };
        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            effects: [...project.effects, newEffect],
          },
          selectedEffectId: newEffect.id,
        });
      },

      updateEffect: (id, updates) => {
        const { project } = get();
        set({
          project: {
            ...project,
            effects: project.effects.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          },
        });
      },

      removeEffect: (id) => {
        const { project, undoStack } = get();
        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            effects: project.effects.filter((e) => e.id !== id),
          },
          selectedEffectId: null,
        });
      },

      clearAllEffects: () => {
        const { project, undoStack } = get();
        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...project,
            effects: [],
          },
          selectedEffectId: null,
        });
      },

      // Adjustments & Filters
      setAdjustments: (updates) => {
        const { project } = get();
        set({
          project: {
            ...project,
            adjustments: { ...project.adjustments, ...updates },
          },
        });
      },

      setFilterPreset: (preset) => {
        const { project } = get();
        set({
          project: {
            ...project,
            adjustments: { ...project.adjustments, filterPreset: preset },
          },
        });
      },

      // Aspect Ratio
      setAspectRatio: (ratio) => {
        const { project } = get();
        set({
          project: { ...project, aspectRatio: ratio },
        });
      },

      // Apply Template
      applyTemplate: (templateId) => {
        const tmpl = STUDIO_TEMPLATES.find((t) => t.id === templateId);
        if (!tmpl) return;
        const { undoStack, project } = get();
        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            ...tmpl.project,
            id: `proj_${Date.now()}`,
            updatedAt: Date.now(),
          },
          selectedClipId: tmpl.project.clips[0]?.id ?? null,
          currentTime: 0,
        });
      },

      // Apply Remix (Killer feature: import another creator's reel structure, audio, timing)
      applyRemix: ({ authorHandle, authorName, reelId, mediaUrl, caption }) => {
        const { undoStack, project } = get();
        const remixedClip: VideoClip = {
          id: `clip_remix_${Date.now()}`,
          name: `Remix of @${authorHandle}`,
          sourceUrl: mediaUrl,
          mediaType: "image",
          duration: 8.0,
          sourceStart: 0,
          sourceEnd: 8.0,
          timelineStart: 0,
          timelineEnd: 8.0,
          speed: 1.0,
          volume: 100,
          muted: false,
          rotation: 0,
        };

        set({
          undoStack: [...undoStack.slice(-15), project],
          project: {
            id: `proj_remix_${Date.now()}`,
            title: `Remix of @${authorHandle}'s Reel`,
            aspectRatio: "9:16",
            duration: 8.0,
            clips: [remixedClip],
            audioTracks: [
              {
                id: `aud_remix_${Date.now()}`,
                title: `Original Audio (@${authorHandle})`,
                artist: authorName,
                type: "music",
                sourceUrl: "synth:phonk",
                timelineStart: 0,
                duration: 8.0,
                volume: 85,
                muted: false,
                fadeIn: false,
                fadeOut: true,
              },
            ],
            textLayers: [
              {
                id: `txt_remix_${Date.now()}`,
                text: `REMIX WITH @${authorHandle} 🔀`,
                timelineStart: 0.5,
                timelineEnd: 3.5,
                x: 50,
                y: 20,
                fontFamily: "Display",
                fontSize: 20,
                color: "#00F0FF",
                strokeColor: "#000000",
                strokeWidth: 4,
                animation: "pop",
                style: "neon",
              },
            ],
            stickers: [],
            effects: [],
            captions: caption
              ? [
                  {
                    id: "cap_remix",
                    text: caption,
                    timelineStart: 0.5,
                    timelineEnd: 4.5,
                  },
                ]
              : [],
            adjustments: {
              brightness: 105,
              contrast: 120,
              saturation: 115,
              exposure: 5,
              temperature: 0,
              vignette: 20,
              filterPreset: "cyber_glow",
            },
            memeMode: false,
            memeTopText: "",
            memeBottomText: "",
            remixedFrom: { authorHandle, authorName, reelId },
            updatedAt: Date.now(),
          },
          selectedClipId: remixedClip.id,
          currentTime: 0,
        });
      },

      resetProject: () => {
        set({
          project: {
            ...STUDIO_TEMPLATES[0].project,
            id: `proj_${Date.now()}`,
            updatedAt: Date.now(),
          },
          currentTime: 0,
          selectedClipId: STUDIO_TEMPLATES[0].project.clips[0]?.id ?? null,
        });
      },

      // Undo / Redo
      undo: () => {
        const { undoStack, redoStack, project } = get();
        if (!undoStack.length) return;
        const prev = undoStack[undoStack.length - 1];
        set({
          project: prev,
          undoStack: undoStack.slice(0, -1),
          redoStack: [...redoStack, project],
        });
      },

      redo: () => {
        const { undoStack, redoStack, project } = get();
        if (!redoStack.length) return;
        const next = redoStack[redoStack.length - 1];
        set({
          project: next,
          undoStack: [...undoStack, project],
          redoStack: redoStack.slice(0, -1),
        });
      },
    }),
    {
      name: "riff-studio-project-v2",
      partialize: (s) => ({ project: s.project }),
    },
  ),
);
