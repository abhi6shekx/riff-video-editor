import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ImageIcon, Send, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PersonMark } from "@/components/person-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHATS, PEOPLE, TEMPLATES, YOU_ID } from "@/lib/seed";
import { playSound } from "@/lib/sounds";
import { useRiff } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat/$id")({
  component: ThreadPage,
  head: () => ({ meta: [{ title: "Direct Chat · RIFF" }] }),
});

function ThreadPage() {
  const { id } = Route.useParams();
  const allChats = useRiff((s) => s.chats);
  const allMessages = useRiff((s) => s.messages);
  const sendTextMessage = useRiff((s) => s.sendTextMessage);
  const sendMemeMessage = useRiff((s) => s.sendMemeMessage);
  const markChatRead = useRiff((s) => s.markChatRead);

  // Match chat by id, or match person if id is c-<personId>
  const personId = id.startsWith("c-") ? id.replace("c-", "") : id;
  const person = PEOPLE.find((p) => p.id === personId || p.handle === personId);

  const chat =
    allChats.find((c) => c.id === id) ||
    CHATS.find((c) => c.id === id) || {
      id,
      name: person ? person.name : "Direct Message",
      subtitle: person ? `@${person.handle}` : "@creator",
      mark: (person?.mark || "kabir") as any,
    };

  const messages = allMessages.filter((m) => m.chatId === id);

  const [text, setText] = useState("");
  const [showMemePicker, setShowMemePicker] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markChatRead(id);
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [id, messages.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    sendTextMessage(id, text.trim());
    setText("");
    playSound("pop");
  }

  function handleSendMeme(src: string) {
    sendMemeMessage(id, src);
    setShowMemePicker(false);
    playSound("pop");
  }

  return (
    <div className="flex h-full w-full flex-col bg-bg overflow-hidden">
      {/* Thread Header */}
      <header className="flex h-14 items-center justify-between border-b border-white/10 bg-surface/90 px-4 backdrop-blur-xl shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            to="/chat"
            className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-fg transition-colors md:hidden"
            title="Back to Conversations"
          >
            <ChevronLeft className="size-5" />
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <PersonMark mark={chat.mark as any} size="sm" />
              <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-400 border border-black" />
            </div>
            <div>
              <p className="font-display text-xs font-bold text-fg leading-tight">{chat.name}</p>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-muted font-mono">{chat.subtitle}</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">Online</span>
              </div>
            </div>
          </div>
        </div>

        <Link
          to="/you"
          className="text-[11px] font-bold text-accent hover:underline px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors"
        >
          View Profile
        </Link>
      </header>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-xs text-muted">
            <div className="space-y-1">
              <p className="font-bold text-fg">Direct chat with {chat.name}</p>
              <p className="text-[11px]">Say hi or send a meme to start the riff!</p>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.authorId === YOU_ID;
            return (
              <div
                key={m.id}
                className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}
              >
                {!isMe && <PersonMark mark={chat.mark as any} size="sm" />}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm",
                    isMe
                      ? "rounded-br-sm bg-gradient-to-tr from-accent to-mint text-black font-semibold shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                      : "rounded-bl-sm bg-surface border border-white/10 text-fg",
                  )}
                >
                  {m.kind === "text" && <p>{m.text}</p>}
                  {m.kind === "meme" && m.text && (
                    <div className="overflow-hidden rounded-xl border border-black/20">
                      <img src={m.text} alt="Meme" className="w-48 rounded-xl object-cover" />
                    </div>
                  )}
                  <span
                    className={cn(
                      "block text-[9px] mt-1 text-right",
                      isMe ? "text-black/60" : "text-muted",
                    )}
                  >
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Meme Attachment Drawer */}
      {showMemePicker && (
        <div className="border-t border-white/10 bg-surface/95 p-3 backdrop-blur-xl animate-in slide-in-from-bottom-2 shrink-0">
          <div className="flex items-center justify-between pb-2 text-[11px] font-bold text-muted">
            <span>Send Meme Asset</span>
            <button
              type="button"
              onClick={() => setShowMemePicker(false)}
              className="text-xs hover:text-fg text-muted"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleSendMeme(tmpl.src)}
                className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/10 hover:border-accent transition-all"
              >
                <img src={tmpl.src} alt={tmpl.label} className="size-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-white/10 bg-surface/90 p-3 backdrop-blur-xl shrink-0"
      >
        <button
          type="button"
          onClick={() => setShowMemePicker(!showMemePicker)}
          className="flex size-9 items-center justify-center rounded-xl text-muted hover:bg-raised hover:text-accent transition-colors"
          title="Send Meme"
        >
          <ImageIcon className="size-5" />
        </button>

        <Input
          placeholder={`Message ${chat.name}...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-10 text-xs bg-raised/50 border-white/10 rounded-2xl flex-1"
        />

        <Button
          type="submit"
          size="sm"
          disabled={!text.trim()}
          className="size-10 rounded-2xl bg-accent text-black font-bold p-0 disabled:opacity-40 hover:opacity-95 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
