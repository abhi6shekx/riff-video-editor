import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { fetchCampaigns, fetchSubmissions, type Campaign, type CampaignSubmission } from "@/lib/services/campaigns";
import { fetchTransactions, fetchWallet, type Wallet, type WalletTransaction } from "@/lib/services/wallet";
import { cn, deadlineLeft, inr } from "@/lib/utils";
import { CheckCircle2, Clock, Film, Filter, Sparkles, TrendingUp, XCircle } from "lucide-react";

export const Route = createFileRoute("/briefs")({
  component: BriefsPage,
  head: () => ({ meta: [{ title: "Campaigns & Briefs · Riff" }] }),
});

function BriefsPage() {
  const { user, profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<CampaignSubmission[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentType, setContentType] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "payout" | "deadline">("payout");

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [camps, subs, wal, transactions] = await Promise.all([
          fetchCampaigns({ contentType, sort }),
          user?.id ? fetchSubmissions({ creatorId: user.id }) : Promise.resolve([]),
          user?.id ? fetchWallet(user.id) : Promise.resolve(null),
          user?.id ? fetchTransactions(user.id) : Promise.resolve([]),
        ]);
        if (mounted) {
          setCampaigns(camps);
          setSubmissions(subs);
          setWallet(wal);
          setTxs(transactions.slice(0, 5));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [user?.id, contentType, sort]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pt-5 pb-16">
      {/* Header Banner */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Monetize</p>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
              Speckit Engine
            </span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Brand Briefs</h1>
          <p className="mt-1 text-sm text-muted">
            Get paid per approved meme or Instagram Reel drop. Real brand budgets, guaranteed payouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/reel-studio"
            search={{ mode: "multitrack" }}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Film className="size-4" />
            <span>Open Video Editor</span>
          </Link>

          <Link
            to="/you"
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5 hover:border-accent/50 transition-colors"
          >
            <div className="text-right">
              <p className="text-[10px] uppercase font-medium tracking-wider text-muted">Available Balance</p>
              <p className="font-display text-xl font-bold tabular-nums text-accent">
                {inr(wallet ? Number(wallet.available_balance) : 1240)}
              </p>
            </div>
            {wallet && Number(wallet.pending_balance) > 0 && (
              <div className="border-l border-border pl-3 text-right">
                <p className="text-[10px] uppercase font-medium tracking-wider text-muted">In Review</p>
                <p className="font-display text-base font-semibold tabular-nums text-muted">
                  {inr(Number(wallet.pending_balance))}
                </p>
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Filter and Sort Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/[0.08] bg-surface/85 p-3.5 backdrop-blur-xl shadow-lg">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 px-2 text-xs font-bold text-muted">
            <Filter className="size-3.5 text-accent" /> Format:
          </span>
          {["all", "meme", "reel", "ugc"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setContentType(type)}
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all ${
                contentType === type
                  ? "bg-accent text-accent-fg shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                  : "bg-raised/70 text-muted hover:text-fg hover:bg-raised"
              }`}
            >
              {type === "all" ? "All Formats" : type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="rounded-xl border border-white/10 bg-raised px-3 py-1.5 text-xs font-bold text-fg focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="payout">💰 Highest Bounty</option>
            <option value="deadline">⏰ Expiring Soon</option>
            <option value="newest">⚡ Newest First</option>
          </select>
        </div>
      </div>

      {/* Campaign Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl border border-white/[0.06] bg-surface/50" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-surface/90 p-12 text-center backdrop-blur-xl">
          <Sparkles className="mx-auto size-8 text-accent mb-2" />
          <h3 className="font-display text-lg font-bold text-fg">No active campaigns found</h3>
          <p className="mt-1 text-xs text-muted">Check back soon or adjust your filter.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {campaigns.map((c) => {
            const userSub = submissions.find((s) => s.campaign_id === c.id);
            const slotsLeft = Math.max(0, c.maximum_creators - c.slots_taken);
            const slotsPct = Math.min(100, Math.round((c.slots_taken / c.maximum_creators) * 100));

            return (
              <div
                key={c.id}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-surface/90 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8)] hover:shadow-cyan-500/10"
              >
                {/* Cover & Badges */}
                <div className="relative h-48 w-full overflow-hidden bg-raised">
                  <img
                    src={c.cover_url || "/memes/cricket.png"}
                    alt={c.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-black/75 backdrop-blur-md border border-accent/40 px-2.5 py-1 text-xs font-black text-accent shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                      {inr(c.reward_per_creator)} / DROP
                    </span>
                    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fg backdrop-blur-md border border-white/10">
                      {c.content_type}
                    </span>
                    {c.campaign_type === "performance" && (
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 backdrop-blur-md">
                        ⚡ Views Bonus
                      </span>
                    )}
                    {c.campaign_type === "competition" && (
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md">
                        🏆 Top-3 Podium
                      </span>
                    )}
                  </div>

                  {/* Submission Status if user participated */}
                  {userSub && (
                    <div className="absolute top-3 right-3">
                      {userSub.status === "approved" && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-md">
                          <CheckCircle2 className="size-3.5" /> Approved · {inr(userSub.payout_amount)}
                        </span>
                      )}
                      {userSub.status === "pending" && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-md">
                          <Clock className="size-3.5" /> In Review
                        </span>
                      )}
                      {userSub.status === "rejected" && (
                        <span className="flex items-center gap-1 rounded-full bg-rose-500/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-md">
                          <XCircle className="size-3.5" /> Rejected
                        </span>
                      )}
                    </div>
                  )}

                  <div className="absolute right-3 bottom-2 left-3 flex items-center justify-between text-xs text-muted">
                    <span className="font-bold text-fg flex items-center gap-1">
                      🏢 {c.brand?.company_name || "Official Brand"}
                    </span>
                    <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      ⏰ {deadlineLeft(c.deadline)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="font-display text-base font-bold leading-snug tracking-tight text-fg group-hover:text-accent transition-colors line-clamp-2">
                    {c.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>

                  {/* Progress & Slots Meter */}
                  <div className="mt-auto pt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted font-medium">
                      <span>
                        Slots taken: <strong className="text-fg">{c.slots_taken}</strong> / {c.maximum_creators}
                      </span>
                      <span className={cn("font-bold", slotsLeft <= 5 ? "text-rose-400 animate-pulse" : "text-amber-400")}>
                        {slotsLeft <= 5 ? `🔥 Only ${slotsLeft} left!` : `${slotsLeft} slots open`}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
                      <div
                        className="h-full bg-gradient-to-r from-accent to-mint transition-all duration-300 rounded-full"
                        style={{ width: `${slotsPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="subtle"
                      className="flex-1 rounded-xl text-xs font-bold border border-white/10"
                      asChild
                    >
                      <Link to="/briefs/$id" params={{ id: c.id }}>
                        View Brief
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 rounded-xl bg-accent text-accent-fg font-black text-xs hover:opacity-90 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all"
                      asChild
                    >
                      <Link to="/studio" search={{ brief: c.id }}>
                        Drop Riff ⚡
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creator Ledger Section */}
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Earnings & Payout Ledger</h2>
            <p className="text-xs text-muted">All approved drop earnings and withdrawal logs are recorded here.</p>
          </div>
          <Button variant="subtle" size="sm" asChild>
            <Link to="/you">View Wallet & Withdraw</Link>
          </Button>
        </div>

        {txs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
            No transactions yet. Complete your first brief drop above to start earning!
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {txs.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-3.5 text-sm">
                <div className="min-w-0 pr-3">
                  <p className="truncate font-medium text-fg">{t.description}</p>
                  <p className="text-[11px] text-muted">
                    {new Date(t.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`tabular-nums font-semibold font-display text-base ${
                    t.amount >= 0 ? "text-accent" : "text-rose-400"
                  }`}
                >
                  {t.amount >= 0 ? `+${inr(t.amount)}` : `-${inr(Math.abs(t.amount))}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
