import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Flame, Sparkles, TrendingUp, Zap } from "lucide-react";
import { inr } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: "payout" | "drop" | "tier" | "brief";
  icon: string;
  text: string;
  highlight: string;
  time: string;
  link?: string;
}

const ACTIVITIES: ActivityItem[] = [
  {
    id: "a1",
    type: "payout",
    icon: "💰",
    text: "paid out to @kabir on #SneakerDrop",
    highlight: "₹1,800",
    time: "2m ago",
    link: "/briefs",
  },
  {
    id: "a2",
    type: "drop",
    icon: "🔥",
    text: "dropped viral reel in #CricketHub (12.4k views)",
    highlight: "@rohan.riffs",
    time: "4m ago",
    link: "/hubs",
  },
  {
    id: "a3",
    type: "tier",
    icon: "👑",
    text: "leveled up to Tier 4 Verified Pro (1.5x payout)",
    highlight: "@priya_vibes",
    time: "7m ago",
    link: "/you",
  },
  {
    id: "a4",
    type: "payout",
    icon: "⚡",
    text: "instant UPI credit to @sharma_ji on #FoodBrief",
    highlight: "₹2,400",
    time: "11m ago",
    link: "/briefs",
  },
  {
    id: "a5",
    type: "brief",
    icon: "🏆",
    text: "Pitchside Riff-Off duel active: ₹25,000 top prize",
    highlight: "LIVE CONTEST",
    time: "Now",
    link: "/briefs",
  },
];

export function LiveActivityTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % ACTIVITIES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const current = ACTIVITIES[index];

  return (
    <div className="relative overflow-hidden rounded-xl border border-accent/25 bg-surface/90 px-3.5 py-2 backdrop-blur-xl shadow-[0_0_20px_-8px_rgba(0,240,255,0.25)] transition-all">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Pulsing Radar Dot */}
          <span className="relative flex size-2 shrink-0">
            <span className="radar-pulse absolute inline-flex size-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>

          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-accent shrink-0">
            Live Ticker
          </span>

          {/* Dynamic Event */}
          <div key={current.id} className="min-w-0 flex-1 truncate transition-opacity duration-300">
            <span className="mr-1">{current.icon}</span>
            <span className="font-bold text-accent">{current.highlight}</span>{" "}
            <span className="text-muted">{current.text}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-[11px] text-faint">
          <span>{current.time}</span>
          {current.link && (
            <Link to={current.link} className="text-muted hover:text-accent flex items-center">
              <ArrowUpRight className="size-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
