import { fetchCampaigns, submitToCampaign, type Campaign } from "./campaigns";
import { inr } from "../utils";

export interface Competition {
  id: string;
  title: string;
  tagline: string;
  description: string;
  coverUrl: string;
  sponsor: string;
  sponsorLogo?: string;
  category: string;
  totalPrize: number;
  prizeFirst: number;
  prizeSecond: number;
  prizeThird: number;
  deadline: string; // ISO string
  hashtag: string;
  rules: string[];
  entryCount: number;
  status: "active" | "judging" | "completed";
  contentType: "meme" | "reel" | "all";
}

export interface LeaderboardEntry {
  id: string;
  competitionId: string;
  rank: number;
  creatorId: string;
  creatorHandle: string;
  creatorName: string;
  creatorAvatar: string;
  creatorMark: "you" | "aanya" | "kabir" | "mira" | "zane" | "priya" | "nova" | "pitch";
  creatorRole?: string;
  title: string;
  mediaUrl: string;
  contentType: "meme" | "reel";
  upvotes: number;
  views: number;
  shares: number;
  score: number;
  estimatedPrize: number;
  submittedAt: number;
  isCurrentUser?: boolean;
}

export interface BattleMatchup {
  id: string;
  title: string;
  category: string;
  left: {
    id: string;
    title: string;
    creatorHandle: string;
    creatorAvatar: string;
    mediaUrl: string;
    votes: number;
  };
  right: {
    id: string;
    title: string;
    creatorHandle: string;
    creatorAvatar: string;
    mediaUrl: string;
    votes: number;
  };
}

// Flagship Featured Arena Competitions
export const FEATURED_COMPETITIONS: Competition[] = [
  {
    id: "comp_bollywood",
    title: "The Bollywood Meme Face-Off #12",
    tagline: "Highest engagement Indian pop-culture drop takes the ₹20,000 cash pool",
    description: "Drop your most relatable Bollywood dialogue riffs, desi dramatic twists, and viral reaction templates. All entries scored on real upvotes and view velocity.",
    coverUrl: "/memes/cricket.jpg",
    sponsor: "Pitchside & Riff Originals",
    category: "Pop Culture & Memes",
    totalPrize: 20000,
    prizeFirst: 10000,
    prizeSecond: 6000,
    prizeThird: 4000,
    deadline: new Date(Date.now() + 86400000 * 3 + 3600000 * 14).toISOString(), // ~3.5 days left
    hashtag: "#BollywoodMemeDrop",
    rules: [
      "Must use Bollywood or Indian pop-culture references",
      "High-contrast punchy captions with crisp typography",
      "No offensive, hate, or copyright-infringing audio",
      "Top 3 highest score entries at deadline receive instant UPI payout",
    ],
    entryCount: 142,
    status: "active",
    contentType: "all",
  },
  {
    id: "comp_beatdrop",
    title: "Speed Reel Beat-Drop Clash",
    tagline: "Multi-track audio cuts & viral rhythm sync in Reel Studio",
    description: "Export high-energy 9:16 vertical edits with fast cuts, audio sync beat drops, and bold captions. Judged by creator community votes.",
    coverUrl: "/memes/club.jpg",
    sponsor: "Nova Drops",
    category: "Reels & Video Edits",
    totalPrize: 15000,
    prizeFirst: 8000,
    prizeSecond: 4500,
    prizeThird: 2500,
    deadline: new Date(Date.now() + 86400000 * 5 + 3600000 * 8).toISOString(), // ~5 days left
    hashtag: "#BeatDropReel",
    rules: [
      "Vertical 9:16 aspect ratio video reel (10s to 30s max)",
      "Audio sync with noticeable beat-drop transitions",
      "Must be edited or exported with RIFF Reel Studio",
      "1 entry per creator",
    ],
    entryCount: 88,
    status: "active",
    contentType: "reel",
  },
  {
    id: "comp_tech",
    title: "Desi Tech & 3AM Code Nightmares",
    tagline: "Merge conflicts, prod bugs, and caffeine-fueled engineer riffs",
    description: "Every developer has lived through a Friday 5 PM deploy panic. Capture the chaos of startup life, client demands, and stack traces.",
    coverUrl: "/memes/desk.jpg",
    sponsor: "Late Shift Studio",
    category: "Tech & Work Life",
    totalPrize: 10000,
    prizeFirst: 5000,
    prizeSecond: 3000,
    prizeThird: 2000,
    deadline: new Date(Date.now() + 86400000 * 7 + 3600000 * 2).toISOString(), // ~7 days left
    hashtag: "#3amCodeRiff",
    rules: [
      "Original programmer / office humor memes or video shorts",
      "Clean visual resolution (min 1080p)",
      "No confidential company proprietary code in screenshots",
    ],
    entryCount: 64,
    status: "active",
    contentType: "meme",
  },
];

