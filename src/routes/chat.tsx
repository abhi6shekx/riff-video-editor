import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle, MessageSquare, Search, Sparkles, UserCheck } from "lucide-react";
import { PersonMark } from "@/components/person-mark";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PEOPLE } from "@/lib/seed";
import { useRiff } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  component: ChatLayoutPage,
  head: () => ({ meta: [{ title: "Direct Messages · RIFF" }] }),
});

function ChatLayoutPage() {
  const chats = useRiff((s) => s.chats);
  const markChatRead = useRiff((s) => s.markChatRead);
  const [search, setSearch] = useState("");

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isThreadActive = pathname.startsWith("/chat/") && pathname !== "/chat";

  const filteredChats = chats.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase()),
  );

  const ConversationListContent = (
    <div className="flex h-full flex-col">
      <div className="p-4 pb-3 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-black tracking-tight text-fg">Direct Messages</span>
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[9px] font-black text-accent">
              1-on-1
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-raised/50 border-white/10 rounded-xl"
          />
        </div>

        {/* Active Online Creators Horizontal Reel */}
        <div className="mt-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted mb-2">
            Online Creators
          </p>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {PEOPLE.filter((p) => p.id !== "you").map((person) => {
              const active = pathname === `/chat/c-${person.id}`;
              return (
                <Link
                  key={person.id}
                  to="/chat/$id"
                  params={{ id: `c-${person.id}` }}
                  className="flex flex-col items-center gap-1 shrink-0 group"
                >
                  <div className="relative">
                    <PersonMark mark={person.mark} size="sm" />
                    <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-400 border border-black" />
                  </div>
                  <span
                    className={cn(
                      "text-[9px] truncate max-w-[50px] transition-colors",
                      active ? "text-accent font-bold" : "text-muted group-hover:text-fg",
                    )}
                  >
                    {person.name.split(" ")[0]}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conversation Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted h-64">
            <div className="size-12 rounded-2xl bg-raised flex items-center justify-center text-muted mb-3 border border-border">
              <MessageSquare className="size-5 opacity-50 text-accent" />
            </div>
            <p className="text-xs font-bold text-fg">No messages yet</p>
            <p className="text-[11px] text-muted mt-1 max-w-[200px]">
              Tap any creator above to send a direct message or share a reel edit!
            </p>
          </div>
        ) : (
          filteredChats.map((c) => {
            const hasUnread = (c.unread || 0) > 0;
            const active = pathname === `/chat/${c.id}`;
            const minutesAgo = Math.max(1, Math.round((Date.now() - c.lastAt) / 60000));
            const timeLabel =
              minutesAgo < 60
                ? `${minutesAgo}m`
                : minutesAgo < 1440
                  ? `${Math.floor(minutesAgo / 60)}h`
                  : `${Math.floor(minutesAgo / 1440)}d`;

            return (
              <Link
                key={c.id}
                to="/chat/$id"
                params={{ id: c.id }}
                onClick={() => markChatRead(c.id)}
                className={cn(
                  "flex items-center gap-3 p-3.5 transition-colors text-left",
                  active
                    ? "bg-accent/10 border-l-2 border-l-accent"
                    : hasUnread
                      ? "bg-white/[0.03] hover:bg-raised/60"
                      : "hover:bg-raised/40",
                )}
              >
                <div className="relative shrink-0">
                  <PersonMark mark={c.mark as any} size="sm" />
                  <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-400 border border-black" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p
                      className={cn(
                        "text-xs truncate",
                        active ? "font-black text-accent" : hasUnread ? "font-bold text-fg" : "font-semibold text-fg/90",
                      )}
                    >
                      {c.name}
                    </p>
                    <span className="text-[9px] text-muted font-mono">{timeLabel}</span>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-[11px]",
                      hasUnread ? "font-bold text-fg" : "text-muted",
                    )}
                  >
                    {c.lastMessage}
                  </p>
                </div>

                {hasUnread && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-black text-black shrink-0">
                    {c.unread}
                  </span>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="h-dvh w-full overflow-hidden bg-bg">
      {/* 1. Mobile Viewport: Switch between list and thread */}
      <div className="h-full md:hidden">
        {isThreadActive ? (
          <Outlet />
        ) : (
          <div className="h-full pt-2 pb-16">{ConversationListContent}</div>
        )}
      </div>

      {/* 2. Desktop Viewport: Split-pane Instagram / Messenger Web layout */}
      <div className="hidden h-full md:flex">
        {/* Left Column: Conversation List */}
        <aside className="w-80 border-r border-white/10 bg-surface/70 backdrop-blur-xl shrink-0 flex flex-col h-full">
          {ConversationListContent}
        </aside>

        {/* Right Column: Active Thread via Outlet OR Empty Placeholder */}
        <main className="flex-1 h-full overflow-hidden flex flex-col bg-bg">
          {isThreadActive ? (
            <Outlet />
          ) : (
            <div className="grid h-full place-items-center p-8 text-center">
              <div className="max-w-sm space-y-3">
                <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-accent/10 border border-accent/20 text-accent shadow-[0_0_20px_rgba(0,240,255,0.15)]">
                  <MessageCircle className="size-8" />
                </div>
                <h2 className="font-display text-lg font-black text-fg">Your Messages</h2>
                <p className="text-xs text-muted leading-relaxed">
                  Send memes, private messages, and collaborate with creators directly on RIFF. Select a
                  conversation from the list on the left to begin.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
