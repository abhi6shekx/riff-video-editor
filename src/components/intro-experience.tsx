import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Flame, 
  Clapperboard, 
  Gift, 
  ArrowRight, 
  X, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Zap,
  Lock,
  Layers,
  Music,
  Share2,
  Pause,
  Play
} from "lucide-react";
import { RiffIcon } from "@/components/riff-navbar-lockup";
import { playSound } from "@/lib/sounds";
import { fireConfetti } from "@/lib/confetti";
import { useRiff } from "@/lib/store";
import { cn } from "@/lib/utils";

interface IntroExperienceProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimBonus?: () => void;
}

const TOTAL_SLIDES = 4;
const SLIDE_DURATION_MS = 5000; // 5 seconds per story slide

export function IntroExperience({
  isOpen,
  onClose,
  onClaimBonus,
}: IntroExperienceProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100% for active slide
  const [isScratchRevealed, setIsScratchRevealed] = useState(false);
  const [hasClaimedBonus, setHasClaimedBonus] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const pointsWallet = useRiff((s) => s.pointsWallet);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const alreadyClaimed = localStorage.getItem("riff_welcome_bonus_claimed") === "true";
      setHasClaimedBonus(alreadyClaimed);
      if (alreadyClaimed) {
        setIsScratchRevealed(true);
      }
    }
  }, [isOpen]);

  // Story-style auto advance timer
  useEffect(() => {
    if (!isOpen || isClosing) return;

    // Slide 3 (Last slide) does not auto-advance so user can scratch & claim
    if (currentSlide === TOTAL_SLIDES - 1) {
      setProgress(100);
      return;
    }

    if (isPaused) return;

    const intervalTime = 50;
    const increment = (intervalTime / SLIDE_DURATION_MS) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Go to next slide
          handleNextSlide();
          return 0;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isOpen, currentSlide, isPaused, isClosing]);

  if (!isOpen) return null;

  const handleNextSlide = () => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      if (soundEnabled) playSound("pop");
      setCurrentSlide((prev) => prev + 1);
      setProgress(0);
    } else {
      handleFinish();
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      if (soundEnabled) playSound("pop");
      setCurrentSlide((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleFinish = () => {
    setIsClosing(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("riff_intro_seen_v1", "true");
    }
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  // Scratch card reveal interaction
  const handleScratchReveal = () => {
    if (isScratchRevealed) return;

    if (soundEnabled) {
      playSound("cash");
      setTimeout(() => playSound("cheer"), 200);
    }
    fireConfetti(window.innerWidth / 2, window.innerHeight * 0.42, 60);
    setIsScratchRevealed(true);
  };

  // Claim welcome bonus and enter app
  const handleClaimAndEnter = () => {
    if (!hasClaimedBonus) {
      if (soundEnabled) {
        playSound("cash");
        setTimeout(() => playSound("cheer"), 180);
      }
      fireConfetti(window.innerWidth / 2, window.innerHeight * 0.45, 75);

      // Award 50 points to wallet
      useRiff.setState((state) => ({
        pointsWallet: (state.pointsWallet || 0) + 50,
      }));

      if (typeof window !== "undefined") {
        localStorage.setItem("riff_welcome_bonus_claimed", "true");
      }
      setHasClaimedBonus(true);
      onClaimBonus?.();
    }

    setTimeout(() => {
      handleFinish();
    }, 600);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-[#060709] text-white transition-opacity duration-300 select-none",
        isClosing ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      )}
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 25%, rgba(212, 255, 0, 0.12) 0%, transparent 60%),
          radial-gradient(circle at 80% 80%, rgba(0, 240, 255, 0.08) 0%, transparent 50%),
          linear-gradient(180deg, #090a0f 0%, #050608 100%)
        `,
      }}
      onPointerDown={() => setIsPaused(true)}
      onPointerUp={() => setIsPaused(false)}
      onPointerCancel={() => setIsPaused(false)}
    >
      {/* AMBIENT BACKGROUND GLOW GRID */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* TOP HEADER & STORY PROGRESS BAR */}
      <div className="relative z-20 w-full px-5 pt-4 pb-2 max-w-lg mx-auto">
        {/* Progress Bar Segments (Instagram Stories Style) */}
        <div className="flex items-center gap-1.5 mb-4">
          {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => {
            let widthPercent = 0;
            if (idx < currentSlide) widthPercent = 100;
            else if (idx === currentSlide) widthPercent = progress;

            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (soundEnabled) playSound("pop");
                  setCurrentSlide(idx);
                  setProgress(0);
                }}
                className="h-1.5 flex-1 rounded-full overflow-hidden bg-white/15 cursor-pointer relative"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00f2fe] to-[#d4ff00] shadow-[0_0_8px_rgba(212,255,0,0.8)] transition-all duration-75"
                  style={{ width: `${widthPercent}%` }}
                />
              </button>
            );
          })}
        </div>

        {/* Top Control Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiffIcon size={28} />
            <span className="font-display font-black tracking-wider text-sm text-white">
              RIFF
            </span>
            <span className="rounded-full bg-[#d4ff00]/15 border border-[#d4ff00]/30 px-2 py-0.5 text-[9px] font-black tracking-widest text-[#d4ff00] uppercase">
              Intro
            </span>
            {isPaused && (
              <span className="flex items-center gap-1 text-[10px] text-white/50 font-bold bg-white/10 px-2 py-0.5 rounded-full">
                <Pause className="size-2.5" /> Paused
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSoundEnabled(!soundEnabled);
              }}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition"
              title={soundEnabled ? "Mute sound" : "Enable sound"}
            >
              {soundEnabled ? <Volume2 className="size-4 text-[#d4ff00]" /> : <VolumeX className="size-4" />}
            </button>

            {/* Skip Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleFinish();
              }}
              className="flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 text-xs font-bold text-white/80 transition"
            >
              Skip
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SLIDE CONTENT AREA */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 max-w-lg mx-auto w-full text-center">
        {/* SLIDE 0: BRAND REVEAL & THE HOOK */}
        {currentSlide === 0 && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            {/* Pulsing Animated Brand Mark */}
            <div className="relative mb-6 flex items-center justify-center">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-[#00f2fe]/30 to-[#d4ff00]/30 blur-xl animate-pulse" />
              <div className="relative rounded-3xl p-3 border border-white/20 bg-black/60 shadow-[0_0_40px_rgba(212,255,0,0.25)]">
                <RiffIcon size={76} />
              </div>
            </div>

            {/* Animated Equalizer Waveform */}
            <div className="flex items-end justify-center gap-1.5 h-8 mb-5">
              {[18, 28, 14, 32, 22, 30, 16, 26, 32, 20].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-gradient-to-t from-[#00f2fe] to-[#d4ff00] animate-pulse"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 120}ms`,
                    animationDuration: "900ms",
                  }}
                />
              ))}
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d4ff00]/30 bg-[#d4ff00]/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#d4ff00] mb-3">
              <Sparkles className="size-3 text-[#d4ff00]" />
              Welcome to Next-Gen Social
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-3">
              Create in Memes. <br />
              <span className="bg-gradient-to-r from-[#00f2fe] via-[#d4ff00] to-[#00f2fe] bg-clip-text text-transparent">
                Remix Culture &amp; Earn.
              </span>
            </h1>

            <p className="text-sm text-white/60 max-w-sm mb-6 leading-relaxed">
              India's first creator platform combining a viral social feed, full-featured multi-track video studio, and daily streak rewards.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80">
                ⚡ 100% Free
              </span>
              <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80">
                🎬 Pro Reel Studio
              </span>
              <span className="rounded-xl border border-white/10 bg-[#d4ff00]/10 text-[#d4ff00] px-3 py-1.5 text-xs font-bold">
                💰 Daily Cashouts
              </span>
            </div>
          </div>
        )}

        {/* SLIDE 1: MULTI-TRACK REEL STUDIO */}
        {currentSlide === 1 && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            <div className="relative mb-5 flex size-20 items-center justify-center rounded-3xl border border-[#00f2fe]/40 bg-[#00f2fe]/10 shadow-[0_0_35px_rgba(0,242,254,0.3)]">
              <Clapperboard className="size-10 text-[#00f2fe]" />
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-[#d4ff00] text-[10px] font-black text-black">
                HD
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00f2fe]/30 bg-[#00f2fe]/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#00f2fe] mb-3">
              <Zap className="size-3 text-[#00f2fe]" />
              Built-in Video Studio
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              Create Viral Reels <br />
              <span className="text-[#00f2fe]">Bina Kisi Third-Party App Ke</span>
            </h2>

            <p className="text-xs sm:text-sm text-white/60 max-w-sm mb-6 leading-relaxed">
              Quick mode se instant 9:16 reels post karo, ya <strong>Multi-Track Studio</strong> khol kar clips trim, audio beats sync, aur meme overlays lagao.
            </p>

            {/* Feature Mockup Card */}
            <div className="w-full rounded-2xl border border-white/10 bg-[#10121a] p-4 text-left shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                <span className="text-xs font-bold text-white/80 flex items-center gap-2">
                  <Layers className="size-4 text-[#d4ff00]" />
                  Multi-Track Timeline
                </span>
                <span className="text-[10px] font-mono text-[#00f2fe] bg-[#00f2fe]/10 px-2 py-0.5 rounded-full">
                  60 FPS Export
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-white/5 p-2 flex items-center gap-2">
                  <Music className="size-3.5 text-pink-400 shrink-0" />
                  <span className="truncate">Phonk &amp; Beats</span>
                </div>
                <div className="rounded-lg bg-white/5 p-2 flex items-center gap-2">
                  <Sparkles className="size-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Meme Stickers</span>
                </div>
                <div className="rounded-lg bg-white/5 p-2 flex items-center gap-2">
                  <Zap className="size-3.5 text-[#d4ff00] shrink-0" />
                  <span className="truncate">Quick / Studio Toggle</span>
                </div>
                <div className="rounded-lg bg-white/5 p-2 flex items-center gap-2">
                  <Share2 className="size-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">Direct Feed Publish</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2: DAILY STREAKS & MONETIZATION */}
        {currentSlide === 2 && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            <div className="relative mb-5 flex size-20 items-center justify-center rounded-3xl border border-amber-500/40 bg-amber-500/10 shadow-[0_0_35px_rgba(245,158,11,0.3)]">
              <Flame className="size-10 text-amber-400 animate-pulse" />
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-[#d4ff00] text-[10px] font-black text-black">
                🔥
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-300 mb-3">
              <Flame className="size-3 text-amber-400" />
              Daily Streaks &amp; Earnings
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              Roz Login Karo, <br />
              <span className="text-amber-400">Streak Banao &amp; Coins Jeeto</span>
            </h2>

            <p className="text-xs sm:text-sm text-white/60 max-w-sm mb-6 leading-relaxed">
              Har roz app kholne par streak badge badhega aur daily free points milenge. Creator wallet me points save hote hain.
            </p>

            {/* Wallet & Streaks Preview Card */}
            <div className="w-full rounded-2xl border border-white/10 bg-[#121118] p-4 text-left shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔥</span>
                  <div>
                    <p className="text-xs font-black text-white">Daily Login Streak</p>
                    <p className="text-[10px] text-white/40">Consecutive days active</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 text-xs font-black">
                  +10 pts/day
                </span>
              </div>

              <div className="rounded-xl bg-white/[0.04] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-[#d4ff00]" />
                  <div>
                    <p className="text-[11px] font-bold text-white">Private Creator Wallet</p>
                    <p className="text-[9px] text-white/40">Only you can see your coins</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-[#d4ff00]">{pointsWallet} pts</p>
                  <p className="text-[9px] text-emerald-400 font-semibold">Active</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: INTERACTIVE LUCKY SCRATCH BONUS CLAIM */}
        {currentSlide === 3 && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            {/* Glowing Gift Box */}
            <div className="relative mb-5 flex size-24 items-center justify-center rounded-3xl border border-[#d4ff00]/50 bg-gradient-to-tr from-[#d4ff00]/20 to-[#00f2fe]/20 shadow-[0_0_50px_rgba(212,255,0,0.35)] animate-bounce">
              <Gift className="size-12 text-[#d4ff00]" />
              <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-[#00f2fe] text-xs font-black text-black">
                ✨
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d4ff00]/40 bg-[#d4ff00]/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#d4ff00] mb-3">
              <Sparkles className="size-3 text-[#d4ff00]" />
              Day 1 Lucky Rookie Drop
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
              Welcome Bonus <br />
              <span className="bg-gradient-to-r from-[#d4ff00] via-white to-[#00f2fe] bg-clip-text text-transparent">
                Mystery Reward Card!
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-white/60 max-w-sm mb-4 leading-relaxed">
              Naye creator ka starter pack! Niche diye card par tap karke apna lucky gift reveal karein:
            </p>

            {/* GAMIFIED LUCKY SCRATCH / REVEAL CARD */}
            {!isScratchRevealed ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleScratchReveal();
                }}
                className="w-full rounded-2xl border-2 border-dashed border-[#d4ff00]/60 bg-gradient-to-br from-[#1c1a08] to-[#12131a] p-6 text-center cursor-pointer hover:border-[#d4ff00] hover:scale-[1.02] active:scale-[0.98] transition shadow-[0_0_35px_rgba(212,255,0,0.2)] group"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="size-12 rounded-full bg-[#d4ff00]/20 flex items-center justify-center group-hover:scale-110 transition">
                    <Sparkles className="size-6 text-[#d4ff00] animate-spin" />
                  </div>
                  <p className="text-lg font-black text-white tracking-wide">
                    🎁 TAP TO REVEAL REWARD
                  </p>
                  <p className="text-xs text-[#d4ff00] font-semibold">
                    Touch anywhere on this box to scratch &amp; claim!
                  </p>
                </div>
              </button>
            ) : (
              <div className="w-full rounded-2xl border border-[#d4ff00]/50 bg-gradient-to-r from-[#14180d] via-[#1c2211] to-[#14180d] p-5 text-center shadow-[0_0_40px_rgba(212,255,0,0.3)] animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-center gap-3">
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00f2fe]">
                      🎉 Lucky Drop Unlocked!
                    </span>
                    <p className="text-3xl font-black text-[#d4ff00] tracking-wide">+50 POINTS</p>
                    <p className="text-xs text-white/60">Starter Creator Tier Credited</p>
                  </div>

                  {hasClaimedBonus ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-1 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="size-4" /> Claimed
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#d4ff00] text-black px-3.5 py-1 text-xs font-black animate-pulse shadow-[0_0_15px_rgba(212,255,0,0.6)]">
                      Ready to Claim
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM ACTIONS / NAVIGATION */}
      <div className="relative z-20 w-full px-5 py-5 max-w-lg mx-auto">
        {currentSlide < TOTAL_SLIDES - 1 ? (
          <div className="flex items-center gap-3">
            {currentSlide > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevSlide();
                }}
                className="h-12 px-5 rounded-2xl border border-white/15 bg-white/5 text-sm font-bold text-white hover:bg-white/10 transition"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNextSlide();
              }}
              className="flex-1 h-12 rounded-2xl bg-[#d4ff00] text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-[#c2ea00] active:scale-[0.98] transition shadow-[0_0_25px_rgba(212,255,0,0.3)]"
            >
              Continue
              <ArrowRight className="size-4 stroke-[3]" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isScratchRevealed) {
                handleScratchReveal();
              } else {
                handleClaimAndEnter();
              }
            }}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#00f2fe] via-[#d4ff00] to-[#00f2fe] p-[1.5px] active:scale-[0.98] transition shadow-[0_0_35px_rgba(212,255,0,0.4)]"
          >
            <div className="w-full h-full rounded-[14px] bg-[#0c0d12] hover:bg-[#12141c] flex items-center justify-center gap-2.5 text-white font-black text-base transition">
              <Gift className="size-5 text-[#d4ff00]" />
              <span>
                {!isScratchRevealed
                  ? "Tap to Reveal Bonus (+50 Pts)"
                  : hasClaimedBonus
                  ? "Enter RIFF Feed"
                  : "Claim +50 Points & Enter RIFF"}
              </span>
              <ArrowRight className="size-5 text-[#00f2fe] stroke-[2.5]" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