// Seeded Leaderboard for Competitions
export const INITIAL_LEADERBOARD_ENTRIES: Record<string, LeaderboardEntry[]> = {
  comp_bollywood: [
    {
      id: "lb_1",
      competitionId: "comp_bollywood",
      rank: 1,
      creatorId: "kabir",
      creatorHandle: "kabir.lane",
      creatorName: "Kabir Lane",
      creatorAvatar: "/memes/cricket.jpg",
      creatorMark: "kabir",
      creatorRole: "creator",
      title: "When you finally fix that one bug after 6 hours but prod is down",
      mediaUrl: "/memes/cricket.jpg",
      contentType: "meme",
      upvotes: 1840,
      views: 34200,
      shares: 620,
      score: 9850,
      estimatedPrize: 10000,
      submittedAt: Date.now() - 3600000 * 18,
    },
    {
      id: "lb_2",
      competitionId: "comp_bollywood",
      rank: 2,
      creatorId: "aanya",
      creatorHandle: "aanya.riff",
      creatorName: "Aanya Rao",
      creatorAvatar: "/memes/cat.jpg",
      creatorMark: "aanya",
      creatorRole: "creator",
      title: "Boss: 'Just a quick sync at 6:55 PM' — My brain immediately:",
      mediaUrl: "/memes/cat.jpg",
      contentType: "meme",
      upvotes: 1420,
      views: 28900,
      shares: 490,
      score: 8320,
      estimatedPrize: 6000,
      submittedAt: Date.now() - 3600000 * 24,
    },
    {
      id: "lb_3",
      competitionId: "comp_bollywood",
      rank: 3,
      creatorId: "priya",
      creatorHandle: "priya.edit",
      creatorName: "Priya Nair",
      creatorAvatar: "/memes/food.jpg",
      creatorMark: "priya",
      creatorRole: "creator",
      title: "Me ordering ₹600 street food while saving ₹40 on auto rickshaw",
      mediaUrl: "/memes/food.jpg",
      contentType: "meme",
      upvotes: 1190,
      views: 21500,
      shares: 380,
      score: 7150,
      estimatedPrize: 4000,
      submittedAt: Date.now() - 3600000 * 30,
    },
    {
      id: "lb_4",
      competitionId: "comp_bollywood",
      rank: 4,
      creatorId: "rahul",
      creatorHandle: "rahul",
      creatorName: "Rahul Sharma",
      creatorAvatar: "/memes/club.jpg",
      creatorMark: "nova",
      creatorRole: "creator",
      title: "Opening Instagram in public and volume is at 100%",
      mediaUrl: "/memes/club.jpg",
      contentType: "meme",
      upvotes: 940,
      views: 16800,
      shares: 260,
      score: 5800,
      estimatedPrize: 0,
      submittedAt: Date.now() - 3600000 * 36,
    },
    {
      id: "lb_5",
      competitionId: "comp_bollywood",
      rank: 5,
      creatorId: "zane",
      creatorHandle: "zane.wave",
      creatorName: "Zane Malik",
      creatorAvatar: "/memes/sneaker.jpg",
      creatorMark: "zane",
      creatorRole: "creator",
      title: "Sneakerhead walking on grass vs walking on pavement",
      mediaUrl: "/memes/sneaker.jpg",
      contentType: "meme",
      upvotes: 780,
      views: 13400,
      shares: 190,
      score: 4720,
      estimatedPrize: 0,
      submittedAt: Date.now() - 3600000 * 42,
    },
    {
      id: "lb_6",
      competitionId: "comp_bollywood",
      rank: 6,
      creatorId: "mira",
      creatorHandle: "mira.cut",
      creatorName: "Mira Sen",
      creatorAvatar: "/memes/dog.jpg",
      creatorMark: "mira",
      creatorRole: "creator",
      title: "Dog judging my life choices at 2:30 AM in the kitchen",
      mediaUrl: "/memes/dog.jpg",
      contentType: "meme",
      upvotes: 620,
      views: 11200,
      shares: 140,
      score: 3950,
      estimatedPrize: 0,
      submittedAt: Date.now() - 3600000 * 48,
    },
  ],
  comp_beatdrop: [
    {
      id: "lb_b1",
      competitionId: "comp_beatdrop",
      rank: 1,
      creatorId: "aanya",
      creatorHandle: "aanya.riff",
      creatorName: "Aanya Rao",
      creatorAvatar: "/memes/club.jpg",
      creatorMark: "aanya",
      creatorRole: "creator",
      title: "Neon Cyber Beat Drop · 128BPM Mumbai Night Cuts",
      mediaUrl: "/memes/club.jpg",
      contentType: "reel",
      upvotes: 2150,
      views: 45200,
      shares: 880,
      score: 11400,
      estimatedPrize: 8000,
      submittedAt: Date.now() - 3600000 * 12,
    },
    {
      id: "lb_b2",
      competitionId: "comp_beatdrop",
      rank: 2,
      creatorId: "kabir",
      creatorHandle: "kabir.lane",
      creatorName: "Kabir Lane",
      creatorAvatar: "/memes/sneaker.jpg",
      creatorMark: "kabir",
      creatorRole: "creator",
      title: "Retro 80s Synth Drop x Streetwear Pace",
      mediaUrl: "/memes/sneaker.jpg",
      contentType: "reel",
      upvotes: 1690,
      views: 36800,
      shares: 610,
      score: 9200,
      estimatedPrize: 4500,
      submittedAt: Date.now() - 3600000 * 20,
    },
    {
      id: "lb_b3",
      competitionId: "comp_beatdrop",
      rank: 3,
      creatorId: "zane",
      creatorHandle: "zane.wave",
      creatorName: "Zane Malik",
      creatorAvatar: "/memes/desk.jpg",
      creatorMark: "zane",
      creatorRole: "creator",
      title: "Lo-Fi to Drill Transition Reel Edit",
      mediaUrl: "/memes/desk.jpg",
      contentType: "reel",
      upvotes: 1240,
      views: 27100,
      shares: 430,
      score: 7550,
      estimatedPrize: 2500,
      submittedAt: Date.now() - 3600000 * 26,
    },
  ],
  comp_tech: [
    {
      id: "lb_t1",
      competitionId: "comp_tech",
      rank: 1,
      creatorId: "kabir",
      creatorHandle: "kabir.lane",
      creatorName: "Kabir Lane",
      creatorAvatar: "/memes/desk.jpg",
      creatorMark: "kabir",
      creatorRole: "creator",
      title: "Deploying to production on Friday 5:00 PM",
      mediaUrl: "/memes/desk.jpg",
      contentType: "meme",
      upvotes: 1420,
      views: 29800,
      shares: 510,
      score: 8400,
      estimatedPrize: 5000,
      submittedAt: Date.now() - 3600000 * 14,
    },
    {
      id: "lb_t2",
      competitionId: "comp_tech",
      rank: 2,
      creatorId: "mira",
      creatorHandle: "mira.cut",
      creatorName: "Mira Sen",
      creatorAvatar: "/memes/cat.jpg",
      creatorMark: "mira",
      creatorRole: "creator",
      title: "Senior dev watching intern push directly to main branch",
      mediaUrl: "/memes/cat.jpg",
      contentType: "meme",
      upvotes: 1180,
      views: 23400,
      shares: 390,
      score: 6920,
      estimatedPrize: 3000,
      submittedAt: Date.now() - 3600000 * 22,
    },
    {
      id: "lb_t3",
      competitionId: "comp_tech",
      rank: 3,
      creatorId: "rahul",
      creatorHandle: "rahul",
      creatorName: "Rahul Sharma",
      creatorAvatar: "/memes/dog.jpg",
      creatorMark: "nova",
      creatorRole: "creator",
      title: "It worked on my localhost though",
      mediaUrl: "/memes/dog.jpg",
      contentType: "meme",
      upvotes: 890,
      views: 18500,
      shares: 280,
      score: 5400,
      estimatedPrize: 2000,
      submittedAt: Date.now() - 3600000 * 28,
    },
  ],
};

