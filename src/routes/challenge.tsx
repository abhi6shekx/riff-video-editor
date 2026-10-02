import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/challenge")({
  component: ChallengeRedirectPage,
  head: () => ({
    meta: [{ title: "Meme Challenges · Studio" }],
  }),
});

function ChallengeRedirectPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/briefs" });
  }, [navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0d1017] text-white">
      <div className="text-center">
        <div className="size-8 mx-auto border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-white/70">Loading Meme Challenges...</p>
      </div>
    </div>
  );
}
