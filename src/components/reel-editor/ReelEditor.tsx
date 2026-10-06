import { useEffect, useRef, useState, useCallback } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useRiff } from "@/lib/store";
import { Timeline, type TimelineClip } from "./Timeline";
import { AudioPanel, type AudioTrack } from "./AudioPanel";
import { TextPanel, type TextLayer } from "./TextPanel";
import { PipPanel, type PipLayer } from "./PipPanel";
import { PipCanvas } from "./PipCanvas";
import { ExportModal } from "./ExportModal";
import { DraftsModal } from "./DraftsModal";
import { renderReelProject, getFilterCss } from "@/lib/reel-editor/render-engine";
import { HistoryManager, type ProjectSnapshot } from "@/lib/reel-editor/history";
import { autoSaveActiveDraft, loadActiveDraft, saveNamedDraft } from "@/lib/reel-editor/drafts";
import {
  saveMediaBlob,
  getMediaBlob,
  createSampleSlideDataUrl,
} from "@/lib/reel-editor/media-storage";
import type {
  FilterPreset,
  AspectRatio,
  RenderProgress,
  RenderResult,
  ReelProjectState,
} from "@/lib/reel-editor/types";
import { safeRandomUUID } from "@/lib/uuid";

type Clip = TimelineClip;

const FILTER_PRESETS: FilterPreset[] = [
  "Normal",
  "Vivid",
  "Dark",
  "Retro",
  "Cyberpunk",
  "Cinema",
  "Monochrome",
];

const ASPECT_RATIOS: AspectRatio[] = ["9:16", "1:1", "4:5", "16:9"];

interface ReelEditorProps {
  onSwitchToMultiTrack?: () => void;
}

