import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FolderPlus,
  Instagram,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import {
  createCampaign,
  fetchCampaigns,
  fetchSubmissions,
  reviewSubmission,
  type Campaign,
  type CampaignSubmission,
} from "@/lib/services/campaigns";
import { uploadMedia } from "@/lib/supabase";
import { inr } from "@/lib/utils";
import { toast } from "sonner";
import { playSound } from "@/lib/sounds";

const CATEGORIES = [
  { id: "cat_relatable", name: "Relatable", icon: "😂" },
  { id: "cat_dark", name: "Dark Humor", icon: "💀" },
  { id: "cat_gaming", name: "Gaming", icon: "🎮" },
  { id: "cat_sports", name: "Sports & Cricket", icon: "🏏" },
  { id: "cat_tech", name: "Tech & Code", icon: "💻" },
  { id: "cat_genz", name: "Gen-Z & Pop", icon: "📱" },
  { id: "cat_india", name: "Desi & Bollywood", icon: "🌍" },
  { id: "cat_corp", name: "Corporate 9-to-5", icon: "🏢" },
  { id: "cat_trending", name: "Trending Now", icon: "🔥" },
  { id: "cat_creative", name: "Creative & Art", icon: "🎨" },
];

const CREATOR_TIERS = [
  { id: "new", name: "All Creators (Newbie+)", badge: "Open to All" },
  { id: "rising", name: "Tier 2: Rising Creator+", badge: "Rising 2+" },
  { id: "active", name: "Tier 3: Active Creator+", badge: "Active 3+" },
  { id: "verified", name: "Tier 4: Verified Pro+", badge: "Verified 4+" },
  { id: "top", name: "Tier 5: Top Creator+", badge: "Top 5+" },
  { id: "elite", name: "Tier 6: Elite Master Only", badge: "Elite Only" },
];

const CAMPAIGN_TYPES = [
  {
    id: "fixed_reward",
    name: "Fixed Payout",
    desc: "Standard bounty credited immediately upon review approval",
    icon: "💰",
  },
  {
    id: "performance",
    name: "Performance Bonus",
    desc: "Base payout + dynamic bonus on verified viral views & likes",
    icon: "⚡",
  },
  {
    id: "competition",
    name: "Ranked Competition",
    desc: "Top 3 highest ranking creator submissions take podium prizes",
    icon: "🏆",
  },
  {
    id: "brand_challenge",
    name: "Brand Challenge",
    desc: "Targeted cultural challenge with creator multiplier bonuses",
    icon: "🔥",
  },
];

export const Route = createFileRoute("/brand")({
  component: BrandDashboardPage,
  head: () => ({ meta: [{ title: "Brand Dashboard · Riff" }] }),
});

