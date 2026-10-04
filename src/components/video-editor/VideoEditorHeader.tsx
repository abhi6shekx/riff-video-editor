import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Flame,
  Redo2,
  Share2,
  Sliders,
  Sparkles,
  Undo2,
  Video,
} from "lucide-react";
import { useStudio } from "@/lib/studio/store";
import type { AspectRatio } from "@/lib/studio/types";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { cn } from "@/lib/utils";

interface VideoEditorHeaderProps {
  onOpenExport: () => void;
  onSwitchMode?: () => void;
  className?: string;
}

const RATIOS: { id: AspectRatio; label: string; desc: string; icon: string }[] = [
  { id: "9:16", label: "9:16", desc: "Reels / Shorts / TikTok", icon: "📱" },
  { id: "1:1", label: "1:1", desc: "Square Post", icon: "⏹️" },
  { id: "4:5", label: "4:5", desc: "Portrait Feed", icon: "🖼️" },
  { id: "16:9", label: "16:9", desc: "Cinema / YouTube", icon: "🖥️" },
];

export function VideoEditorHeader({ onOpenExport, onSwitchMode, className }: VideoEditorHeaderProps) {
  const project = useStudio((s) => s.project);
  const setAspectRatio = useStudio((s) => s.setAspectRatio);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const undoStack = useStudio((s) => s.undoStack);
  const redoStack = useStudio((s) => s.redoStack);
  const toggleMemeMode = useStudio((s) => s.toggleMemeMode);

  const [ratioOpen, setRatioOpen] = useState(false);
  const [title, setTitle] = useState(project.title || "Untitled Project");

  return (
    <header
      className={cn(
        "h-14 border-b border-white/10 bg-[#0d1017] px-3 md:px-5 flex items-center justify-between gap-2 select-none z-30 shrink-0",
        className,
      )}
    >
      {/* Left: Back + Mode Switch + Project Name */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Link
          to="/create"
          className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted hover:text-white hover:bg-white/10 transition-colors"
          title="Back to Create"
        >
          <ArrowLeft className="size-4" />
        </Link>

        {onSwitchMode && (
          <button
            type="button"
            onClick={onSwitchMode}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition shrink-0"
            title="Switch to Quick Reel Creator"
          >
            <span>⚡ Quick Mode</span>
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 text-white shadow-sm shrink-0">
            <Video className="size-3.5" />
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="hidden sm:block bg-transparent text-sm font-semibold text-white/90 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 rounded px-1.5 py-0.5 truncate max-w-[180px] md:max-w-[260px]"
            placeholder="Project Name"
          />
        </div>
      </div>

      {/* Center: Aspect Ratio & Undo/Redo */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Undo / Redo */}
        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
          <button
            type="button"
            onClick={undo}
            disabled={undoStack.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors rounded"
            title="Undo (Ctrl/Cmd+Z)"
          >
            <Undo2 className="size-3.5" />
            <span className="hidden lg:inline text-[10px] text-white/40 font-mono">⌘Z</span>
          </button>
          <div className="w-px h-3.5 bg-white/10" />
          <button
            type="button"
            onClick={redo}
            disabled={redoStack.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors rounded"
            title="Redo (Ctrl/Cmd+Shift+Z)"
          >
            <Redo2 className="size-3.5" />
            <span className="hidden lg:inline text-[10px] text-white/40 font-mono">⇧⌘Z</span>
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setRatioOpen(!ratioOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white/80 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            <span className="text-cyan-400 font-mono font-bold">{project.aspectRatio}</span>
            <ChevronDown className="size-3 text-white/50" />
          </button>

          {ratioOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setRatioOpen(false)}
              />
              <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-48 rounded-xl bg-[#161b26] border border-white/15 p-1.5 shadow-2xl z-50 flex flex-col gap-1 backdrop-blur-xl">
                <div className="px-2 py-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                  Canvas Aspect Ratio
                </div>
                {RATIOS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setAspectRatio(r.id);
                      setRatioOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left",
                      project.aspectRatio === r.id
                        ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                        : "text-white/70 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </span>
                    <span className="text-[10px] text-white/40">{r.desc.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Meme Mode Switch */}
        <button
          type="button"
          onClick={() => toggleMemeMode()}
          className={cn(
            "hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors",
            project.memeMode
              ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm"
              : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10",
          )}
          title="Toggle Top/Bottom Meme Text Overlay"
        >
          <Flame className="size-3.5 text-amber-400" />
          <span>Meme Mode</span>
        </button>
      </div>

      {/* Right: Challenge Link + Export Button */}
      <div className="flex items-center gap-2">
        <Link
          to="/challenge"
          className="hidden md:flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white/70 hover:text-white bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Sparkles className="size-3 text-purple-400" />
          <span>Challenges</span>
        </Link>

        <ThemeSwitcher variant="compact" />

        <button
          type="button"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 rounded-lg shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
        >
          <Download className="size-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}