// 1v1 Battle Showdowns
export const BATTLE_MATCHUPS: BattleMatchup[] = [
  {
    id: "battle_1",
    title: "The Ultimate 3AM Dilemma",
    category: "Relatable Memes",
    left: {
      id: "m_left_1",
      title: "'One more YouTube video won't hurt'",
      creatorHandle: "kabir.lane",
      creatorAvatar: "/memes/desk.jpg",
      mediaUrl: "/memes/desk.jpg",
      votes: 432,
    },
    right: {
      id: "m_right_1",
      title: "'Sleeping now so I can be productive tomorrow'",
      creatorHandle: "aanya.riff",
      creatorAvatar: "/memes/cat.jpg",
      mediaUrl: "/memes/cat.jpg",
      votes: 388,
    },
  },
  {
    id: "battle_2",
    title: "Sneakers vs Foodie Priority",
    category: "Pop Culture",
    left: {
      id: "m_left_2",
      title: "Dropping ₹14k on limited sneaker release",
      creatorHandle: "zane.wave",
      creatorAvatar: "/memes/sneaker.jpg",
      mediaUrl: "/memes/sneaker.jpg",
      votes: 310,
    },
    right: {
      id: "m_right_2",
      title: "Midnight street food feast with the squad",
      creatorHandle: "priya.edit",
      creatorAvatar: "/memes/food.jpg",
      mediaUrl: "/memes/food.jpg",
      votes: 485,
    },
  },
  {
    id: "battle_3",
    title: "Friday Night Vibe",
    category: "Weekend Clash",
    left: {
      id: "m_left_3",
      title: "Club bassline & dance floor madness",
      creatorHandle: "aanya.riff",
      creatorAvatar: "/memes/club.jpg",
      mediaUrl: "/memes/club.jpg",
      votes: 290,
    },
    right: {
      id: "m_right_3",
      title: "Cricket thriller final over recaps at home",
      creatorHandle: "kabir.lane",
      creatorAvatar: "/memes/cricket.jpg",
      mediaUrl: "/memes/cricket.jpg",
      votes: 560,
    },
  },
];

