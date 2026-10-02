import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Instagram,
  ShieldAlert,
  Sparkles,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import {
  fetchCampaignById,
  fetchSubmissions,
  submitToCampaign,
  type Campaign,
  type CampaignSubmission,
} from "@/lib/services/campaigns";
import { submitAppealServerFn } from "@/lib/riff-data";
import { uploadMedia } from "@/lib/supabase";
import { deadlineLeft, inr } from "@/lib/utils";
import { toast } from "sonner";
import { playSound } from "@/lib/sounds";

export const Route = createFileRoute("/briefs/$id")({
  component: BriefDetailPage,
  head: () => ({ meta: [{ title: "Brief Detail · Riff" }] }),
});

function BriefDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submission, setSubmission] = useState<CampaignSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states for manual Reel / UGC submission
  const [submitMode, setSubmitMode] = useState<"studio" | "reel">("studio");
  const [reelUrl, setReelUrl] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Appeal states
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealExplanation, setAppealExplanation] = useState("");
  const [appealing, setAppealing] = useState(false);

  async function handleAppealSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!submission || !appealExplanation.trim()) return;
    setAppealing(true);
    try {
      const res = await submitAppealServerFn({
        data: {
          submissionId: submission.id,
          explanation: appealExplanation.trim(),
        },
      });
      if (res.ok) {
        playSound("pop");
        toast.success("Appeal submitted to moderators for review!");
        setShowAppealModal(false);
        setAppealExplanation("");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit appeal");
    } finally {
      setAppealing(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [c, subs] = await Promise.all([
          fetchCampaignById(id),
          user?.id ? fetchSubmissions({ campaignId: id, creatorId: user.id }) : Promise.resolve([]),
        ]);
        if (mounted) {
          setCampaign(c);
          if (subs && subs.length > 0) {
            setSubmission(subs[0]);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [id, user?.id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="h-64 animate-pulse rounded-2xl bg-surface" />
      </main>
    );
  }

  if (!campaign) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center text-muted">
        <p className="font-display text-xl font-bold">Campaign not found.</p>
        <Button className="mt-4" asChild>
          <Link to="/briefs">Back to Briefs</Link>
        </Button>
      </main>
    );
  }

  const slotsPct = Math.min(100, Math.round((campaign.slots_taken / campaign.maximum_creators) * 100));

  async function handleReelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Please sign in first to submit to campaigns.");
      void navigate({ to: "/login" });
      return;
    }

    if (!reelUrl.trim()) {
      toast.error("Please enter your Instagram Reel or Post URL.");
      return;
    }

    setSubmitting(true);
    try {
      let finalContentUrl = reelUrl;
      if (proofFile) {
        const { url } = await uploadMedia(proofFile, "campaign-media");
        if (url) finalContentUrl = url;
      }

      const { submission: newSub, error } = await submitToCampaign({
        campaignId: campaign!.id,
        creatorId: user.id,
        contentUrl: finalContentUrl,
        externalUrl: reelUrl,
      });

      if (error) {
        toast.error(`Submission failed: ${error}`);
      } else {
        playSound("pop");
        toast.success("Submitted for review! Brand will review within 24-48 hours.");
        setSubmission(newSub);
      }
    } catch {
      toast.error("An error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16">
      {/* Cover Header */}
      <div className="relative -mx-4 mb-6 h-60 overflow-hidden sm:mx-0 sm:rounded-3xl border border-border bg-raised">
        <img
          src={campaign.cover_url || "/memes/cricket.png"}
          alt={campaign.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />

        <div className="absolute top-4 left-4 flex gap-2">
          <Badge tone="accent" className="font-display font-bold text-sm">
            {inr(campaign.reward_per_creator)} PER APPROVED DROP
          </Badge>
          <span className="rounded-full bg-bg/80 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-fg backdrop-blur-md">
            {campaign.content_type}
          </span>
        </div>

        <div className="absolute right-4 bottom-4 left-4">
          <p className="text-xs font-semibold text-accent uppercase tracking-wider">
            {campaign.brand?.company_name || "Official Brand Campaign"}
          </p>
          <h1 className="mt-1 font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl text-fg">
            {campaign.title}
          </h1>
        </div>
      </div>

      {/* Campaign Meta Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3 rounded-2xl border border-border bg-surface p-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Reward / Creator</p>
          <p className="font-display text-xl font-bold text-accent">{inr(campaign.reward_per_creator)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Total Pool</p>
          <p className="font-display text-xl font-bold">{inr(campaign.total_budget)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Deadline</p>
          <p className="font-display text-base font-semibold text-amber-400">
            {deadlineLeft(campaign.deadline)}
          </p>
        </div>
      </div>

      {/* Slots Progress Bar */}
      <div className="mb-8 rounded-2xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>
            Slots Claimed: <strong className="text-fg">{campaign.slots_taken}</strong> / {campaign.maximum_creators}
          </span>
          <span className="font-medium text-accent">{campaign.maximum_creators - campaign.slots_taken} slots left</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${slotsPct}%` }} />
        </div>
      </div>

      {/* Brief Objective & Pitch */}
      <section className="mb-8">
        <h2 className="mb-2 font-display text-lg font-bold">Campaign Objective</h2>
        <p className="text-sm leading-relaxed text-muted">{campaign.description}</p>
        {campaign.objective && (
          <div className="mt-3 rounded-xl border border-border/80 bg-raised/50 p-3 text-xs text-fg">
            <strong>Goal: </strong> {campaign.objective}
          </div>
        )}
      </section>

      {/* Guidelines (Do's & Don'ts) */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Check className="size-4" /> Do's
          </h3>
          <ul className="grid gap-2 text-xs text-fg/90">
            {campaign.guidelines_do.map((rule, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-400">
            <X className="size-4" /> Don'ts
          </h3>
          <ul className="grid gap-2 text-xs text-fg/90">
            {campaign.guidelines_dont.map((rule, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Mandatory Tags and Mentions */}
      <div className="mb-8 rounded-2xl border border-border bg-surface p-4">
        <h3 className="mb-3 font-display text-sm font-bold">Required Tags & Mentions</h3>
        <div className="flex flex-wrap gap-2">
          {campaign.mandatory_hashtags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => copyText(tag, tag)}
              className="flex items-center gap-1 rounded-full border border-border bg-raised px-3 py-1 text-xs font-medium text-accent hover:border-accent/40"
            >
              {tag} <Copy className="size-3 text-muted" />
            </button>
          ))}
          {campaign.mandatory_mentions.map((mention) => (
            <button
              key={mention}
              type="button"
              onClick={() => copyText(mention, mention)}
              className="flex items-center gap-1 rounded-full border border-border bg-raised px-3 py-1 text-xs font-medium text-fg hover:border-accent/40"
            >
              {mention} <Copy className="size-3 text-muted" />
            </button>
          ))}
        </div>
      </div>

      {/* Submission Status or Action Form */}
      {submission ? (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Your Submission</h2>
            {submission.status === "approved" && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="size-4" /> Approved · {inr(submission.payout_amount)} Credited
              </span>
            )}
            {submission.status === "pending" && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400">
                <Clock className="size-4" /> Under Review
              </span>
            )}
            {submission.status === "rejected" && (
              <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-400">
                <XCircle className="size-4" /> Rejected
              </span>
            )}
          </div>

          <p className="mt-2 text-xs text-muted">
            Submitted on{" "}
            {new Date(submission.submitted_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {submission.review_note && (
            <div className="mt-3 rounded-xl border border-border bg-raised p-3 text-xs">
              <strong className="text-fg">Brand Note: </strong>
              <span className="text-muted">{submission.review_note}</span>
            </div>
          )}

          {submission.status === "rejected" && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-purple-500/30 bg-purple-500/10 p-3">
              <div>
                <p className="text-xs font-semibold text-purple-200">Think this rejection was a mistake?</p>
                <p className="text-[11px] text-muted">Appeal to neutral community moderators for re-review.</p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAppealModal(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-8"
              >
                <ShieldAlert className="size-3.5 mr-1" /> Appeal Rejection
              </Button>
            </div>
          )}

          {submission.external_url && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-raised p-3">
              <div className="flex items-center gap-2 truncate text-xs text-fg">
                <Instagram className="size-4 text-rose-400 shrink-0" />
                <span className="truncate">{submission.external_url}</span>
              </div>
              <a
                href={submission.external_url}
                target="_blank"
                rel="noreferrer"
                className="ml-2 flex items-center gap-1 text-xs text-accent hover:underline shrink-0"
              >
                View Reel <ArrowUpRight className="size-3" />
              </a>
            </div>
          )}

          {submission.content_url && !submission.external_url && (
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <img src={submission.content_url} alt="Submitted content" className="w-full object-cover max-h-96" />
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button variant="subtle" size="sm" asChild>
              <Link to="/you">View in Wallet</Link>
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-accent/30 bg-surface p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="font-display text-xl font-bold">Submit Your Content</h2>
            <p className="text-xs text-muted">
              Submissions are vetted by the brand against campaign guidelines. Once approved,{" "}
              <strong className="text-accent">{inr(campaign.reward_per_creator)}</strong> is credited to your wallet.
            </p>
          </div>

          {/* Submission Mode Selector */}
          <div className="mb-5 flex rounded-xl border border-border bg-raised p-1">
            <button
              type="button"
              onClick={() => setSubmitMode("studio")}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                submitMode === "studio" ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-fg"
              }`}
            >
              🎨 Create in Riff Studio
            </button>
            <button
              type="button"
              onClick={() => setSubmitMode("reel")}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                submitMode === "reel" ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-fg"
              }`}
            >
              📱 Submit Instagram Reel / Post
            </button>
          </div>

          {submitMode === "studio" ? (
            <div className="rounded-2xl border border-border bg-raised/50 p-5 text-center">
              <Sparkles className="mx-auto size-8 text-accent mb-2" />
              <h3 className="font-display text-base font-bold">Open Meme & Video Studio</h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted">
                Use AI scene gen, trending Indian pop-culture templates, and viral stickers to craft your drop.
              </p>
              <Button className="mt-4 w-full" size="lg" asChild>
                <Link to="/studio" search={{ brief: campaign.id }}>
                  Launch Studio with Brief Preset
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReelSubmit} className="grid gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Instagram Reel / Video URL <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="url"
                    placeholder="https://www.instagram.com/reel/C7..."
                    value={reelUrl}
                    onChange={(e) => setReelUrl(e.target.value)}
                    required
                    className="pl-9"
                  />
                  <Instagram className="absolute left-3 top-3 size-4 text-muted" />
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Make sure your account is public and contains the mandatory tags:{" "}
                  <span className="text-accent">{campaign.mandatory_hashtags.join(" ")}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Optional: Upload Screenshot Proof (e.g. Insights / Story)
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-raised/50 px-4 py-3 text-xs text-muted hover:border-accent hover:text-fg">
                  <Upload className="size-4" />
                  <span>{proofFile ? proofFile.name : "Select image file"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="rounded-xl border border-border/80 bg-raised/30 p-3 text-[11px] text-muted flex items-start gap-2">
                <AlertCircle className="size-4 text-accent shrink-0 mt-0.5" />
                <span>
                  By submitting, you confirm this content is your original creation adhering to the brand's guidelines.
                  Fraudulent or spam entries will result in account suspension.
                </span>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : `Submit for Review (${inr(campaign.reward_per_creator)})`}
              </Button>
            </form>
          )}
        </section>
      )}

      {/* Appeal Rejection Modal */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-purple-400" />
                <h3 className="font-display text-base font-bold">Appeal Submission Rejection</h3>
              </div>
              <button
                onClick={() => setShowAppealModal(false)}
                className="text-muted hover:text-fg"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Explain why your submission meets the brief requirements. Community moderators will review
              your entry and have the authority to re-instate it for brand payout.
            </p>

            <form onSubmit={handleAppealSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1 font-medium">Your Explanation & Evidence</label>
                <Textarea
                  placeholder="Explain why this content follows all brand guidelines and DOs/DONTs..."
                  value={appealExplanation}
                  onChange={(e) => setAppealExplanation(e.target.value)}
                  rows={4}
                  required
                  className="bg-black/60 border-white/10 text-xs"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-white/10 text-xs"
                  onClick={() => setShowAppealModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={appealing}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  {appealing ? "Submitting Appeal..." : "Submit to Moderators"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
