import { createFileRoute } from "@tanstack/react-router";
import { CreateContent } from "../components/create/CreateContent";

export const Route = createFileRoute("/create")({
  component: CreatePage,
  head: () => ({ meta: [{ title: "Create on RIFF · Post or Reel" }] }),
});

function CreatePage() {
  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <CreateContent />
    </main>
  );
}
