import { createFileRoute, Link } from "@tanstack/react-router";
import { MemeCard } from "@/components/meme-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRIEFS, CHATS, HUBS } from "@/lib/seed";
import { useMemes, useRiff } from "@/lib/store";
import { deadlineLeft, inr } from "@/lib/utils";

export const Route = createFileRoute("/hubs/$id")({
  component: HubPage,
  head: () => ({ meta: [{ title: "Hub · Riff" }] }),
});

function HubPage() {
  const { id } = Route.useParams();
  const hub = HUBS.find((h) => h.id === id);
  const memes = useMemes().filter((m) => m.hubId === id);
  const joined = useRiff((s) => s.joinedHubIds.includes(id));
  const toggle = useRiff((s) => s.toggleHub);
  const briefs = BRIEFS.filter((b) => b.hubId === id);
  const room = CHATS.find((c) => c.kind === "hub" && c.name === hub?.name);

  if (!hub) {
    return (
      <main className="p-8 text-center text-muted">
        Hub missing. <Link to="/hubs">Back</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-10">
      <div className="relative -mx-4 mb-5 h-48 overflow-hidden sm:mx-0 sm:mt-4 sm:rounded-2xl">
        <img src={hub.cover} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        <div className="absolute right-4 bottom-4 left-4">
          <Badge>{hub.category}</Badge>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{hub.name}</h1>
          <p className="mt-1 max-w-md text-sm text-muted">{hub.bio}</p>
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant={joined ? "outline" : "default"} onClick={() => toggle(hub.id)}>
          {joined ? "Joined" : "Join room"}
        </Button>
        <Button variant="subtle" asChild>
          <Link to="/studio">Riff here</Link>
        </Button>
        {room ? (
          <Button variant="ghost" asChild>
            <Link to="/chat/$id" params={{ id: room.id }}>
              Open chat
            </Link>
          </Button>
        ) : null}
      </div>
      {briefs.length ? (
        <section className="mb-6">
          <h2 className="mb-3 font-display text-lg font-semibold">Paying now</h2>
          <div className="grid gap-2">
            {briefs.map((b) => (
              <Link
                key={b.id}
                to="/briefs/$id"
                params={{ id: b.id }}
                className="rounded-xl border border-border bg-surface px-4 py-3"
              >
                <p className="text-sm font-medium">{b.title}</p>
                <p className="text-xs text-muted">
                  {inr(b.prize)} · {deadlineLeft(b.deadline)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <div className="grid gap-5">
        {memes.map((m) => (
          <MemeCard key={m.id} meme={m} />
        ))}
      </div>
    </main>
  );
}
