import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ReelEditor } from "../components/reel-editor/ReelEditor";
import { VideoEditorWorkspace } from "@/components/video-editor/VideoEditorWorkspace";

export type ReelStudioSearch = {
  mode?: "quick" | "multitrack";
};

export const Route = createFileRoute("/reel-studio")({
  validateSearch: (search: Record<string, unknown>): ReelStudioSearch => ({
    mode: search.mode === "multitrack" ? "multitrack" : "quick",
  }),
  component: ReelStudioPage,
  head: () => ({
    meta: [{ title: "Create Reel · Video Studio" }],
  }),
});

function ReelStudioPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const currentMode = search.mode === "multitrack" ? "multitrack" : "quick";

  const handleToggleMode = (newMode: "quick" | "multitrack") => {
    void navigate({
      to: "/reel-studio",
      search: { mode: newMode },
      replace: true,
    });
  };

  return currentMode === "multitrack" ? (
    <VideoEditorWorkspace onSwitchMode={() => handleToggleMode("quick")} />
  ) : (
    <ReelEditor onSwitchToMultiTrack={() => handleToggleMode("multitrack")} />
  );
}
