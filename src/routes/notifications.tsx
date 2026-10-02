import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  Flame,
  Heart,
  MessageCircle,
  Sparkles,
  UserPlus,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { playSound } from "@/lib/sounds";
import { useRiff } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({ meta: [{ title: "Notifications & Alerts · RIFF" }] }),
});

function NotificationsPage() {
  const notifications = useRiff((s) => s.notifications);
  const markNotificationRead = useRiff((s) => s.markNotificationRead);
  const clearAllNotifications = useRiff((s) => s.clearAllNotifications);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-5 pb-20">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="accent">Social Activity</Badge>
            {unreadCount > 0 && (
              <span className="rounded-full bg-accent text-black font-black text-[10px] px-2 py-0.5">
                {unreadCount} new
              </span>
            )}
          </div>
          <h1 className="mt-1 font-display text-2xl font-black tracking-tight text-fg">
            Notifications
          </h1>
        </div>

        <Button
          size="sm"
          variant="subtle"
          onClick={() => {
            clearAllNotifications();
            playSound("pop");
          }}
          className="rounded-xl text-xs font-bold"
        >
          Mark all read
        </Button>
      </header>

      {notifications.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-surface/50 p-12 text-center text-muted">
          <Bell className="mx-auto size-8 mb-2 opacity-50" />
          <p className="font-display text-base font-bold text-fg">No notifications yet</p>
          <p className="text-xs mt-1">
            Updates on your post approvals, category points, likes, comments, and follows will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5 rounded-3xl border border-white/10 bg-surface/90 shadow-xl backdrop-blur-xl overflow-hidden">
          {notifications.map((n) => {
            const isUnread = !n.isRead;
            const minutesAgo = Math.max(1, Math.round((Date.now() - n.createdAt) / 60000));
            const timeLabel =
              minutesAgo < 60
                ? `${minutesAgo}m ago`
                : minutesAgo < 1440
                  ? `${Math.floor(minutesAgo / 60)}h ago`
                  : `${Math.floor(minutesAgo / 1440)}d ago`;

            return (
              <li
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={cn(
                  "flex cursor-pointer items-start gap-3.5 p-4 transition-colors hover:bg-raised/70",
                  isUnread && "bg-accent/[0.04]",
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {n.type === "post_approved" && (
                    <div className="grid size-9 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Zap className="size-4 fill-emerald-400" />
                    </div>
                  )}
                  {n.type === "category_changed" && (
                    <div className="grid size-9 place-items-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      <Sparkles className="size-4" />
                    </div>
                  )}
                  {n.type === "featured" && (
                    <div className="grid size-9 place-items-center rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      <Flame className="size-4 fill-orange-400" />
                    </div>
                  )}
                  {n.type === "like" && (
                    <div className="grid size-9 place-items-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <Heart className="size-4 fill-rose-400" />
                    </div>
                  )}
                  {n.type === "comment" && (
                    <div className="grid size-9 place-items-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <MessageCircle className="size-4" />
                    </div>
                  )}
                  {n.type === "follow" && (
                    <div className="grid size-9 place-items-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      <UserPlus className="size-4" />
                    </div>
                  )}
                  {n.type === "post_rejected" && (
                    <div className="grid size-9 place-items-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <XCircle className="size-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-xs font-bold text-fg">{n.title}</p>
                    <span className="text-[10px] text-muted shrink-0 font-mono">{timeLabel}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted leading-relaxed">{n.message}</p>
                </div>

                {isUnread && (
                  <div className="mt-2 size-2 rounded-full bg-accent shrink-0 shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