function BrandDashboardPage() {
  const { user, profile, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"campaigns" | "submissions" | "create">("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<CampaignSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Reviewing modal state
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Campaign creation form state
  const [newTitle, setNewTitle] = useState("");
  const [newObjective, setNewObjective] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newContentType, setNewContentType] = useState<"meme" | "reel" | "ugc">("meme");
  const [newCategory, setNewCategory] = useState("cat_relatable");
  const [newCampaignType, setNewCampaignType] = useState<"fixed_reward" | "performance" | "competition" | "brand_challenge">("fixed_reward");
  const [newMinTier, setNewMinTier] = useState<"new" | "rising" | "active" | "verified" | "top" | "elite">("new");
  const [newBudget, setNewBudget] = useState(50000);
  const [newReward, setNewReward] = useState(1000);
  const [newPrizeFirst, setNewPrizeFirst] = useState(25000);
  const [newPrizeSecond, setNewPrizeSecond] = useState(15000);
  const [newPrizeThird, setNewPrizeThird] = useState(10000);
  const [newMaxCreators, setNewMaxCreators] = useState(50);
  const [newDeadline, setNewDeadline] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
  );
  const [newDos, setNewDos] = useState("Keep it relatable\nUse crisp typography\nAlign with brand palette");
  const [newDonts, setNewDonts] = useState("No competitor mentions\nNo derogatory or offensive content");
  const [newHashtags, setNewHashtags] = useState("#RiffBrand #Drop");
  const [newMentions, setNewMentions] = useState("@brand.official");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadBrandData() {
      setLoading(true);
      try {
        const [camps, subs] = await Promise.all([
          fetchCampaigns({ status: "all" }),
          fetchSubmissions({ status: "all" }),
        ]);
        if (mounted) {
          setCampaigns(camps);
          setSubmissions(subs);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadBrandData();
    return () => {
      mounted = false;
    };
  }, []);

  // Quick switch role if testing as creator
  async function upgradeToBrandRole() {
    try {
      await updateProfile({ role: "brand" });
      toast.success("Account updated to Brand role!");
    } catch {
      toast.error("Failed to update role.");
    }
  }

  async function handleReview(submission: CampaignSubmission, status: "approved" | "rejected") {
    setActionInProgress(submission.id);
    const note = reviewNote[submission.id] || "";
    const payout = status === "approved" ? submission.campaign?.reward_per_creator || 1000 : 0;

    try {
      const { success, error } = await reviewSubmission({
        submissionId: submission.id,
        status,
        reviewNote: note,
        payoutAmount: payout,
        creatorId: submission.creator_id,
        campaignTitle: submission.campaign?.title || "Campaign Drop",
      });

      if (success) {
        playSound(status === "approved" ? "cheer" : "pop");
        toast.success(
          status === "approved"
            ? `Approved! ₹${payout} credited to @${submission.creator?.username || "creator"}'s wallet.`
            : "Submission rejected with feedback.",
        );
        // Update local list
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submission.id
              ? {
                  ...s,
                  status,
                  review_note: note,
                  payout_amount: payout,
                }
              : s,
          ),
        );
      } else {
        toast.error(`Review failed: ${error}`);
      }
    } catch {
      toast.error("Could not process review.");
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      toast.error("Please fill in the campaign title and description.");
      return;
    }

    setCreating(true);
    try {
      let coverUrl = "/memes/cricket.png";
      if (coverFile) {
        const { url } = await uploadMedia(coverFile, "campaign-media");
        if (url) coverUrl = url;
      }

      const { campaign, error } = await createCampaign({
        brandId: user?.id || "nova",
        title: newTitle,
        description: newDesc,
        objective: newObjective || "Drive viral cultural awareness",
        contentType: newContentType,
        coverUrl,
        totalBudget: Number(newBudget),
        rewardPerCreator: Number(newReward),
        maximumCreators: Number(newMaxCreators),
        deadline: new Date(newDeadline).toISOString(),
        guidelinesDo: newDos.split("\n").filter((s) => s.trim()),
        guidelinesDont: newDonts.split("\n").filter((s) => s.trim()),
        mandatoryHashtags: newHashtags.split(" ").filter((s) => s.trim()),
        mandatoryMentions: newMentions.split(" ").filter((s) => s.trim()),
        campaignType: newCampaignType,
        categoryId: newCategory,
        minCreatorTier: newMinTier,
        prizeFirst: newCampaignType === "competition" ? Number(newPrizeFirst) : undefined,
        prizeSecond: newCampaignType === "competition" ? Number(newPrizeSecond) : undefined,
        prizeThird: newCampaignType === "competition" ? Number(newPrizeThird) : undefined,
      });

      if (error || !campaign) {
        toast.error(`Creation failed: ${error || "Unknown error"}`);
      } else {
        playSound("cheer");
        toast.success("Campaign launched successfully!");
        setCampaigns((prev) => [campaign, ...prev]);
        setActiveTab("campaigns");
        // Reset
        setNewTitle("");
        setNewDesc("");
      }
    } catch {
      toast.error("An error occurred creating the campaign.");
    } finally {
      setCreating(false);
    }
  }

  const pendingSubmissions = submissions.filter((s) => s.status === "pending");
  const totalApproved = submissions.filter((s) => s.status === "approved");
  const totalDisbursed = totalApproved.reduce((acc, s) => acc + Number(s.payout_amount || 0), 0);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-16">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="accent">Brand Portal</Badge>
            <span className="text-xs text-muted">Speckit Marketplace Management</span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Brand Campaign Manager
          </h1>
          <p className="text-sm text-muted">
            Launch UGC and meme campaigns, vet creator drops, and disburse payouts automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="subtle" asChild>
            <Link to="/owner">
              👑 Owner Center
            </Link>
          </Button>
          <Button size="sm" variant="subtle" asChild>
            <Link to="/admin">
              🛡️ Mod Appeals
            </Link>
          </Button>
          {profile?.role !== "brand" && profile?.role !== "admin" && (
            <Button size="sm" variant="accent" onClick={upgradeToBrandRole}>
              Switch to Brand
            </Button>
          )}
        </div>
      </header>

      {/* Analytics Overview Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Active Briefs</p>
          <p className="font-display text-2xl font-bold">{campaigns.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-amber-400">Needs Review</p>
          <p className="font-display text-2xl font-bold text-amber-400">{pendingSubmissions.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">Approved Drops</p>
          <p className="font-display text-2xl font-bold text-emerald-400">{totalApproved.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-accent">Total Paid Out</p>
          <p className="font-display text-2xl font-bold text-accent">{inr(totalDisbursed)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "campaigns" ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"
          }`}
        >
          <BarChart3 className="size-4" /> Your Campaigns ({campaigns.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("submissions")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "submissions" ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"
          }`}
        >
          <FileCheck2 className="size-4" /> Review Queue ({pendingSubmissions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("create")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "create" ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"
          }`}
        >
          <Plus className="size-4" /> + Create Brief
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS */}
      {activeTab === "campaigns" && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Campaign Inventory</h2>
            <Button size="sm" onClick={() => setActiveTab("create")}>
              <Plus className="size-4 mr-1" /> New Brief
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center text-muted">
              <FolderPlus className="mx-auto size-8 mb-2" />
              <p className="font-display text-base font-bold">No campaigns yet</p>
              <p className="text-xs mt-1">Create your first brief to begin receiving creator submissions.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {campaigns.map((c) => (
                <div key={c.id} className="flex flex-col rounded-2xl border border-border bg-surface overflow-hidden">
                  <div className="relative h-36 w-full bg-raised">
                    <img src={c.cover_url || "/memes/cricket.png"} alt="" className="h-full w-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Badge tone={c.status === "published" ? "accent" : "muted"}>{c.status}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-display text-base font-bold text-fg">{c.title}</h3>
                    <p className="mt-1 text-xs text-muted line-clamp-2">{c.description}</p>
                    
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {c.category_id && (
                        <span className="rounded-md border border-border bg-raised px-2 py-0.5 text-[10px] font-semibold text-fg">
                          {CATEGORIES.find((cat) => cat.id === c.category_id)?.icon || "🏷️"}{" "}
                          {CATEGORIES.find((cat) => cat.id === c.category_id)?.name || "General"}
                        </span>
                      )}
                      <span className="rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        {CAMPAIGN_TYPES.find((t) => t.id === c.campaign_type)?.icon || "💰"}{" "}
                        {CAMPAIGN_TYPES.find((t) => t.id === c.campaign_type)?.name || "Fixed Payout"}
                      </span>
                      {c.min_creator_tier && c.min_creator_tier !== "new" && (
                        <span className="rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                          👑 {CREATOR_TIERS.find((t) => t.id === c.min_creator_tier)?.badge || c.min_creator_tier}
                        </span>
                      )}
                    </div>

                    <div className="mt-auto pt-3 flex items-center justify-between text-xs text-muted">
                      <span>Reward: <strong className="text-accent">{inr(c.reward_per_creator)}</strong></span>
                      <span>Slots: {c.slots_taken} / {c.maximum_creators}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="subtle" className="w-full" asChild>
                        <Link to="/briefs/$id" params={{ id: c.id }}>
                          View Public Brief
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: REVIEW QUEUE */}
      {activeTab === "submissions" && (
        <section>
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold">Creator Submissions Review</h2>
            <p className="text-xs text-muted">
              Carefully verify that submissions follow your Do's and Don'ts before approving. Approved submissions
              credit the creator's wallet instantly.
            </p>
          </div>

          {submissions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center text-muted">
              <FileCheck2 className="mx-auto size-8 mb-2" />
              <p className="font-display text-base font-bold">No submissions yet</p>
              <p className="text-xs mt-1">When creators drop entries for your campaigns, they will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {submissions.map((sub) => {
                const isPending = sub.status === "pending";
                const reward = sub.campaign?.reward_per_creator || 1000;

                return (
                  <div
                    key={sub.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      isPending
                        ? "border-accent/40 bg-surface shadow-md"
                        : "border-border bg-surface/60 opacity-80"
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      {/* Creator info & Campaign */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-fg">
                            @{sub.creator?.username || "creator"}
                          </span>
                          <span className="text-xs text-muted">({sub.creator?.display_name})</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              sub.status === "approved"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : sub.status === "rejected"
                                ? "bg-rose-500/20 text-rose-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-accent font-medium">
                          Brief: {sub.campaign?.title || "Campaign"}
                        </p>
                        <p className="text-[11px] text-muted">
                          Submitted on {new Date(sub.submitted_at).toLocaleString("en-IN")}
                        </p>

                        {/* Content preview */}
                        {sub.external_url && (
                          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-raised p-2 text-xs">
                            <Instagram className="size-4 text-rose-400 shrink-0" />
                            <a
                              href={sub.external_url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-accent hover:underline flex items-center gap-1"
                            >
                              {sub.external_url} <ArrowUpRight className="size-3" />
                            </a>
                          </div>
                        )}

                        {sub.content_url && (
                          <div className="mt-3 max-w-sm overflow-hidden rounded-xl border border-border">
                            <img
                              src={sub.content_url}
                              alt="Submission preview"
                              className="w-full object-cover max-h-48"
                            />
                          </div>
                        )}

                        {sub.review_note && (
                          <p className="mt-2 text-xs text-muted">
                            <strong>Feedback:</strong> {sub.review_note}
                          </p>
                        )}
                      </div>

                      {/* Review Actions */}
                      {isPending ? (
                        <div className="flex flex-col gap-2 sm:w-64">
                          <Input
                            placeholder="Optional feedback note..."
                            value={reviewNote[sub.id] || ""}
                            onChange={(e) =>
                              setReviewNote((prev) => ({ ...prev, [sub.id]: e.target.value }))
                            }
                            className="text-xs"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                              disabled={actionInProgress === sub.id}
                              onClick={() => handleReview(sub, "approved")}
                            >
                              <Check className="size-3.5 mr-1" /> Approve ({inr(reward)})
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                              disabled={actionInProgress === sub.id}
                              onClick={() => handleReview(sub, "rejected")}
                            >
                              <X className="size-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-right text-xs">
                          {sub.status === "approved" && (
                            <p className="font-display font-bold text-emerald-400">
                              Paid {inr(sub.payout_amount)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: CREATE CAMPAIGN */}
      {activeTab === "create" && (
        <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold">Launch a Brand Brief</h2>
            <p className="text-xs text-muted">
              Define your budget, campaign objectives, and quality guidelines. Creators will discover your brief on
              the marketplace immediately.
            </p>
          </div>

          <form onSubmit={handleCreateCampaign} className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Campaign Title *</label>
                <Input
                  placeholder="e.g. Make the teal-bone colorway feel inevitable"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Content Format *</label>
                <select
                  value={newContentType}
                  onChange={(e) => setNewContentType(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-raised px-3 py-2 text-xs font-medium text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="meme">Meme (Image / Graphic)</option>
                  <option value="reel">Instagram Reel / Video</option>
                  <option value="ugc">User Generated Content (UGC)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Objective / Goal *</label>
              <Input
                placeholder="e.g. Drive viral engagement among IPL cricket fans"
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Brief Description / Pitch *</label>
              <Textarea
                placeholder="Describe what kind of vibe, humor, or aesthetic you're looking for..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                required
              />
            </div>

            {/* Category & Campaign Model */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Target Meme Category *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-xl border border-border bg-raised px-3 py-2 text-xs font-medium text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted">Each category has specialized dynamic view/like earning multipliers.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Campaign Model *</label>
                <select
                  value={newCampaignType}
                  onChange={(e) => setNewCampaignType(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-raised px-3 py-2 text-xs font-medium text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {CAMPAIGN_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.name} — {type.desc}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted">Choose between fixed bounty, viral performance bonus, or top-3 podium.</p>
              </div>
            </div>

            {/* Minimum Creator Tier Requirement */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Minimum Creator Tier Eligibility *</label>
              <select
                value={newMinTier}
                onChange={(e) => setNewMinTier(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-raised px-3 py-2 text-xs font-medium text-fg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {CREATOR_TIERS.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted">Gate your campaign to seasoned creators or keep it open to all rising talent.</p>
            </div>

            {/* Competition Prizes if competition */}
            {newCampaignType === "competition" && (
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">🥇 1st Prize (₹) *</label>
                  <Input
                    type="number"
                    min={1000}
                    value={newPrizeFirst}
                    onChange={(e) => setNewPrizeFirst(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">🥈 2nd Prize (₹) *</label>
                  <Input
                    type="number"
                    min={500}
                    value={newPrizeSecond}
                    onChange={(e) => setNewPrizeSecond(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">🥉 3rd Prize (₹) *</label>
                  <Input
                    type="number"
                    min={250}
                    value={newPrizeThird}
                    onChange={(e) => setNewPrizeThird(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
            )}

            {/* Financials */}
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-raised/50 p-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Total Budget (₹) *</label>
                <Input
                  type="number"
                  min={1000}
                  step={500}
                  value={newBudget}
                  onChange={(e) => setNewBudget(Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Reward / Creator (₹) *</label>
                <Input
                  type="number"
                  min={100}
                  step={50}
                  value={newReward}
                  onChange={(e) => setNewReward(Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Max Slots (Creators)</label>
                <Input
                  type="number"
                  min={1}
                  value={newMaxCreators}
                  onChange={(e) => setNewMaxCreators(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Guidelines */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1">Do's (One per line)</label>
                <Textarea
                  value={newDos}
                  onChange={(e) => setNewDos(e.target.value)}
                  rows={4}
                  className="border-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-rose-400 mb-1">Don'ts (One per line)</label>
                <Textarea
                  value={newDonts}
                  onChange={(e) => setNewDonts(e.target.value)}
                  rows={4}
                  className="border-rose-500/30"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Mandatory Hashtags</label>
                <Input
                  placeholder="#BrandDrop #Riff"
                  value={newHashtags}
                  onChange={(e) => setNewHashtags(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Mandatory Mentions</label>
                <Input
                  placeholder="@brand.official"
                  value={newMentions}
                  onChange={(e) => setNewMentions(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Campaign Cover Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="text-xs text-muted"
              />
            </div>

            <div className="pt-2">
              <Button type="submit" size="lg" className="w-full" disabled={creating}>
                {creating ? "Launching..." : `Publish Campaign (${inr(newBudget)} Budget)`}
              </Button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
