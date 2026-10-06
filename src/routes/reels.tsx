import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { ReelViewer } from "@/components/reel-viewer";
import { useRiff } from "@/lib/store";

const reelsSearchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/reels")({
  validateSearch: (search) => reelsSearchSchema.parse(search),
  component: ReelsRoutePage,
  head: () => ({ meta: [{ title: "9:16 Creator Reels · RIFF" }] }),
});

function ReelsRoutePage() {
  const search = Route.useSearch();
  const posts = useRiff((s) => s.posts) || [];
  const demotedPostIds = useRiff((s) => s.demotedPostIds) || [];
  const mutedCategoryIds = useRiff((s) => s.mutedCategoryIds) || [];
  const mutedCreatorHandles = useRiff((s) => s.mutedCreatorHandles) || [];

  // Filter published reels
  const publishedReels = useMemo(() => {
    const safePosts = Array.isArray(posts) ? posts : [];
    const safeDemoted = Array.isArray(demotedPostIds) ? demotedPostIds : [];
    const safeMutedCats = Array.isArray(mutedCategoryIds) ? mutedCategoryIds : [];
    const safeMutedCreators = Array.isArray(mutedCreatorHandles) ? mutedCreatorHandles : [];

    return safePosts.filter((p) => {
      if (!p || p.type !== "reel") return false;
      if (safeDemoted.includes(p.id)) return false;
      const catId = p.approvedCategoryId || p.userSelectedCategoryId || "";
      if (safeMutedCats.includes(catId)) return false;
      if (p.authorHandle && safeMutedCreators.includes(p.authorHandle)) return false;
      return true;
    });
  }, [posts, demotedPostIds, mutedCategoryIds, mutedCreatorHandles]);

  return (
    <div className="h-[calc(100dvh-3.5rem)] md:h-screen w-full bg-bg text-fg">
      <ReelViewer reels={publishedReels} initialPostId={search.id} />
    </div>
  );
}
