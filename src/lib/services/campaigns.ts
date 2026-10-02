import { supabase, isSupabaseConfigured } from "../supabase";
import type { Database } from "../database.types";
import { BRIEFS } from "../seed";

export type Campaign = Database["public"]["Tables"]["campaigns"]["Row"] & {
  brand?: {
    id: string;
    company_name: string;
    logo_url: string | null;
    verified: boolean;
  };
  campaign_type?: string;
  category_id?: string | null;
  min_creator_tier?: string;
  prize_first?: number | null;
  prize_second?: number | null;
  prize_third?: number | null;
};

export type CampaignSubmission = Database["public"]["Tables"]["campaign_submissions"]["Row"] & {
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  campaign?: {
    id: string;
    title: string;
    reward_per_creator: number;
    brand?: {
      company_name: string;
    };
  };
};

function getFallbackCampaigns(): Campaign[] {
  return BRIEFS.map((b) => ({
    id: b.id,
    brand_id: b.brandId,
    title: b.title,
    description: b.pitch,
    cover_url: b.cover,
    objective: "Drive viral awareness across Indian pop culture and community hubs.",
    content_type: "meme",
    total_budget: b.prize,
    reward_per_creator: b.payout,
    maximum_creators: b.slots,
    slots_taken: b.taken,
    deadline: new Date(b.deadline).toISOString(),
    guidelines_do: [
      "Use high-contrast punchy captions",
      "Keep the visual theme aligned with the brand aesthetic",
      "Highlight real relatable moments",
    ],
    guidelines_dont: [
      "No offensive, derogatory, or copyright-violating content",
      "No competitor logos or names",
    ],
    mandatory_hashtags: ["#RiffCreator", "#BrandDrop"],
    mandatory_mentions: ["@riff.app"],
    status: "published",
    created_at: new Date().toISOString(),
    campaign_type: "fixed_reward",
    category_id: "cat_relatable",
    min_creator_tier: "new",
    prize_first: null,
    prize_second: null,
    prize_third: null,
    brand: {
      id: b.brandId,
      company_name: b.brandId === "nova" ? "Nova Drops" : "Pitchside",
      logo_url: `/memes/${b.cover.split("/").pop()}`,
      verified: true,
    },
  }));
}

import {
  getCampaignsList,
  getSubmissionsList,
  submitCampaignServerFn,
  approveSubmission,
  createCampaignServerFn,
} from "../riff-data";

export async function fetchCampaigns({
  status = "published",
  contentType,
  sort = "newest",
}: {
  status?: "published" | "active" | "all";
  contentType?: string;
  sort?: "payout" | "deadline" | "newest";
} = {}): Promise<Campaign[]> {
  try {
    const list = await getCampaignsList();
    if (list && list.length > 0) {
      return list.map((b) => ({
        id: b.id,
        brand_id: "nova",
        title: b.title,
        description: b.description || "",
        cover_url: `/memes/${b.id === "b1" ? "sneaker.jpg" : b.id === "b2" ? "cricket.jpg" : "food.jpg"}`,
        objective: "Drive viral awareness across Indian pop culture and community hubs.",
        content_type: "meme",
        total_budget: Number(b.total_budget),
        reward_per_creator: Number(b.payout),
        maximum_creators: Number(b.maximum_creators || 40),
        slots_taken: Math.max(0, Math.floor((Number(b.total_budget) - Number(b.remaining_budget)) / Number(b.payout || 500))),
        deadline: b.deadline || new Date(Date.now() + 86400000 * 7).toISOString(),
        guidelines_do: ["Use high-contrast punchy captions", "Highlight relatable moments"],
        guidelines_dont: ["No offensive content", "No competitor logos"],
        mandatory_hashtags: ["#RiffCreator", "#BrandDrop"],
        mandatory_mentions: ["@riff.app"],
        status: b.status === "open" ? "published" : "closed",
        created_at: new Date().toISOString(),
        campaign_type: b.campaign_type || "fixed_reward",
        category_id: b.category_id || null,
        min_creator_tier: b.min_creator_tier || "new",
        prize_first: b.prize_first ? Number(b.prize_first) : null,
        prize_second: b.prize_second ? Number(b.prize_second) : null,
        prize_third: b.prize_third ? Number(b.prize_third) : null,
        brand: {
          id: "brand",
          company_name: b.brand,
          logo_url: "/memes/sneaker.jpg",
          verified: true,
        },
      }));
    }
  } catch {}
  return getFallbackCampaigns();
}

export async function fetchCampaignById(id: string): Promise<Campaign | null> {
  const list = await fetchCampaigns();
  return list.find((x) => x.id === id) ?? null;
}