export function ReelEditor({ onSwitchToMultiTrack }: ReelEditorProps = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const historyRef = useRef(new HistoryManager());

  const riffProfile = useRiff((s) => s.profile);
  const currentUser = useCurrentUser();
  const username =
    (riffProfile?.handle && riffProfile.handle !== "you" ? riffProfile.handle : null) ??
    (currentUser?.displayName && currentUser.displayName !== "Dev User" && currentUser.displayName !== "Creator"
      ? currentUser.displayName.replace(/\s+/g, "").toLowerCase()
      : null) ??
    (currentUser?.primaryEmail && !currentUser.primaryEmail.includes("example.com")
      ? currentUser.primaryEmail.split("@")[0]
      : null) ??
    riffProfile?.handle ??
    "creator";

  // Project state
  const [projectId] = useState(() => safeRandomUUID());
  const [projectName, setProjectName] = useState("My RIFF Reel");
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [filter, setFilter] = useState<FilterPreset>("Normal");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [pipLayers, setPipLayers] = useState<PipLayer[]>([]);
  const [selectedPipId, setSelectedPipId] = useState<string | null>(null);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);

  // Inspector Tab state: "clip" | "text" | "style"
  const [inspectorTab, setInspectorTab] = useState<"clip" | "text" | "style">("clip");

  // Modals & Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<RenderProgress | null>(null);
  const [exportResult, setExportResult] = useState<RenderResult | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>("Saved");
  const [showMobileInspector, setShowMobileInspector] = useState(false);
  const [replaceTargetClipId, setReplaceTargetClipId] = useState<string | null>(null);

  // Split state for selected clip
  const [splitSliderTime, setSplitSliderTime] = useState<number>(0);

  // Reel Master Playback
  const [isPlayingReel, setIsPlayingReel] = useState(false);
  const playheadTimerRef = useRef<number | null>(null);

  const activeClip = clips.find((c) => c.id === selectedClip);
  const isActiveClipImage =
    activeClip &&
    (activeClip.type === "image" ||
      /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(activeClip.name));

  // Sync split slider whenever active clip changes
  useEffect(() => {
    if (activeClip) {
      const mid = Math.round(((activeClip.start + activeClip.end) / 2) * 10) / 10;
      setSplitSliderTime(mid);
    }
  }, [activeClip?.id, activeClip?.start, activeClip?.end]);

  // Push state snapshot to history
  const pushHistory = useCallback(() => {
    const snapshot: ProjectSnapshot = {
      name: projectName,
      clips,
      selectedClipId: selectedClip,
      speed,
      muted,
      filter,
      aspectRatio,
      transition: "none",
      textLayers,
      pipLayers,
      audioTracks,
    };
    historyRef.current.push(snapshot);
  }, [
    projectName,
    clips,
    selectedClip,
    speed,
    muted,
    filter,
    aspectRatio,
    textLayers,
    pipLayers,
    audioTracks,
  ]);

  // Initial load from active draft with IndexedDB blob recovery
  useEffect(() => {
    async function restoreDraft() {
      const saved = loadActiveDraft();
      if (!saved || !saved.clips || saved.clips.length === 0) {
        return;
      }

      setProjectName(saved.name || "My RIFF Reel");
      setSpeed(saved.speed || 1);
      setMuted(!!saved.muted);
      setFilter(saved.filter || "Normal");
      setAspectRatio(saved.aspectRatio || "9:16");
      setTextLayers(saved.textLayers || []);
      setPipLayers(saved.pipLayers || []);
      setAudioTracks(saved.audioTracks || []);

      // Restore clip media blobs from IndexedDB if URLs expired
      const recoveredClips: Clip[] = await Promise.all(
        saved.clips.map(async (c) => {
          const isImage =
            c.type === "image" ||
            /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(c.name);

          let liveUrl = c.url;
          let isBroken = false;

          try {
            const storedBlob = await getMediaBlob(c.id);
            if (storedBlob) {
              liveUrl = URL.createObjectURL(storedBlob);
            } else if (c.url.startsWith("blob:")) {
              const res = await fetch(c.url, { method: "HEAD" }).catch(() => null);
              if (!res || !res.ok) {
                if (isImage) {
                  liveUrl = createSampleSlideDataUrl(c.name, "Restored Slide");
                }
                isBroken = true;
              }
            }
          } catch {
            isBroken = true;
          }

          return {
            ...c,
            url: liveUrl,
            type: isImage ? "image" : "video",
            isBroken,
          };
        })
      );

      setClips(recoveredClips);
      if (recoveredClips.length > 0) {
        setSelectedClip(saved.selectedClipId || recoveredClips[0].id);
      }
      pushHistory();
    }

    restoreDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save debounce effect
  useEffect(() => {
    setAutoSaveStatus("Saving...");
    const timeout = setTimeout(() => {
      const fullState: ReelProjectState = {
        id: projectId,
        name: projectName,
        updatedAt: Date.now(),
        clips,
        selectedClipId: selectedClip,
        speed,
        muted,
        filter,
        aspectRatio,
        transition: "none",
        textLayers,
        pipLayers,
        audioTracks,
      };
      autoSaveActiveDraft(fullState);
      setAutoSaveStatus("Auto-saved");
    }, 1200);

    return () => clearTimeout(timeout);
  }, [
    projectId,
    projectName,
    clips,
    selectedClip,
    speed,
    muted,
    filter,
    aspectRatio,
    textLayers,
    pipLayers,
    audioTracks,
  ]);

  // Undo / Redo
  function handleUndo() {
    const current: ProjectSnapshot = {
      name: projectName,
      clips,
      selectedClipId: selectedClip,
      speed,
      muted,
      filter,
      aspectRatio,
      transition: "none",
      textLayers,
      pipLayers,
      audioTracks,
    };
    const prev = historyRef.current.undo(current);
    if (prev) applySnapshot(prev);
  }

  function handleRedo() {
    const next = historyRef.current.redo();
    if (next) applySnapshot(next);
  }

  function applySnapshot(snap: ProjectSnapshot) {
    setProjectName(snap.name);
    setClips(snap.clips);
    setSelectedClip(snap.selectedClipId);
    setSpeed(snap.speed);
    setMuted(snap.muted);
    setFilter(snap.filter);
    setAspectRatio(snap.aspectRatio);
    setTextLayers(snap.textLayers);
    setPipLayers(snap.pipLayers);
    setAudioTracks(snap.audioTracks);
  }

  // Keyboard shortcut listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Layer & Media Handlers
  function addTextLayer(layer: TextLayer) {
    setTextLayers((current) => [...current, layer]);
    setSelectedTextId(layer.id);
    setInspectorTab("text");
    pushHistory();
  }

  function updateTextLayer(id: string, changes: Partial<TextLayer>) {
    setTextLayers((current) =>
      current.map((layer) => (layer.id === id ? { ...layer, ...changes } : layer))
    );
  }

  function deleteTextLayer(id: string) {
    setTextLayers((current) => current.filter((layer) => layer.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
    pushHistory();
  }

  function addPipLayer(layer: PipLayer) {
    setPipLayers((current) => [...current, layer]);
    setSelectedPipId(layer.id);
    setInspectorTab("text");
    pushHistory();
  }

  function updatePipLayer(id: string, changes: Partial<PipLayer>) {
    setPipLayers((current) =>
      current.map((layer) => (layer.id === id ? { ...layer, ...changes } : layer))
    );
  }

  function deletePipLayer(id: string) {
    setPipLayers((current) => current.filter((layer) => layer.id !== id));
    if (selectedPipId === id) setSelectedPipId(null);
    pushHistory();
  }

  // Import Media with IndexedDB persistence
  async function importMedia(files: FileList | null) {
    if (!files || files.length === 0) return;

    const newClips: Clip[] = [];
    for (const file of Array.from(files)) {
      const isImage =
        file.type.startsWith("image/") ||
        /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(file.name);
      const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);

      if (!isImage && !isVideo) continue;

      const clipId = safeRandomUUID();
      const blobUrl = URL.createObjectURL(file);

      await saveMediaBlob(clipId, file);

      newClips.push({
        id: clipId,
        name: file.name,
        url: blobUrl,
        duration: isImage ? 3.5 : 0,
        start: 0,
        end: isImage ? 3.5 : 0,
        type: isImage ? "image" : "video",
        isBroken: false,
      });
    }

    if (newClips.length > 0) {
      setClips((current) => [...current, ...newClips]);
      setSelectedClip(newClips[0].id);
      setInspectorTab("clip");
      pushHistory();
    }
  }

  // Replace media file for an existing clip
  async function handleReplaceMedia(clipId: string, file: File) {
    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(file.name);

    await saveMediaBlob(clipId, file);
    const newUrl = URL.createObjectURL(file);

    setClips((current) =>
      current.map((c) =>
        c.id === clipId
          ? {
              ...c,
              name: file.name,
              url: newUrl,
              type: isImage ? "image" : "video",
              isBroken: false,
              duration: isImage ? Math.max(c.duration, 3.5) : c.duration,
              end: isImage ? Math.max(c.end, 3.5) : c.end,
            }
          : c
      )
    );
    setSelectedClip(clipId);
    pushHistory();
  }

  // Load starter template media
  async function loadSampleMedia() {
    const id1 = safeRandomUUID();
    const id2 = safeRandomUUID();

    const sample1Url = createSampleSlideDataUrl("RIFF CREATOR DROP", "Meme Challenge #1 • ₹2,400 Reward");
    const sample2Url = createSampleSlideDataUrl("VIRAL SOUND SYNC", "Audio Mixed • 1080p Ultra HD");

    const sampleClips: Clip[] = [
      {
        id: id1,
        name: "Meme-Slide-Intro.png",
        url: sample1Url,
        duration: 3,
        start: 0,
        end: 3,
        type: "image",
        isBroken: false,
      },
      {
        id: id2,
        name: "Viral-Outro.png",
        url: sample2Url,
        duration: 3,
        start: 0,
        end: 3,
        type: "image",
        isBroken: false,
      },
    ];

    setClips(sampleClips);
    setSelectedClip(id1);
    setInspectorTab("clip");

    setTextLayers([
      {
        id: safeRandomUUID(),
        text: "DROP YOUR REEL HERE 🔥",
        fontSize: 32,
        color: "#d4ff00",
        bgColor: "rgba(0, 0, 0, 0.75)",
        fontFamily: "impact",
        position: "center",
        xPercent: 50,
        yPercent: 42,
        align: "center",
        hasStroke: true,
        strokeColor: "#000000",
        hasShadow: true,
        uppercase: true,
      },
    ]);

    pushHistory();
  }

  function selectClip(id: string) {
    setSelectedClip(id);
    setInspectorTab("clip");
    const clip = clips.find((item) => item.id === id);
    if (clip && clip.type !== "image" && videoRef.current) {
      videoRef.current.playbackRate = speed;
      videoRef.current.muted = muted;
    }
  }

  async function splitClip(id: string, time: number) {
    const targetClip = clips.find((c) => c.id === id);
    if (!targetClip) return;
    if (time <= targetClip.start || time >= targetClip.end) return;

    const firstId = safeRandomUUID();
    const secondId = safeRandomUUID();

    const existingBlob = await getMediaBlob(id);
    if (existingBlob) {
      await saveMediaBlob(firstId, existingBlob);
      await saveMediaBlob(secondId, existingBlob);
    }

    const firstClip: Clip = {
      ...targetClip,
      id: firstId,
      end: time,
      name: `${targetClip.name} - Part 1`,
      isBroken: false,
    };

    const secondClip: Clip = {
      ...targetClip,
      id: secondId,
      start: time,
      name: `${targetClip.name} - Part 2`,
      isBroken: false,
    };

    setClips((current) => {
      const idx = current.findIndex((c) => c.id === id);
      if (idx === -1) return current;
      const updated = [...current];
      updated.splice(idx, 1, firstClip, secondClip);
      return updated;
    });

    setSelectedClip(firstClip.id);
    pushHistory();
  }

  function duplicateClip(id: string) {
    const target = clips.find((c) => c.id === id);
    if (!target) return;

    const newId = safeRandomUUID();
    const dup: Clip = {
      ...target,
      id: newId,
      name: `${target.name} (Copy)`,
    };

    setClips((current) => {
      const idx = current.findIndex((c) => c.id === id);
      const updated = [...current];
      updated.splice(idx + 1, 0, dup);
      return updated;
    });

    setSelectedClip(newId);
    pushHistory();
  }

  function reorderClips(fromId: string, toId: string) {
    setClips((current) => {
      const fromIndex = current.findIndex((clip) => clip.id === fromId);
      const toIndex = current.findIndex((clip) => clip.id === toId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return current;

      const updated = [...current];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
    pushHistory();
  }

  function addAudioTrack(track: AudioTrack) {
    setAudioTracks((current) => [...current, track]);
    pushHistory();
  }

  function updateAudioTrack(id: string, changes: Partial<AudioTrack>) {
    setAudioTracks((current) =>
      current.map((track) => (track.id === id ? { ...track, ...changes } : track))
    );
  }

  function deleteAudioTrack(id: string) {
    setAudioTracks((current) => current.filter((track) => track.id !== id));
    pushHistory();
  }

  function removeClip(id: string) {
    setClips((current) => {
      const filtered = current.filter((clip) => clip.id !== id);
      if (selectedClip === id) {
        setSelectedClip(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
    pushHistory();
  }

  function changeSpeed(value: number) {
    setSpeed(value);
    if (videoRef.current) {
      videoRef.current.playbackRate = value;
    }
  }

  function toggleMute() {
    const value = !muted;
    setMuted(value);
    if (videoRef.current) {
      videoRef.current.muted = value;
    }
  }

  // Master Reel Playback
  function togglePlayReel() {
    if (isPlayingReel) {
      setIsPlayingReel(false);
      if (playheadTimerRef.current) clearTimeout(playheadTimerRef.current);
      if (videoRef.current) videoRef.current.pause();
    } else {
      if (clips.length === 0) return;
      setIsPlayingReel(true);

      const activeIdx = clips.findIndex((c) => c.id === selectedClip);
      const startIdx = activeIdx >= 0 ? activeIdx : 0;
      playClipAtIndex(startIdx);
    }
  }

  function playClipAtIndex(index: number) {
    if (index >= clips.length) {
      setIsPlayingReel(false);
      return;
    }

    const clip = clips[index];
    setSelectedClip(clip.id);

    const isImage =
      clip.type === "image" ||
      /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(clip.name);
    const duration = Math.max(0.5, clip.end - clip.start) / (speed || 1);

    if (!isImage && videoRef.current) {
      videoRef.current.currentTime = clip.start;
      videoRef.current.play().catch(() => {});
    }

    playheadTimerRef.current = window.setTimeout(() => {
      playClipAtIndex(index + 1);
    }, duration * 1000);
  }

  useEffect(() => {
    return () => {
      if (playheadTimerRef.current) clearTimeout(playheadTimerRef.current);
    };
  }, []);

  // Trigger 1080p Render Pipeline
  async function startFullRender() {
    try {
      setExportProgress({ progress: 1, stage: "Starting Render Engine..." });
      const fullProject: ReelProjectState = {
        id: projectId,
        name: projectName,
        updatedAt: Date.now(),
        clips,
        selectedClipId: selectedClip,
        speed,
        muted,
        filter,
        aspectRatio,
        transition: "none",
        textLayers,
        pipLayers,
        audioTracks,
      };

      const result = await renderReelProject(fullProject, {
        username,
        width: 1080,
        height: 1920,
        fps: 30,
        onProgress: (p) => setExportProgress(p),
      });

      setExportResult(result);
    } catch (err) {
      alert((err as Error).message || "Render failed");
      setExportProgress(null);
    }
  }

  // Aspect Ratio to CSS container class
  function getAspectClass(ar: AspectRatio) {
    switch (ar) {
      case "1:1":
        return "aspect-square";
      case "4:5":
        return "aspect-[4/5]";
      case "16:9":
        return "aspect-video";
      case "9:16":
      default:
        return "aspect-[9/16]";
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg overflow-hidden select-none">
      {/* Hidden file input for general media import */}
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        hidden
        onChange={(event) => importMedia(event.target.files)}
      />

      {/* Hidden file input for single clip replacement */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="video/*,image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && replaceTargetClipId) {
            handleReplaceMedia(replaceTargetClipId, file);
          }
          setReplaceTargetClipId(null);
          if (replaceInputRef.current) replaceInputRef.current.value = "";
        }}
      />

      {/* HEADER */}
      <header className="flex h-14 sm:h-16 items-center justify-between border-b border-border bg-surface px-3 sm:px-6 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => window.history.back()}
            className="text-muted hover:text-fg transition p-1 text-base sm:text-lg"
            title="Go back"
          >
            ←
          </button>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-transparent font-bold text-xs sm:text-sm text-fg focus:bg-raised px-1 sm:px-1.5 py-0.5 rounded outline-none border border-transparent focus:border-border max-w-[110px] sm:max-w-[200px]"
              />
              <span className="flex items-center gap-1 rounded-full bg-raised px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] text-muted border border-border">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d4ff00]" />
                <span className="hidden xs:inline">{autoSaveStatus}</span>
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted">RIFF Studio Engine</p>
          </div>
        </div>

        {/* TOOLBAR CENTER (UNDO / REDO + MULTI-TRACK SWITCH) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden md:flex items-center gap-1 bg-raised rounded-xl p-1 border border-border">
            <button
              onClick={handleUndo}
              title="Undo (Ctrl/Cmd+Z)"
              className="rounded-lg px-2.5 py-1 text-xs text-muted hover:bg-surface hover:text-fg transition"
            >
              ⟲ Undo
            </button>
            <div className="h-4 w-px bg-border" />
            <button
              onClick={handleRedo}
              title="Redo (Ctrl/Cmd+Shift+Z)"
              className="rounded-lg px-2.5 py-1 text-xs text-muted hover:bg-surface hover:text-fg transition"
            >
              ⟳ Redo
            </button>
          </div>

          {onSwitchToMultiTrack && (
            <button
              type="button"
              onClick={onSwitchToMultiTrack}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition text-xs font-bold shadow-sm"
              title="Switch to Advanced Multi-Track Video Studio"
            >
              <span>🎬</span>
              <span className="hidden sm:inline">Multi-Track Studio</span>
              <span className="sm:hidden">Studio</span>
            </button>
          )}
        </div>

        {/* HEADER RIGHT ACTIONS */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={() => setIsDraftsModalOpen(true)}
            className="hidden sm:flex rounded-lg border border-border px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-muted hover:bg-raised hover:text-fg transition items-center gap-1.5"
          >
            <span>📁</span> Drafts
          </button>

          <button
            onClick={() => {
              saveNamedDraft(
                {
                  id: projectId,
                  name: projectName,
                  updatedAt: Date.now(),
                  clips,
                  selectedClipId: selectedClip,
                  speed,
                  muted,
                  filter,
                  aspectRatio,
                  transition: "none",
                  textLayers,
                  pipLayers,
                  audioTracks,
                },
                projectName
              );
              setAutoSaveStatus("Saved to Drafts");
            }}
            className="hidden lg:block rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-muted hover:bg-raised hover:text-fg transition"
          >
            Save Draft
          </button>

          {/* MOBILE INSPECTOR TOGGLE */}
          <button
            onClick={() => setShowMobileInspector(!showMobileInspector)}
            className="md:hidden flex items-center gap-1 rounded-lg border border-border bg-raised px-2.5 py-1.5 text-xs font-semibold text-fg active:scale-95 transition"
          >
            <span>🎛️</span>
            <span>{showMobileInspector ? "Canvas" : "Tools"}</span>
          </button>

          <button
            onClick={() => {
              setExportProgress(null);
              setExportResult(null);
              setIsExportModalOpen(true);
            }}
            disabled={clips.length === 0}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-extrabold transition ${
              clips.length === 0
                ? "cursor-not-allowed bg-raised text-muted/40 border border-border"
                : "bg-[#d4ff00] text-black hover:opacity-90 shadow-md shadow-[#d4ff00]/10"
            }`}
          >
            <span>🎬</span>
            <span>
              Export<span className="hidden sm:inline"> & Publish</span>
            </span>
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {/* LEFT TOOLBAR */}
        <aside className="w-14 sm:w-20 border-r border-border bg-surface p-1.5 sm:p-3 flex flex-col justify-between shrink-0">
          <div>
            <ToolButton
              icon="＋"
              label="Media"
              onClick={() => inputRef.current?.click()}
            />

            <ToolButton
              icon="✨"
              label="Templates"
              onClick={loadSampleMedia}
            />

            <ToolButton
              icon="T"
              label="Text"
              onClick={() => {
                addTextLayer({
                  id: safeRandomUUID(),
                  text: "DOUBLE TAP TO EDIT",
                  fontSize: 28,
                  color: "#ffffff",
                  bgColor: "transparent",
                  fontFamily: "impact",
                  position: "center",
                  xPercent: 50,
                  yPercent: 50,
                  align: "center",
                  hasStroke: true,
                  strokeColor: "#000000",
                  hasShadow: true,
                  uppercase: true,
                });
                setShowMobileInspector(true);
              }}
            />

            <ToolButton
              icon="♫"
              label="Audio"
              onClick={() => {
                setInspectorTab("style");
                setShowMobileInspector(true);
                setTimeout(() => {
                  const el = document.getElementById("audio-section-anchor");
                  el?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
            />

            <ToolButton
              icon="🖼️"
              label="PIP"
              onClick={() => {
                setInspectorTab("text");
                setShowMobileInspector(true);
                setTimeout(() => {
                  const el = document.getElementById("pip-section-anchor");
                  el?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
            />

            <ToolButton
              icon="◉"
              label="Filters"
              onClick={() => {
                setInspectorTab("style");
                setShowMobileInspector(true);
                setTimeout(() => {
                  const el = document.getElementById("filters-section-anchor");
                  el?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
            />
          </div>

          <div className="text-center text-[10px] text-muted hidden sm:block">
            <span>RIFF</span>
          </div>
        </aside>

        {/* CENTER VIEWPORT & TIMELINE */}
        <section className="flex flex-1 flex-col bg-bg min-w-0 overflow-hidden">
          {/* PREVIEW CONTAINER: Expanded vertical room with max containment */}
          <div className="flex flex-1 items-center justify-center p-3 sm:p-5 overflow-hidden min-h-0">
            <div
              className={`relative ${getAspectClass(
                aspectRatio
              )} h-full max-h-[58vh] sm:max-h-[66vh] max-w-full overflow-hidden rounded-2xl bg-black shadow-2xl border border-border flex items-center justify-center transition-all duration-300`}
            >
              {activeClip ? (
                activeClip.isBroken ? (
                  /* BROKEN / EXPIRED MEDIA RECOVERY CARD */
                  <div className="relative h-full w-full flex flex-col items-center justify-center bg-black/90 p-6 text-center text-white gap-3 select-none">
                    <span className="text-4xl text-amber-400">⚠️</span>
                    <h4 className="text-sm font-bold text-white">Media Source Expired</h4>
                    <p className="text-xs text-white/60 max-w-xs">
                      The file <strong>"{activeClip.name}"</strong> was cleared from temporary browser cache.
                    </p>
                    <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
                      <button
                        onClick={() => {
                          setReplaceTargetClipId(activeClip.id);
                          replaceInputRef.current?.click();
                        }}
                        className="rounded-xl bg-[#d4ff00] py-2.5 px-4 text-xs font-bold text-black hover:opacity-90 shadow-md transition"
                      >
                        📁 Re-select File ({activeClip.name})
                      </button>
                      <button
                        onClick={() => {
                          const sampleUrl = createSampleSlideDataUrl(activeClip.name);
                          setClips((current) =>
                            current.map((c) =>
                              c.id === activeClip.id
                                ? { ...c, url: sampleUrl, type: "image", isBroken: false }
                                : c
                            )
                          );
                        }}
                        className="rounded-xl border border-white/15 bg-white/10 py-2 px-4 text-xs font-semibold text-white hover:bg-white/20 transition"
                      >
                        ✨ Use Sample Gradient Slide
                      </button>
                    </div>
                  </div>
                ) : isActiveClipImage ? (
                  /* IMAGE / PHOTO SLIDE PREVIEW */
                  <div className="relative h-full w-full flex items-center justify-center bg-black overflow-hidden select-none">
                    <img
                      key={activeClip.id}
                      src={activeClip.url}
                      alt={activeClip.name}
                      onError={() => {
                        setClips((current) =>
                          current.map((c) =>
                            c.id === activeClip.id ? { ...c, isBroken: true } : c
                          )
                        );
                      }}
                      style={{ filter: getFilterCss(filter) }}
                      className="h-full w-full object-contain transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-bold text-[#d4ff00] border border-[#d4ff00]/40 backdrop-blur-md shadow-lg">
                      <span>📸 Photo Slide</span>
                      <span className="text-white/60">
                        ({(activeClip.end - activeClip.start).toFixed(1)}s)
                      </span>
                    </div>
                  </div>
                ) : (
                  /* VIDEO PREVIEW */
                  <video
                    ref={videoRef}
                    key={activeClip.id}
                    src={activeClip.url}
                    controls
                    playsInline
                    style={{ filter: getFilterCss(filter) }}
                    className="h-full w-full object-contain"
                    onError={() => {
                      setClips((current) =>
                        current.map((c) =>
                          c.id === activeClip.id ? { ...c, isBroken: true } : c
                        )
                      );
                    }}
                    onLoadedMetadata={(event) => {
                      const duration = event.currentTarget.duration;
                      if (duration > 0) {
                        setClips((current) =>
                          current.map((c) =>
                            c.id === activeClip.id
                              ? {
                                  ...c,
                                  duration,
                                  end: c.end === 0 ? duration : c.end,
                                  type: "video",
                                  isBroken: false,
                                }
                              : c
                          )
                        );
                      }
                    }}
                  />
                )
              ) : (
                /* EMPTY STATE */
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center text-white/40">
                  <span className="text-5xl">＋</span>
                  <span className="text-sm font-bold text-white">
                    Import Videos or Photos/Memes
                  </span>
                  <span className="text-xs text-white/50 max-w-xs">
                    Create viral reels from video clips or photo slides with music, text & effects!
                  </span>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="rounded-full bg-[#d4ff00] text-black font-extrabold px-4 py-1.5 text-xs hover:opacity-90 shadow-md transition"
                    >
                      📁 Browse Media
                    </button>
                    <button
                      onClick={loadSampleMedia}
                      className="rounded-full bg-white/10 text-white font-bold px-4 py-1.5 text-xs hover:bg-white/20 transition"
                    >
                      ✨ Starter Template
                    </button>
                  </div>
                </div>
              )}

              {/* DRAGGABLE / RESIZABLE PIP LAYERS */}
              {pipLayers.map((layer) => (
                <PipCanvas
                  key={layer.id}
                  layer={layer}
                  selected={selectedPipId === layer.id}
                  onSelect={() => setSelectedPipId(layer.id)}
                  onMove={(x, y) => updatePipLayer(layer.id, { x, y })}
                  onResize={(width, height) => updatePipLayer(layer.id, { width, height })}
                />
              ))}

              {/* INTERACTIVE TEXT LAYERS */}
              {textLayers.map((layer) => {
                const isSelected = selectedTextId === layer.id;
                const fontFamilies = {
                  impact: 'Impact, "Arial Black", sans-serif',
                  modern: 'system-ui, -apple-system, sans-serif',
                  classic: 'Georgia, Cambria, serif',
                  mono: 'ui-monospace, monospace',
                  script: 'cursive, "Brush Script MT", sans-serif',
                };

                return (
                  <div
                    key={layer.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTextId(layer.id);
                      setInspectorTab("text");
                    }}
                    style={{
                      top: `${layer.yPercent}%`,
                      left: `${layer.xPercent}%`,
                      transform: "translate(-50%, -50%)",
                      fontFamily: fontFamilies[layer.fontFamily],
                      fontSize: `${layer.fontSize}px`,
                      color: layer.color,
                      backgroundColor: layer.bgColor,
                      textTransform: layer.uppercase ? "uppercase" : "none",
                      textAlign: layer.align,
                      textShadow: layer.hasStroke
                        ? `-2px -2px 0 ${layer.strokeColor}, 2px -2px 0 ${layer.strokeColor}, -2px 2px 0 ${layer.strokeColor}, 2px 2px 0 ${layer.strokeColor}`
                        : layer.hasShadow
                        ? "0 4px 12px rgba(0,0,0,0.85)"
                        : "none",
                    }}
                    className={`absolute z-10 cursor-pointer select-none rounded px-3 py-1 font-bold transition ${
                      isSelected
                        ? "ring-2 ring-[#d4ff00] ring-offset-2 ring-offset-black/50"
                        : "hover:ring-1 hover:ring-white/40"
                    }`}
                  >
                    {layer.text}
                  </div>
                );
              })}

              {/* PREVIEW WATERMARK BADGE */}
              <div className="pointer-events-none absolute bottom-3 left-3 z-30 flex items-center gap-2 rounded-xl bg-black/60 px-3 py-1.5 backdrop-blur-sm border border-white/10">
                <span className="font-black text-xs text-[#d4ff00]">RIFF</span>
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span className="text-[11px] font-medium text-white/90">@{username}</span>
              </div>
            </div>
          </div>

          {/* CONTROLS STRIP */}
          <div className="flex items-center justify-between border-t border-border bg-surface px-3 sm:px-6 py-2 shrink-0">
            {/* MASTER PLAY / PAUSE BUTTON */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayReel}
                disabled={clips.length === 0}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  clips.length === 0
                    ? "bg-raised text-muted/40 cursor-not-allowed border border-border"
                    : isPlayingReel
                    ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                    : "bg-[#d4ff00] text-black shadow-md shadow-[#d4ff00]/15 hover:opacity-90"
                }`}
              >
                <span>{isPlayingReel ? "⏸" : "▶"}</span>
                <span>{isPlayingReel ? "Pause Reel" : "Play Reel"}</span>
              </button>

              {activeClip && (
                <span className="text-[11px] text-muted hidden sm:inline">
                  Playing: <strong className="text-fg font-medium truncate max-w-[120px] inline-block align-bottom">{activeClip.name}</strong>
                </span>
              )}
            </div>

            {/* SPEED & MUTE CONTROLS */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[0.5, 1, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                      speed === s
                        ? "bg-surface text-fg font-bold border border-border shadow-xs"
                        : "bg-raised text-muted hover:text-fg"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

              <button
                onClick={toggleMute}
                className="rounded bg-raised px-2.5 py-1 text-xs font-semibold text-muted hover:text-fg border border-border hover:bg-surface transition"
              >
                {muted ? "🔇 Unmute" : "🔊 Mute"}
              </button>
            </div>
          </div>

          {/* TIMELINE */}
          <Timeline
            clips={clips}
            selectedClip={selectedClip}
            onSelect={selectClip}
            onDelete={removeClip}
            onSplit={splitClip}
            onReorder={reorderClips}
            onDuplicate={duplicateClip}
            onReplaceMedia={handleReplaceMedia}
            onUpdate={(id, start, end) => {
              setClips((current) =>
                current.map((clip) =>
                  clip.id === id ? { ...clip, start, end } : clip
                )
              );

              if (selectedClip === id && videoRef.current) {
                videoRef.current.currentTime = start;
              }
            }}
          />
        </section>

        {/* RIGHT EDIT PANEL */}
        <aside
          className={`w-full sm:w-80 overflow-y-auto border-l border-border bg-surface p-4 sm:p-5 space-y-5 shrink-0 ${
            showMobileInspector
              ? "fixed inset-y-0 right-0 z-50 shadow-2xl block md:static md:z-auto"
              : "hidden md:block"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-fg">
              Inspector & Controls
            </h2>
            <button
              onClick={() => setShowMobileInspector(false)}
              className="md:hidden rounded-lg px-2.5 py-1 text-xs font-bold text-muted hover:text-fg bg-raised hover:bg-surface border border-border transition"
              title="Close Panel"
            >
              ✕ Close
            </button>
          </div>

          {/* TAB SELECTOR */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-raised p-1 border border-border text-xs">
            <button
              onClick={() => setInspectorTab("clip")}
              className={`rounded-lg py-1.5 font-bold transition ${
                inspectorTab === "clip"
                  ? "bg-[#d4ff00] text-black shadow-sm"
                  : "text-muted hover:text-fg"
              }`}
            >
              🎬 Clip
            </button>
            <button
              onClick={() => setInspectorTab("text")}
              className={`rounded-lg py-1.5 font-bold transition ${
                inspectorTab === "text"
                  ? "bg-[#d4ff00] text-black shadow-sm"
                  : "text-muted hover:text-fg"
              }`}
            >
              📝 Layers
            </button>
            <button
              onClick={() => setInspectorTab("style")}
              className={`rounded-lg py-1.5 font-bold transition ${
                inspectorTab === "style"
                  ? "bg-[#d4ff00] text-black shadow-sm"
                  : "text-muted hover:text-fg"
              }`}
            >
              ⚙️ Style
            </button>
          </div>

          {/* TAB 1: CLIP EDITING CONTROLS */}
          {inspectorTab === "clip" && (
            <div className="space-y-4">
              {activeClip ? (
                <>
                  <div className="rounded-xl border border-border bg-raised p-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-fg truncate max-w-[170px]">
                        {activeClip.name}
                      </span>
                      <span className="text-[10px] rounded bg-[#d4ff00]/15 text-[#d4ff00] font-bold px-1.5 py-0.5">
                        {isActiveClipImage ? "📸 Photo" : "🎥 Video"}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted flex justify-between">
                      <span>Trimmed: {activeClip.start.toFixed(1)}s - {activeClip.end.toFixed(1)}s</span>
                      <span className="font-mono text-fg font-bold">
                        {(activeClip.end - activeClip.start).toFixed(1)}s
                      </span>
                    </div>
                  </div>

                  {/* START TRIM SLIDER */}
                  <div className="rounded-xl border border-border bg-raised p-3 space-y-2">
                    <div className="flex justify-between text-xs text-muted">
                      <span>Start Trim</span>
                      <span className="font-mono text-[#d4ff00] font-bold">
                        {activeClip.start.toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(activeClip.duration - 0.1, 0.1)}
                      step={0.1}
                      value={activeClip.start}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val < activeClip.end) {
                          setClips((current) =>
                            current.map((c) =>
                              c.id === activeClip.id ? { ...c, start: val } : c
                            )
                          );
                        }
                      }}
                      className="w-full accent-[#d4ff00] cursor-pointer"
                    />
                  </div>

                  {/* END TRIM SLIDER */}
                  <div className="rounded-xl border border-border bg-raised p-3 space-y-2">
                    <div className="flex justify-between text-xs text-muted">
                      <span>End Trim</span>
                      <span className="font-mono text-[#d4ff00] font-bold">
                        {activeClip.end.toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={Math.max(activeClip.duration, 0.1)}
                      step={0.1}
                      value={activeClip.end}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val > activeClip.start) {
                          setClips((current) =>
                            current.map((c) =>
                              c.id === activeClip.id ? { ...c, end: val } : c
                            )
                          );
                        }
                      }}
                      className="w-full accent-[#d4ff00] cursor-pointer"
                    />
                  </div>

                  {/* SPLIT CLIP SECTION */}
                  <div className="rounded-xl border border-border bg-raised p-3 space-y-2.5">
                    <div className="flex justify-between text-xs text-muted">
                      <span>Split At Position</span>
                      <span className="font-mono text-[#d4ff00] font-bold">
                        {splitSliderTime.toFixed(1)}s
                      </span>
                    </div>

                    <input
                      type="range"
                      min={activeClip.start + 0.1}
                      max={activeClip.end - 0.1}
                      step={0.1}
                      value={Math.min(
                        Math.max(splitSliderTime, activeClip.start + 0.1),
                        activeClip.end - 0.1
                      )}
                      onChange={(e) => setSplitSliderTime(Number(e.target.value))}
                      className="w-full accent-[#d4ff00] cursor-pointer"
                    />

                    <button
                      onClick={() => {
                        if (
                          splitSliderTime > activeClip.start &&
                          splitSliderTime < activeClip.end
                        ) {
                          splitClip(activeClip.id, splitSliderTime);
                        }
                      }}
                      className="w-full rounded-lg bg-[#d4ff00] py-2 text-xs font-extrabold text-black hover:opacity-90 shadow-md transition"
                    >
                      ✂️ Split Clip Now
                    </button>
                  </div>

                  {/* QUICK CLIP ACTIONS */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        setReplaceTargetClipId(activeClip.id);
                        replaceInputRef.current?.click();
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface py-2 text-xs font-semibold text-fg hover:bg-raised transition"
                    >
                      <span>🔄</span> Replace File
                    </button>
                    <button
                      onClick={() => duplicateClip(activeClip.id)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface py-2 text-xs font-semibold text-fg hover:bg-raised transition"
                    >
                      <span>⧉</span> Duplicate
                    </button>
                  </div>

                  <button
                    onClick={() => removeClip(activeClip.id)}
                    className="w-full rounded-lg border border-red-500/20 bg-red-500/10 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition"
                  >
                    🗑️ Remove Clip
                  </button>
                </>
              ) : (
                <div className="rounded-xl border border-border bg-raised p-6 text-center text-xs text-muted space-y-2">
                  <span className="text-2xl block">🎬</span>
                  <p className="font-semibold text-fg">No clip selected.</p>
                  <p className="text-[11px] text-muted">
                    Click any clip on the timeline or tap <strong className="text-fg">+ Media</strong> to add clips.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEXT & OVERLAYS */}
          {inspectorTab === "text" && (
            <div className="space-y-6">
              <div>
                <TextPanel
                  layers={textLayers}
                  selectedId={selectedTextId}
                  onSelect={setSelectedTextId}
                  onAdd={addTextLayer}
                  onUpdate={updateTextLayer}
                  onDelete={deleteTextLayer}
                />
              </div>

              <div id="pip-section-anchor" className="border-t border-border pt-4">
                <h3 className="mb-3 text-xs uppercase tracking-wider text-muted font-bold">
                  Picture-in-Picture (PIP)
                </h3>
                <PipPanel
                  layers={pipLayers}
                  selectedId={selectedPipId}
                  onAdd={addPipLayer}
                  onUpdate={updatePipLayer}
                  onDelete={deletePipLayer}
                  onSelect={setSelectedPipId}
                />
              </div>
            </div>
          )}

          {/* TAB 3: STYLING & AUDIO */}
          {inspectorTab === "style" && (
            <div className="space-y-6">
              {/* ASPECT RATIO */}
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-muted font-bold">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {ASPECT_RATIOS.map((ar) => (
                    <button
                      key={ar}
                      onClick={() => {
                        setAspectRatio(ar);
                        pushHistory();
                      }}
                      className={`rounded-lg py-2 text-xs font-bold transition ${
                        aspectRatio === ar
                          ? "bg-[#d4ff00] text-black shadow-xs"
                          : "bg-raised text-muted hover:bg-surface hover:text-fg border border-border"
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>

              {/* VIDEO FILTERS */}
              <div id="filters-section-anchor" className="border-t border-border pt-4">
                <label className="mb-2 block text-xs uppercase tracking-wider text-muted font-bold">
                  Color Grading & Filters
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {FILTER_PRESETS.map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setFilter(f);
                        pushHistory();
                      }}
                      className={`rounded-lg py-2 text-xs font-medium transition ${
                        filter === f
                          ? "bg-[#d4ff00] text-black font-bold shadow-xs"
                          : "bg-raised text-muted hover:bg-surface hover:text-fg border border-border"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* AUDIO TRACKS */}
              <div id="audio-section-anchor" className="border-t border-border pt-4">
                <h3 className="mb-3 text-xs uppercase tracking-wider text-muted font-bold">
                  Audio & Music Tracks
                </h3>
                <AudioPanel
                  tracks={audioTracks}
                  onAdd={addAudioTrack}
                  onUpdate={updateAudioTrack}
                  onDelete={deleteAudioTrack}
                />
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* EXPORT & PUBLISH MODAL */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => {
          setIsExportModalOpen(false);
          setExportProgress(null);
          setExportResult(null);
        }}
        progress={exportProgress}
        result={exportResult}
        onStartExport={startFullRender}
        username={username}
        defaultTitle={projectName}
        filter={filter}
        speed={speed}
        musicTrackTitle={audioTracks.length > 0 ? audioTracks[0].name : undefined}
      />

      {/* DRAFTS MODAL */}
      <DraftsModal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        onLoadProject={(p) => {
          setProjectName(p.name);
          setClips(p.clips);
          if (p.clips.length > 0) setSelectedClip(p.clips[0].id);
          setSpeed(p.speed || 1);
          setMuted(!!p.muted);
          setFilter(p.filter || "Normal");
          setAspectRatio(p.aspectRatio || "9:16");
          setTextLayers(p.textLayers || []);
          setPipLayers(p.pipLayers || []);
          setAudioTracks(p.audioTracks || []);
          pushHistory();
        }}
        onSaveCurrentDraft={() => {
          saveNamedDraft(
            {
              id: projectId,
              name: projectName,
              updatedAt: Date.now(),
              clips,
              selectedClipId: selectedClip,
              speed,
              muted,
              filter,
              aspectRatio,
              transition: "none",
              textLayers,
              pipLayers,
              audioTracks,
            },
            projectName
          );
        }}
      />
    </div>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mb-3 flex w-full flex-col items-center gap-1 rounded-xl p-2 text-muted transition hover:bg-raised hover:text-fg"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
