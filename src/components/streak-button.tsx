import { useState } from "react";
import { Flame } from "lucide-react";
import { useRiff } from "@/lib/store";
import { evaluateStreakStatus } from "@/lib/streaks";
import { DailyRewardModal } from "@/components/daily-reward-modal";
import { cn } from "@/lib/utils";

interface StreakButtonProps {
  className?: string;
  variant?: "compact" | "full" | "pill";
}

export function StreakButton({ className, variant = "pill" }: StreakButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const streak = useRiff((s) => s.streak);
  const status = evaluateStreakStatus(streak);

  const { canClaim, activeStreak } = status;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "group relative flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer select-none",
          variant === "compact" &&
            "size-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20",
          variant === "pill" &&
            "rounded-full border border-orange-500/30 bg-gradient-to-r from-orange-500/15 to-amber-500/10 px-2.5 py-1 text-xs font-bold text-orange-300 hover:border-orange-500/60 hover:bg-orange-500/25 shadow-[0_0_15px_rgba(249,115,22,0.15)]",
          variant === "full" &&
            "w-full justify-between rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-black/40 to-amber-500/10 p-3.5 hover:border-orange-500/50 transition-all",
          className,
        )}
        title="Daily Streak & Login Rewards"
      >
        {variant === "compact" ? (
          <>
            <Flame className="size-4 text-orange-400 fill-orange-400/30" />
            <span className="text-[11px] font-black text-white">{activeStreak}</span>
            {canClaim && (
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[#d4ff00] animate-ping" />
            )}
            {canClaim && (
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[#d4ff00]" />
            )}
          </>
        ) : variant === "pill" ? (
          <>
            <Flame className="size-3.5 text-orange-400 fill-orange-400" />
            <span className="font-extrabold text-white text-[11px]">{activeStreak}d</span>
            {canClaim && (
              <span className="ml-0.5 rounded-full bg-[#d4ff00] px-1.5 py-0.2 text-[9px] font-black text-black animate-pulse">
                Claim
              </span>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                <Flame className="size-5 fill-orange-400 text-orange-400" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-black text-white">{activeStreak} Day Streak</p>
                  {canClaim && (
                    <span className="rounded-full bg-[#d4ff00] px-1.5 py-0.2 text-[9px] font-black text-black">
                      Reward Ready
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/40">
                  {canClaim ? "Tap to claim today's reward!" : "Streak safe · Claimed for today"}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-orange-400 group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </div>
        )}
      </button>

      <DailyRewardModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
