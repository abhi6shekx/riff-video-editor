import { useEffect, useState } from "react";
import {
  Check,
  Clock,
  Crown,
  Flame,
  Gift,
  Lock,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useRiff } from "@/lib/store";
import {
  DAILY_REWARD_TIERS,
  evaluateStreakStatus,
  getTimeUntilNextMidnight,
} from "@/lib/streaks";
import { playSound } from "@/lib/sounds";
import { fireConfetti } from "@/lib/confetti";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DailyRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailyRewardModal({ isOpen, onClose }: DailyRewardModalProps) {
  const streak = useRiff((s) => s.streak);
  const claimDailyReward = useRiff((s) => s.claimDailyReward);
  const pointsWallet = useRiff((s) => s.pointsWallet);

  const [countdown, setCountdown] = useState(getTimeUntilNextMidnight());
  const [isClaiming, setIsClaiming] = useState(false);

  // Update countdown every second while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCountdown(getTimeUntilNextMidnight());
    }, 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const status = evaluateStreakStatus(streak);
  const { isClaimedToday, canClaim, activeStreak, nextStreakOnClaim, rewardTierIndex } = status;

  // The day in the 7-day cycle: 1 to 7
  const currentCycleDay = isClaimedToday
    ? ((activeStreak - 1) % 7) + 1
    : ((nextStreakOnClaim - 1) % 7) + 1;

  function handleClaim() {
    if (!canClaim || isClaiming) return;
    setIsClaiming(true);

    try {
      const res = claimDailyReward();
      if (res.success) {
        playSound("cheer");
        playSound("cash");
        if (typeof window !== "undefined") {
          fireConfetti(window.innerWidth / 2, window.innerHeight / 2, 55);
        }
        toast.success(res.message, {
          description: `+${res.pointsAwarded} RIFF Points deposited into your private wallet!`,
        });
      } else {
        toast.info(res.message);
      }
    } catch {
      toast.error("Failed to claim daily reward. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d0d] shadow-[0_0_50px_rgba(255,100,0,0.15)] text-white p-6 sm:p-7 max-h-[90vh] overflow-y-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-64 bg-gradient-to-b from-amber-500/20 via-orange-500/10 to-transparent blur-3xl" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 size-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer shadow-md"
          aria-label="Close modal"
        >
          <X className="size-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center relative pt-2">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-black shadow-[0_0_30px_rgba(245,158,11,0.4)] animate-pulse">
            <Flame className="size-9 stroke-[2.5]" />
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Sparkles className="size-3.5" />
            <span>Daily Streak &amp; Login Rewards</span>
          </div>

          <h2 className="mt-1 text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
            {activeStreak} Day Streak!
          </h2>

          <p className="mt-1.5 text-xs sm:text-sm text-white/60 max-w-sm mx-auto leading-relaxed">
            {isClaimedToday
              ? "Awesome job! You've logged in and claimed today's reward. Return tomorrow to keep the flame alive!"
              : "Log in daily to build your streak and earn free RIFF points! Keep the flame going."}
          </p>

          <div className="mt-3 inline-flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3.5 py-1.5 text-xs">
            <div className="flex items-center gap-1 text-white/70">
              <Trophy className="size-3.5 text-yellow-400" />
              <span>Best Streak:</span>
              <strong className="text-white font-bold">{Math.max(streak?.bestStreak || 0, activeStreak)} Days</strong>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-1 text-white/70">
              <Lock className="size-3 text-[#d4ff00]" />
              <span>Private Wallet:</span>
              <strong className="text-[#d4ff00] font-bold">{pointsWallet.toLocaleString()} pts</strong>
            </div>
          </div>
        </div>

        {/* 7-Day Reward Grid */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
              7-Day Reward Track
            </span>
            <span className="text-[11px] font-semibold text-amber-400/90">
              Day {currentCycleDay} of 7
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {DAILY_REWARD_TIERS.map((tier, idx) => {
              const dayNum = tier.day;
              const isPastClaimed = isClaimedToday
                ? dayNum <= currentCycleDay
                : dayNum < currentCycleDay;
              const isCurrentToClaim = !isClaimedToday && dayNum === currentCycleDay;
              const isGrandDay = dayNum === 7;

              return (
                <div
                  key={tier.day}
                  className={cn(
                    "relative flex flex-col items-center justify-between rounded-2xl p-2.5 sm:p-2 border transition-all text-center",
                    isGrandDay && "col-span-2 sm:col-span-1",
                    isCurrentToClaim
                      ? "border-[#d4ff00] bg-[#d4ff00]/15 shadow-[0_0_20px_rgba(212,255,0,0.25)] ring-1 ring-[#d4ff00]/60 scale-105"
                      : isPastClaimed
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-white/[0.03] text-white/60",
                  )}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
                    Day {tier.day}
                  </span>

                  <div className="my-1">
                    {isPastClaimed ? (
                      <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Check className="size-4 stroke-[3]" />
                      </div>
                    ) : isCurrentToClaim ? (
                      <div className="flex size-7 items-center justify-center rounded-full bg-[#d4ff00] text-black shadow-md shadow-[#d4ff00]/40 animate-bounce">
                        {isGrandDay ? <Crown className="size-4" /> : <Gift className="size-4" />}
                      </div>
                    ) : (
                      <div className="flex size-7 items-center justify-center rounded-full bg-white/5 text-white/40 border border-white/10">
                        {isGrandDay ? <Crown className="size-4 text-amber-400/50" /> : <Lock className="size-3" />}
                      </div>
                    )}
                  </div>

                  <span
                    className={cn(
                      "text-xs font-black mt-1",
                      isCurrentToClaim
                        ? "text-[#d4ff00]"
                        : isPastClaimed
                          ? "text-emerald-400 line-through opacity-80"
                          : "text-white/80",
                    )}
                  >
                    +{tier.points}
                  </span>

                  <span className="text-[9px] text-white/40">pts</span>

                  {tier.badge && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500 px-1.5 py-0.2 text-[8px] font-black text-black shadow-sm">
                      👑 BIG
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Claim Action / Countdown Section */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          {canClaim ? (
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="w-full rounded-2xl bg-gradient-to-r from-[#d4ff00] via-yellow-400 to-[#d4ff00] py-3.5 px-6 font-display font-black text-black shadow-[0_0_30px_rgba(212,255,0,0.35)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base cursor-pointer disabled:opacity-50"
            >
              <Gift className="size-5" />
              <span>
                Claim Day {nextStreakOnClaim} Reward (+{DAILY_REWARD_TIERS[rewardTierIndex].points} Points)
              </span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-left">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    <Check className="size-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Today&apos;s Reward Claimed!</p>
                    <p className="text-[11px] text-white/40">Streak is safe. Next reward unlocks at midnight.</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-xl bg-black/50 border border-white/10 px-3 py-1.5 text-xs font-mono text-amber-400 font-bold shrink-0">
                  <Clock className="size-3.5 text-white/40" />
                  <span>
                    {String(countdown.hours).padStart(2, "0")}:
                    {String(countdown.minutes).padStart(2, "0")}:
                    {String(countdown.seconds).padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Quick dismiss button */}
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl bg-white/10 hover:bg-white/15 active:scale-[0.99] border border-white/15 py-3 text-sm font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Done &middot; Continue to Feed</span>
              </button>
            </div>
          )}

          {/* Privacy Guarantee Note */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
            <Lock className="size-3 text-[#d4ff00]/70" />
            <span>
              <strong>100% Private:</strong> Your wallet balance and streak rewards are strictly visible only to you.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
