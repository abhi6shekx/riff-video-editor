/**
 * RIFF Streaks & Daily Login Rewards
 * 
 * Provides daily engagement rewards, streak tracking, and gamified tier bonuses.
 * All wallet points earned are strictly private to the user's personal wallet.
 */

export type DailyRewardTier = {
  day: number;
  points: number;
  label: string;
  badge?: string;
};

export const DAILY_REWARD_TIERS: readonly DailyRewardTier[] = [
  { day: 1, points: 2, label: "+2 pts" },
  { day: 2, points: 3, label: "+3 pts" },
  { day: 3, points: 5, label: "+5 pts" },
  { day: 4, points: 7, label: "+7 pts" },
  { day: 5, points: 10, label: "+10 pts" },
  { day: 6, points: 12, label: "+12 pts" },
  { day: 7, points: 20, label: "+20 pts", badge: "Streak Legend 👑" },
] as const;

export type StreakData = {
  currentStreak: number;
  bestStreak: number;
  lastClaimDate: string | null; // "YYYY-MM-DD" in local time
  totalDaysClaimed: number;
};

export const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  bestStreak: 0,
  lastClaimDate: null,
  totalDaysClaimed: 0,
};

export function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getYesterdayLocalDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

export function getTimeUntilNextMidnight(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
}

export function evaluateStreakStatus(streak: StreakData | undefined) {
  const safeStreak: StreakData = streak || DEFAULT_STREAK;
  const today = getLocalDateString();
  const yesterday = getYesterdayLocalDateString();

  const isClaimedToday = safeStreak.lastClaimDate === today;

  if (isClaimedToday) {
    const activeStreak = Math.max(1, safeStreak.currentStreak || 1);
    const tierIdx = Math.min(6, Math.max(0, (activeStreak - 1) % 7));
    return {
      isClaimedToday: true,
      canClaim: false,
      activeStreak,
      nextStreakOnClaim: activeStreak + 1,
      rewardTierIndex: tierIdx,
      rewardTier: DAILY_REWARD_TIERS[tierIdx],
      displayDay: tierIdx + 1,
    };
  }

  const claimedYesterday = safeStreak.lastClaimDate === yesterday;

  if (claimedYesterday || safeStreak.lastClaimDate === null) {
    const nextStreak = safeStreak.lastClaimDate === null
      ? Math.max(1, (safeStreak.currentStreak || 0) + 1)
      : (safeStreak.currentStreak || 0) + 1;
    const tierIdx = Math.min(6, Math.max(0, (nextStreak - 1) % 7));
    return {
      isClaimedToday: false,
      canClaim: true,
      activeStreak: safeStreak.currentStreak || 0,
      nextStreakOnClaim: nextStreak,
      rewardTierIndex: tierIdx,
      rewardTier: DAILY_REWARD_TIERS[tierIdx],
      displayDay: tierIdx + 1,
    };
  }

  // Missed streak: resets to Day 1
  return {
    isClaimedToday: false,
    canClaim: true,
    activeStreak: 0,
    nextStreakOnClaim: 1,
    rewardTierIndex: 0,
    rewardTier: DAILY_REWARD_TIERS[0],
    displayDay: 1,
  };
}
