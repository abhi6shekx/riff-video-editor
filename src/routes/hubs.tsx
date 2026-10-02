import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { HUBS } from "@/lib/seed";
import { useRiff } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hubs")({
  component: HubsPage,
  head: () => ({ meta: [{ title: "Hubs · Riff" }] }),
});

function HubsPage() {
  const joined = useRiff((s) => s.joinedHubIds);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-5 pb-10">
      <header className="mb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">Rooms</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Hubs</h1>
        <p className="mt-1 max-w-md text-sm text-muted">
          Fandoms with a brief attached. Join a room, riff in public, get pulled into paid work.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {HUBS.map((h) => {
          const on = joined.includes(h.id);
          return (
            <Link
              key={h.id}
              to="/hubs/$id"
              params={{ id: h.id }}
              className="group overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="relative h-36">
                <img src={h.cover} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-bg/90 to-transparent" />
                <div className="absolute right-3 bottom-3 left-3">
                  <Badge tone={on ? "accent" : "muted"}>{on ? "Joined" : h.tag}</Badge>
                  <h2 className="mt-1 font-display text-xl font-semibold">{h.name}</h2>
                </div>
              </div>
              <p className="px-4 py-3 text-sm text-muted">{h.bio}</p>
              <p className="px-4 pb-4 text-xs text-faint tabular-nums">
                {h.members.toLocaleString("en-IN")} in the room
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