export async function submitToCampaign(input: {
  campaignId: string;
  creatorId: string;
  contentUrl: string;
  externalUrl?: string;
  postId?: string;
}): Promise<{ submission: CampaignSubmission | null; error: string | null }> {
  try {
    const res = await submitCampaignServerFn({
      data: {
        campaignId: input.campaignId,
        contentUrl: input.contentUrl,
        externalUrl: input.externalUrl,
      },
    });

    const sub: CampaignSubmission = {
      id: res.submissionId,
      campaign_id: input.campaignId,
      creator_id: input.creatorId,
      post_id: input.postId || null,
      content_url: input.contentUrl,
      external_url: input.externalUrl || null,
      status: "pending",
      review_note: null,
      payout_amount: 0,
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      paid_at: null,
    };

    return { submission: sub, error: null };
  } catch (err: unknown) {
    return { submission: null, error: err instanceof Error ? err.message : "Submission failed" };
  }
}

export async function reviewSubmission(input: {
  submissionId: string;
  status: "approved" | "rejected";
  reviewNote?: string;
  payoutAmount: number;
  creatorId: string;
  campaignTitle: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await approveSubmission({
      data: {
        submissionId: input.submissionId,
        approve: input.status === "approved",
      },
    });

    if (res.status === "paid" || res.status === "rejected") {
      return { success: true, error: null };
    }
    return { success: false, error: "Review action failed" };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Review action failed" };
  }
}

export async function fetchSubmissions({
  campaignId,
  creatorId,
  status,
}: {
  campaignId?: string;
  creatorId?: string;
  status?: string;
} = {}): Promise<CampaignSubmission[]> {
  try {
    const list = await getSubmissionsList({
      data: {
        creatorId,
        briefId: campaignId,
        status,
      },
    });

    if (list && list.length > 0) {
      return list.map((s) => ({
        id: s.id,
        campaign_id: s.brief_id,
        creator_id: s.user_id,
        post_id: s.post_id,
        content_url: s.content_url,
        external_url: null,
        status: s.status as any,
        review_note: null,
        payout_amount: Number(s.payout),
        submitted_at: s.submitted_at,
        reviewed_at: s.reviewed_at,
        paid_at: s.reviewed_at,
        creator: {
          id: s.user_id,
          username: "creator",
          display_name: "Creator",
          avatar_url: "/avatars/you.jpg",
        },
        campaign: {
          id: s.brief_id,
          title: s.brief_title || "Brand Campaign",
          reward_per_creator: Number(s.payout || s.brief_payout || 500),
          brand: {
            company_name: s.brief_brand || "Brand",
          },
        },
      }));
    }
  } catch {}
  return [];
}

export async function createCampaign(input: {
  brandId: string;
  title: string;
  description: string;
  objective?: string;
  contentType?: "meme" | "reel" | "ugc";
  coverUrl?: string;
  totalBudget: number;
  rewardPerCreator: number;
  maximumCreators?: number;
  deadline: string;
  guidelinesDo?: string[];
  guidelinesDont?: string[];
  mandatoryHashtags?: string[];
  mandatoryMentions?: string[];
  campaignType?: "fixed_reward" | "performance" | "competition" | "brand_challenge";
  categoryId?: string;
  minCreatorTier?: string;
  prizeFirst?: number;
  prizeSecond?: number;
  prizeThird?: number;
}): Promise<{ campaign: Campaign | null; error: string | null }> {
  try {
    const res = await createCampaignServerFn({
      data: {
        title: input.title,
        description: input.description,
        brand: input.brandId,
        totalBudget: input.totalBudget,
        rewardPerCreator: input.rewardPerCreator,
        maximumCreators: input.maximumCreators,
        deadline: input.deadline,
        campaignType: input.campaignType,
        categoryId: input.categoryId,
        minCreatorTier: input.minCreatorTier,
        prizeFirst: input.prizeFirst,
        prizeSecond: input.prizeSecond,
        prizeThird: input.prizeThird,
      },
    });

    const newCampaign: Campaign = {
      id: res.campaignId,
      brand_id: input.brandId,
      title: input.title,
      description: input.description,
      cover_url: input.coverUrl || "/memes/sneaker.jpg",
      objective: input.objective || "Drive viral cultural awareness",
      content_type: input.contentType || "meme",
      total_budget: input.totalBudget,
      reward_per_creator: input.rewardPerCreator,
      maximum_creators: input.maximumCreators || 40,
      slots_taken: 0,
      deadline: input.deadline,
      guidelines_do: input.guidelinesDo || [],
      guidelines_dont: input.guidelinesDont || [],
      mandatory_hashtags: input.mandatoryHashtags || [],
      mandatory_mentions: input.mandatoryMentions || [],
      status: "published",
      created_at: new Date().toISOString(),
      campaign_type: input.campaignType || "fixed_reward",
      category_id: input.categoryId || null,
      min_creator_tier: input.minCreatorTier || "new",
      prize_first: input.prizeFirst || null,
      prize_second: input.prizeSecond || null,
      prize_third: input.prizeThird || null,
      brand: {
        id: input.brandId,
        company_name: "Brand",
        logo_url: input.coverUrl || "/memes/sneaker.jpg",
        verified: true,
      },
    };

    return { campaign: newCampaign, error: null };
  } catch (err: unknown) {
    return { campaign: null, error: err instanceof Error ? err.message : "Campaign creation failed" };
  }
}

