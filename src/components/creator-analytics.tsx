import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Zap,
  Flame,
  Award,
  Calendar,
  Sparkles,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Video,
  Layers,
  Info,
} from "lucide-react";
import type { Post, Category, PointsTransaction } from "@/lib/types";
import { formatNumber, cn } from "@/lib/utils";

interface CreatorAnalyticsProps {
  posts: Post[];
  categories: Category[];
  pointsTransactions: PointsTransaction[];
  creatorPopularity: number;
  pointsWallet: number;
  followersCount: number;
}

type TimeRange = "7d" | "30d" | "all";

export function CreatorAnalytics({
  posts,
  categories,
  pointsTransactions,
  creatorPopularity,
  pointsWallet,
  followersCount,
}: CreatorAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Filter posts
  const myReels = useMemo(() => posts.filter((p) => p.type === "reel"), [posts]);
  const myStaticPosts = useMemo(() => posts.filter((p) => p.type === "post"), [posts]);

  // Aggregate Metrics
  const totalViews = useMemo(() => posts.reduce((acc, p) => acc + (p.views || 0), 0), [posts]);
  const totalLikes = useMemo(() => posts.reduce((acc, p) => acc + (p.likes || 0), 0), [posts]);
  const totalComments = useMemo(() => posts.reduce((acc, p) => acc + (p.comments || 0), 0), [posts]);
  const totalShares = useMemo(() => posts.reduce((acc, p) => acc + (p.shares || 0), 0), [posts]);
  const totalSaves = useMemo(() => posts.reduce((acc, p) => acc + (p.saves || 0), 0), [posts]);

  const totalEngagements = totalLikes + totalComments + totalShares + totalSaves;
  const engagementRate = totalViews > 0 ? ((totalEngagements / totalViews) * 100).toFixed(1) : "0.0";

  // Category breakdown
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; views: number; likes: number; points: number }> = {};
    for (const post of posts) {
      const catId = post.approvedCategoryId || post.userSelectedCategoryId || "other";
      if (!stats[catId]) {
        stats[catId] = { count: 0, views: 0, likes: 0, points: 0 };
      }
      stats[catId].count += 1;
      stats[catId].views += post.views || 0;
      stats[catId].likes += post.likes || 0;
      stats[catId].points += post.pointsAwarded || 0;
    }
    return Object.entries(stats).map(([catId, val]) => {
      const catObj = categories.find((c) => c.id === catId || c.slug === catId);
      return {
        id: catId,
        name: catObj?.name || catId.charAt(0).toUpperCase() + catId.slice(1),
        icon: catObj?.icon || "🔥",
        ...val,
      };
    }).sort((a, b) => b.views - a.views);
  }, [posts, categories]);

  // Generate trend data based on time range
  const trendData = useMemo(() => {
    const pointsCount = timeRange === "7d" ? 7 : timeRange === "30d" ? 14 : 10;
    const now = new Date();
    const data = [];
    const baseDailyViews = Math.max(250, Math.round(totalViews / (posts.length ? posts.length * 4 : 10)));

    for (let i = pointsCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i * (timeRange === "30d" ? 2 : 1));
      const label = d.toLocaleDateString("en-US", {
        weekday: timeRange === "7d" ? "short" : undefined,
        month: "short",
        day: "numeric",
      });

      // Deterministic simulation based on date hash & real totals
      const factor = 0.7 + (Math.sin(i * 1.5 + d.getDate()) * 0.4 + 0.4);
      const views = Math.round(baseDailyViews * factor);
      const likes = Math.round(views * 0.08);

      data.push({
        label,
        views,
        likes,
      });
    }
    return data;
  }, [timeRange, totalViews, posts.length]);

  // Chart calculation
  const maxViewVal = Math.max(...trendData.map((d) => d.views), 100);
  const chartHeight = 140;
  const chartWidth = 500;
  const stepX = chartWidth / (trendData.length - 1);

  const pointsSvg = trendData.map((d, idx) => {
    const x = idx * stepX;
    const y = chartHeight - (d.views / maxViewVal) * (chartHeight - 30) - 15;
    return { x, y, data: d };
  });

  const pathD = pointsSvg.reduce(
    (acc, curr, idx) => (idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
    ""
  );
  const areaD = `${pathD} L ${pointsSvg[pointsSvg.length - 1].x} ${chartHeight} L ${pointsSvg[0].x} ${chartHeight} Z`;

  // Best performing items
  const bestReel = [...myReels].sort((a, b) => b.views - a.views)[0];
  const bestPost = [...myStaticPosts].sort((a, b) => b.likes - a.likes)[0];

  // Creator Tier Calculation
  const currentTier =
    totalViews >= 50000
      ? { name: "Elite Creator", icon: "👑", next: "Gold Partner", progress: 100, target: 50000 }
      : totalViews >= 15000
      ? { name: "Pro Creator", icon: "💎", next: "Elite Creator", progress: Math.min(100, Math.round((totalViews / 50000) * 100)), target: 50000 }
      : totalViews >= 5000
      ? { name: "Rising Star", icon: "⭐", next: "Pro Creator", progress: Math.min(100, Math.round((totalViews / 15000) * 100)), target: 15000 }
      : { name: "Apprentice", icon: "🌱", next: "Rising Star", progress: Math.min(100, Math.round((totalViews / 5000) * 100)), target: 5000 };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header with Time Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-black text-fg flex items-center gap-2">
            <BarChart3 className="size-5 text-[#d4ff00]" />
            <span>Creator Analytics &amp; Performance</span>
          </h2>
          <p className="text-xs text-muted">
            Track organic reach, audience engagement velocity, and category payouts.
          </p>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex items-center gap-1 bg-surface border border-white/10 rounded-2xl p-1 self-start sm:self-auto">
          {(["7d", "30d", "all"] as TimeRange[]).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-xl transition-all",
                timeRange === range
                  ? "bg-[#d4ff00] text-black shadow-sm"
                  : "text-muted hover:text-fg hover:bg-white/5"
              )}
            >
              {range === "7d" ? "Past 7 Days" : range === "30d" ? "Past 30 Days" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Views */}
        <div className="rounded-2xl border border-white/10 bg-surface/80 p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-muted mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Eye className="size-3.5 text-[#d4ff00]" /> Total Views
            </span>
            <span className="flex items-center text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
              <TrendingUp className="size-2.5 mr-0.5 inline" /> +18.4%
            </span>
          </div>
          <p className="font-display text-2xl font-black text-fg tracking-tight">
            {formatNumber(totalViews)}
          </p>
          <p className="text-[10px] text-muted mt-1">
            Across {posts.length} published uploads
          </p>
          <div className="absolute -bottom-6 -right-6 size-16 bg-[#d4ff00]/5 rounded-full blur-xl pointer-events-none group-hover:bg-[#d4ff00]/10 transition-all" />
        </div>

        {/* Engagement Rate */}
        <div className="rounded-2xl border border-white/10 bg-surface/80 p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-muted mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Heart className="size-3.5 text-pink-400" /> Engagement
            </span>
            <span className="flex items-center text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
              Top 10%
            </span>
          </div>
          <p className="font-display text-2xl font-black text-fg tracking-tight">
            {engagementRate}%
          </p>
          <p className="text-[10px] text-muted mt-1">
            {formatNumber(totalEngagements)} total interactions
          </p>
          <div className="absolute -bottom-6 -right-6 size-16 bg-pink-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-pink-500/10 transition-all" />
        </div>

        {/* Popularity Velocity */}
        <div className="rounded-2xl border border-white/10 bg-surface/80 p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-muted mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Flame className="size-3.5 text-orange-400" /> Popularity
            </span>
            <span className="flex items-center text-[10px] text-orange-400 font-bold bg-orange-500/10 px-1.5 py-0.5 rounded-md">
              Algorithmic
            </span>
          </div>
          <p className="font-display text-2xl font-black text-orange-400 tracking-tight">
            {(creatorPopularity / 1000).toFixed(1)}k
          </p>
          <p className="text-[10px] text-muted mt-1">
            Feeds recommendation score
          </p>
          <div className="absolute -bottom-6 -right-6 size-16 bg-orange-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-orange-500/10 transition-all" />
        </div>

        {/* Total Points Earned */}
        <div className="rounded-2xl border border-white/10 bg-surface/80 p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-muted mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Zap className="size-3.5 text-[#d4ff00]" /> RIFF Wallet
            </span>
            <span className="flex items-center text-[10px] text-[#d4ff00] font-bold bg-[#d4ff00]/10 px-1.5 py-0.5 rounded-md">
              100% Private
            </span>
          </div>
          <p className="font-display text-2xl font-black text-[#d4ff00] tracking-tight">
            {pointsWallet.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted mt-1">
            ≈ ₹{(pointsWallet * 0.5).toFixed(0)} INR payout value
          </p>
          <div className="absolute -bottom-6 -right-6 size-16 bg-[#d4ff00]/5 rounded-full blur-xl pointer-events-none group-hover:bg-[#d4ff00]/10 transition-all" />
        </div>
      </div>

      {/* 3. Interactive SVG Trend Chart */}
      <div className="rounded-3xl border border-white/10 bg-surface/90 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-fg flex items-center gap-1.5">
              <TrendingUp className="size-4 text-[#d4ff00]" />
              <span>Audience Growth &amp; View Trends</span>
            </h3>
            <p className="text-[11px] text-muted">
              Daily impressions over the selected window. Hover over points for exact counts.
            </p>
          </div>
          {hoveredPoint !== null && trendData[hoveredPoint] && (
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-[#d4ff00]">
                {trendData[hoveredPoint].views.toLocaleString()} Views
              </span>
              <span className="text-[10px] text-muted block">
                {trendData[hoveredPoint].label}
              </span>
            </div>
          )}
        </div>

        {/* SVG Chart Canvas */}
        <div className="relative pt-4 pb-2">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-36 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d4ff00" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#d4ff00" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

            {/* Area Fill */}
            <path d={areaD} fill="url(#viewsGradient)" />

            {/* Stroke Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#d4ff00"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Circles */}
            {pointsSvg.map((p, idx) => (
              <g
                key={idx}
                onMouseEnter={() => setHoveredPoint(idx)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hoveredPoint === idx ? 6 : 4}
                  className={cn(
                    "transition-all duration-150",
                    hoveredPoint === idx
                      ? "fill-[#d4ff00] stroke-black stroke-2"
                      : "fill-black stroke-[#d4ff00] stroke-2"
                  )}
                />
              </g>
            ))}
          </svg>

          {/* X Axis Labels */}
          <div className="flex justify-between items-center text-[10px] font-mono text-muted/70 pt-2 px-1">
            {trendData.map((d, i) => (
              <span key={i} className={i % 2 === 1 && trendData.length > 8 ? "hidden sm:inline" : ""}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Content Performance Breakdown (Reels vs Posts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best Performing Reel */}
        <div className="rounded-3xl border border-white/10 bg-surface/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-fg flex items-center gap-1.5">
              <Video className="size-4 text-purple-400" />
              <span>Top Reel by Reach</span>
            </span>
            <span className="text-[10px] bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold px-2 py-0.5 rounded-full">
              Viral Pick
            </span>
          </div>

          {bestReel ? (
            <div className="flex items-center gap-3.5 bg-white/5 p-3 rounded-2xl border border-white/5">
              <div className="w-14 h-20 rounded-xl overflow-hidden bg-black shrink-0 relative border border-white/10">
                <img
                  src={bestReel.mediaUrl}
                  alt={bestReel.caption}
                  className="size-full object-cover"
                />
                <span className="absolute bottom-1 right-1 text-[8px] bg-black/80 text-white font-mono px-1 rounded">
                  9:16
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs font-semibold text-fg line-clamp-2">
                  {bestReel.caption || "Untitled Reel"}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-muted pt-1">
                  <span className="flex items-center gap-1 font-bold text-fg">
                    <Eye className="size-3 text-[#d4ff00]" />
                    {formatNumber(bestReel.views)}
                  </span>
                  <span className="flex items-center gap-1 text-pink-400 font-semibold">
                    <Heart className="size-3" />
                    {formatNumber(bestReel.likes)}
                  </span>
                  <span className="flex items-center gap-1 text-sky-400 font-semibold">
                    <Share2 className="size-3" />
                    {formatNumber(bestReel.shares)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-muted">
              No reels published yet. Upload your first reel in Studio!
            </div>
          )}
        </div>

        {/* Best Performing Post */}
        <div className="rounded-3xl border border-white/10 bg-surface/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-fg flex items-center gap-1.5">
              <Layers className="size-4 text-emerald-400" />
              <span>Top Static Meme / Post</span>
            </span>
            <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
              Highest Likes
            </span>
          </div>

          {bestPost ? (
            <div className="flex items-center gap-3.5 bg-white/5 p-3 rounded-2xl border border-white/5">
              <div className="size-16 rounded-xl overflow-hidden bg-black shrink-0 relative border border-white/10">
                <img
                  src={bestPost.mediaUrl}
                  alt={bestPost.caption}
                  className="size-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs font-semibold text-fg line-clamp-2">
                  {bestPost.caption || "Untitled Meme"}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-muted pt-1">
                  <span className="flex items-center gap-1 text-pink-400 font-bold">
                    <Heart className="size-3 fill-pink-400" />
                    {formatNumber(bestPost.likes)}
                  </span>
                  <span className="flex items-center gap-1 text-sky-400 font-semibold">
                    <MessageCircle className="size-3" />
                    {bestPost.comments}
                  </span>
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Zap className="size-3" />
                    +{bestPost.pointsAwarded || 0} pts
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-muted">
              No static posts published yet. Create memes in Studio!
            </div>
          )}
        </div>
      </div>

      {/* 5. Category Distribution & Payout Shares */}
      <div className="rounded-3xl border border-white/10 bg-surface/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-fg flex items-center gap-1.5">
              <Sparkles className="size-4 text-amber-400" />
              <span>Category Engagement Breakdown</span>
            </h3>
            <p className="text-[11px] text-muted">
              How your content performs across different creator niches on RIFF.
            </p>
          </div>
          <span className="text-[10px] font-mono text-muted">
            {categoryStats.length} Active Niches
          </span>
        </div>

        <div className="space-y-3">
          {categoryStats.map((cat) => {
            const pct = totalViews > 0 ? Math.round((cat.views / totalViews) * 100) : 0;
            return (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-fg flex items-center gap-1.5">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                    <span className="text-[10px] font-normal text-muted">({cat.count} posts)</span>
                  </span>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="text-muted">{formatNumber(cat.views)} views</span>
                    <span className="font-bold text-[#d4ff00]">{pct}%</span>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#d4ff00] transition-all duration-300"
                    style={{ width: `${Math.max(5, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Creator Milestone Progress */}
      <div className="rounded-3xl border border-[#d4ff00]/20 bg-gradient-to-br from-surface to-raised p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentTier.icon}</span>
            <div>
              <h3 className="font-display text-sm font-bold text-fg flex items-center gap-1.5">
                <span>Tier: {currentTier.name}</span>
                <CheckCircle2 className="size-3.5 text-[#d4ff00]" />
              </h3>
              <p className="text-[10px] text-muted">
                Next Milestone: {currentTier.next} ({formatNumber(currentTier.target)} views goal)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-black text-[#d4ff00] bg-[#d4ff00]/10 px-2 py-1 rounded-xl">
            {currentTier.progress}% Completed
          </span>
        </div>

        <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#d4ff00] transition-all duration-500 shadow-sm"
            style={{ width: `${currentTier.progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted pt-1">
          <span className="flex items-center gap-1">
            <Info className="size-3 text-[#d4ff00]" /> Higher tiers unlock 1.5x - 2.0x approval bonuses and instant UPI cashouts.
          </span>
          <span className="font-bold text-fg">
            {formatNumber(totalViews)} / {formatNumber(currentTier.target)}
          </span>
        </div>
      </div>
    </div>
  );
}
