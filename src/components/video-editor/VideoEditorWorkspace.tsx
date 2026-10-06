import { useState } from "react";
import {
  Clapperboard,
  Film,
  Music,
  Plus,
  Scissors,
  Sliders,
  Smile,
  Sparkles,
  Type,
  X,
  Zap,
} from "lucide-react";
import { VideoEditorHeader } from "./VideoEditorHeader";
import { VideoPreviewArea } from "./VideoPreviewArea";
import { TimelineView } from "./TimelineView";
import { InspectorPanel } from "./InspectorPanel";
import { EditorSidebar } from "./EditorSidebar";
import { ExportModal } from "./ExportModal";
import { useStudio } from "@/lib/studio/store";
import { cn } from "@/lib/utils";

interface VideoEditorWorkspaceProps {
  onSwitchMode?: () => void;
}

export function VideoEditorWorkspace({ onSwitchMode }: VideoEditorWorkspaceProps = {}) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState<
    "tools" | "inspector" | null
  >(null);

  const selectedClipId = useStudio((s) => s.selectedClipId);
  const selectedTextId = useStudio((s) => s.selectedTextId);
  const selectedAudioId = useStudio((s) => s.selectedAudioId);
  const selectedStickerId = useStudio((s) => s.selectedStickerId);

  const hasSelection = Boolean(
    selectedClipId || selectedTextId || selectedAudioId || selectedStickerId,
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-fg">
      {/* 1. Top Global Navigation Bar */}
      <VideoEditorHeader
        onOpenExport={() => setIsExportOpen(true)}
        onSwitchMode={onSwitchMode}
      />

      {/* 2. Main Middle Workspace Area (Desktop & Mobile Adaptive) */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Desktop Left Sidebar: Tool Library */}
        <div className="hidden md:flex shrink-0 h-full">
          <EditorSidebar />
        </div>

        {/* Center Canvas Preview Stage */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <VideoPreviewArea className="flex-1 min-h-0" />
        </div>

        {/* Desktop Right Properties Inspector */}
        <div className="hidden lg:flex shrink-0 h-full">
          <InspectorPanel />
        </div>

        {/* Mobile Slide-Up Sheet for Tools or Inspector */}
        {mobileDrawer && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex flex-col justify-end">
            <div
              className="flex-1"
              onClick={() => setMobileDrawer(null)}
            />
            <div className="bg-surface border-t border-border rounded-t-3xl max-h-[75vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
              {mobileDrawer === "tools" ? (
                <EditorSidebar onCloseMobile={() => setMobileDrawer(null)} />
              ) : (
                <InspectorPanel onCloseMobile={() => setMobileDrawer(null)} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Multi-Track Timeline (Fixed Height, Horizontal Scroll) */}
      <div className="shrink-0 z-20">
        <TimelineView onOpenAddMedia={() => setMobileDrawer("tools")} />
      </div>

      {/* 4. Mobile Bottom Tool Dock */}
      <div className="md:hidden flex items-center justify-around h-14 bg-surface border-t border-border px-2 shrink-0 z-30">
        <button
          type="button"
          onClick={() => setMobileDrawer("tools")}
          className="flex flex-col items-center justify-center text-[10px] text-muted hover:text-cyan-400 gap-1"
        >
          <Film className="size-4" />
          <span>Media</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileDrawer("tools")}
          className="flex flex-col items-center justify-center text-[10px] text-muted hover:text-pink-400 gap-1"
        >
          <Music className="size-4" />
          <span>Audio</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileDrawer("tools")}
          className="flex flex-col items-center justify-center text-[10px] text-white/70 hover:text-indigo-400 gap-1"
        >
          <Type className="size-4" />
          <span>Text</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileDrawer("tools")}
          className="flex flex-col items-center justify-center text-[10px] text-white/70 hover:text-amber-400 gap-1"
        >
          <Smile className="size-4" />
          <span>Stickers</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileDrawer("inspector")}
          className={cn(
            "flex flex-col items-center justify-center text-[10px] gap-1",
            hasSelection ? "text-cyan-400 font-bold" : "text-white/70",
          )}
        >
          <Sliders className="size-4" />
          <span>Properties</span>
        </button>
      </div>

      {/* 5. Video Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
