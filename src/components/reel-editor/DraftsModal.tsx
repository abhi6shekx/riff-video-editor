import { useEffect, useState } from "react";
import { listSavedDrafts, deleteSavedDraft, loadSavedDraft, type SavedDraftMeta } from "@/lib/reel-editor/drafts";
import type { ReelProjectState } from "@/lib/reel-editor/types";

interface DraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (project: ReelProjectState) => void;
  onSaveCurrentDraft: () => void;
}

export function DraftsModal({
  isOpen,
  onClose,
  onLoadProject,
  onSaveCurrentDraft,
}: DraftsModalProps) {
  const [drafts, setDrafts] = useState<SavedDraftMeta[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDrafts(listSavedDrafts());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleLoad(id: string) {
    const proj = loadSavedDraft(id);
    if (proj) {
      onLoadProject(proj);
      onClose();
    }
  }

  function handleDelete(id: string) {
    deleteSavedDraft(id);
    setDrafts(listSavedDrafts());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 text-fg">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-base font-bold text-fg flex items-center gap-2">
              <span>📁</span> Saved Reel Drafts
            </h2>
            <p className="text-xs text-muted">
              Resume your saved projects anytime
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-raised hover:text-fg"
          >
            ✕
          </button>
        </div>

        <div className="flex justify-between items-center pt-1">
          <span className="text-xs text-muted">
            {drafts.length} saved project{drafts.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={() => {
              onSaveCurrentDraft();
              setDrafts(listSavedDrafts());
            }}
            className="rounded-lg bg-[#d4ff00] px-3 py-1.5 text-xs font-bold text-black hover:opacity-90 transition"
          >
            + Save Current as Draft
          </button>
        </div>

        {/* DRAFT LIST */}
        <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {drafts.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-xl border border-border bg-raised p-3.5 transition hover:border-border"
            >
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-fg">{d.name}</h4>
                <div className="flex gap-2 text-[10px] text-muted">
                  <span>🎬 {d.clipCount} clips ({d.totalDuration.toFixed(1)}s)</span>
                  <span>•</span>
                  <span>T {d.textCount} texts</span>
                  <span>•</span>
                  <span>🖼️ {d.pipCount} PIPs</span>
                  <span>•</span>
                  <span>{new Date(d.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLoad(d.id)}
                  className="rounded-lg bg-surface border border-border px-3 py-1.5 text-xs font-semibold text-fg hover:bg-[#d4ff00] hover:text-black transition"
                >
                  Open
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="rounded-lg p-1.5 text-xs text-red-400 hover:bg-red-500/10 transition"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}

          {drafts.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted space-y-1">
              <p>No saved drafts found.</p>
              <p className="text-[11px] text-white/30">Your changes auto-save in background as you edit!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