/**
 * Fetch all available competitions (DB campaigns + Flagship Featured)
 */
export async function fetchAllCompetitions(): Promise<Competition[]> {
  try {
    const campaigns = await fetchCampaigns();
    const competitionCampaigns: Competition[] = campaigns
      .filter((c) => c.campaign_type === "competition" || (c.prize_first && c.prize_first > 0))
      .map((c) => ({
        id: c.id,
        title: c.title,
        tagline: c.objective || c.description.slice(0, 80),
        description: c.description,
        coverUrl: c.cover_url || "/memes/cricket.jpg",
        sponsor: c.brand?.company_name || "Official Brand Sponsor",
        category: "Brand Ranked Competition",
        totalPrize: Number(c.total_budget || 20000),
        prizeFirst: Number(c.prize_first || Math.round(Number(c.total_budget) * 0.5)),
        prizeSecond: Number(c.prize_second || Math.round(Number(c.total_budget) * 0.3)),
        prizeThird: Number(c.prize_third || Math.round(Number(c.total_budget) * 0.2)),
        deadline: c.deadline || new Date(Date.now() + 86400000 * 7).toISOString(),
        hashtag: `#${c.title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15)}Riff`,
        rules: c.guidelines_do?.length ? c.guidelines_do : ["Original content only", "Top engagement scores win"],
        entryCount: c.slots_taken || 18,
        status: c.status === "closed" ? "completed" : "active",
        contentType: c.content_type === "reel" ? "reel" : "all",
      }));

    // Return union of DB competitions + featured competitions (deduped by ID)
    const existingIds = new Set(competitionCampaigns.map((c) => c.id));
    const merged = [
      ...competitionCampaigns,
      ...FEATURED_COMPETITIONS.filter((c) => !existingIds.has(c.id)),
    ];
    return merged;
  } catch {
    return FEATURED_COMPETITIONS;
  }
}

/**
 * Local storage key for persistent user contest submissions & upvotes
 */
const STORAGE_ENTRIES_KEY = "riff_competition_entries_v1";
const STORAGE_UPVOTES_KEY = "riff_competition_upvotes_v1";

export function getLocalUserEntries(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalUserEntry(entry: LeaderboardEntry) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalUserEntries();
    const updated = [entry, ...existing.filter((e) => e.id !== entry.id)];
    localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(updated));
  } catch {}
}

export function getLocalUserUpvotes(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_UPVOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function toggleLocalUpvote(entryId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const upvotes = getLocalUserUpvotes();
    const hasUpvoted = Boolean(upvotes[entryId]);
    if (hasUpvoted) {
      delete upvotes[entryId];
    } else {
      upvotes[entryId] = true;
    }
    localStorage.setItem(STORAGE_UPVOTES_KEY, JSON.stringify(upvotes));
    return !hasUpvoted;
  } catch {
    return false;
  }
}

/**
 * Fetch leaderboard for a given competition, factoring in real user submissions
 */
export function getLeaderboardForCompetition(
  competitionId: string,
  userEntries: LeaderboardEntry[] = [],
): LeaderboardEntry[] {
  const baseEntries = INITIAL_LEADERBOARD_ENTRIES[competitionId] || INITIAL_LEADERBOARD_ENTRIES.comp_bollywood || [];
  const relevantUserEntries = userEntries.filter((e) => e.competitionId === competitionId);

  // Combine and sort by score descending
  const combined = [...relevantUserEntries, ...baseEntries];
  const sorted = combined.sort((a, b) => b.score - a.score);

  // Re-rank 1 to N
  return sorted.map((entry, index) => {
    const rank = index + 1;
    let estimatedPrize = 0;
    if (rank === 1) estimatedPrize = 10000;
    else if (rank === 2) estimatedPrize = 6000;
    else if (rank === 3) estimatedPrize = 4000;

    return {
      ...entry,
      rank,
      estimatedPrize,
    };
  });
}
