import type { ReelProjectState } from "./types";
import { safeRandomUUID } from "@/lib/uuid";

const ACTIVE_DRAFT_KEY = "riff_active_reel_draft";
const SAVED_DRAFTS_KEY = "riff_saved_reel_drafts";

export interface SavedDraftMeta {
  id: string;
  name: string;
  updatedAt: number;
  clipCount: number;
  totalDuration: number;
  textCount: number;
  pipCount: number;
  audioCount: number;
  thumbnailUrl?: string;
}

export interface SavedDraft extends SavedDraftMeta {
  project: ReelProjectState;
}

export function autoSaveActiveDraft(project: ReelProjectState): void {
  try {
    const payload = JSON.stringify({
      ...project,
      updatedAt: Date.now(),
    });
    localStorage.setItem(ACTIVE_DRAFT_KEY, payload);
  } catch (err) {
    console.warn("Failed to auto-save draft:", err);
  }
}

export function loadActiveDraft(): ReelProjectState | null {
  try {
    const raw = localStorage.getItem(ACTIVE_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to load active draft:", err);
    return null;
  }
}

export function clearActiveDraft(): void {
  try {
    localStorage.removeItem(ACTIVE_DRAFT_KEY);
  } catch (err) {
    console.warn("Failed to clear active draft:", err);
  }
}

export function saveNamedDraft(project: ReelProjectState, customName?: string): SavedDraftMeta {
  const drafts = listSavedDrafts();
  const name = customName || project.name || `Reel Project #${drafts.length + 1}`;
  
  const totalDuration = project.clips.reduce((acc, c) => acc + Math.max(0.1, c.end - c.start), 0);

  const meta: SavedDraftMeta = {
    id: project.id || safeRandomUUID(),
    name,
    updatedAt: Date.now(),
    clipCount: project.clips.length,
    totalDuration,
    textCount: project.textLayers.length,
    pipCount: project.pipLayers.length,
    audioCount: project.audioTracks.length,
  };

  const draft: SavedDraft = {
    ...meta,
    project: {
      ...project,
      id: meta.id,
      name,
      updatedAt: meta.updatedAt,
    },
  };

  const existingIndex = drafts.findIndex((d) => d.id === meta.id);
  const fullDrafts = getFullSavedDrafts();

  if (existingIndex >= 0) {
    fullDrafts[existingIndex] = draft;
  } else {
    fullDrafts.unshift(draft);
  }

  try {
    localStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(fullDrafts));
  } catch (err) {
    console.error("Failed to save draft:", err);
  }

  return meta;
}

export function listSavedDrafts(): SavedDraftMeta[] {
  const full = getFullSavedDrafts();
  return full.map(({ id, name, updatedAt, clipCount, totalDuration, textCount, pipCount, audioCount, thumbnailUrl }) => ({
    id,
    name,
    updatedAt,
    clipCount,
    totalDuration,
    textCount,
    pipCount,
    audioCount,
    thumbnailUrl,
  }));
}

export function loadSavedDraft(id: string): ReelProjectState | null {
  const full = getFullSavedDrafts();
  const found = full.find((d) => d.id === id);
  return found ? found.project : null;
}

export function deleteSavedDraft(id: string): void {
  const full = getFullSavedDrafts().filter((d) => d.id !== id);
  try {
    localStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(full));
  } catch (err) {
    console.error("Failed to delete draft:", err);
  }
}

function getFullSavedDrafts(): SavedDraft[] {
  try {
    const raw = localStorage.getItem(SAVED_DRAFTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
