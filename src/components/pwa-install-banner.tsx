import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiffIcon } from "@/components/riff-navbar-lockup";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if dismissed recently
    const dismissedAt = localStorage.getItem("riff_pwa_dismissed_at");
    if (dismissedAt) {
      const days = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < 3) return; // Wait 3 days before prompting again if dismissed
    }

    // Check iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;

    if (isIosDevice && !isStandalone) {
      setIsIos(true);
      setShowBanner(true);
    }

    // Android & Chrome beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Register Service Worker
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.debug("PWA ServiceWorker registration skipped:", err);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback: Open PWA installation guide page
      window.location.href = "/?install=1&platform=android";
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("riff_pwa_dismissed_at", String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Floating Bottom PWA Install Banner */}
      <div className="fixed bottom-20 inset-x-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-[#121624]/95 p-3.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <RiffIcon size={36} className="shrink-0" />
            <div>
              <h4 className="font-display text-sm font-black text-white flex items-center gap-1.5">
                Install RIFF App <Smartphone className="size-3.5 text-accent inline" />
              </h4>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Add to Home Screen for fast creation & 9:16 reels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="bg-gradient-to-r from-accent to-cyan-400 text-black font-extrabold text-xs h-8 px-3 shadow-[0_0_12px_rgba(0,242,254,0.3)] hover:brightness-110"
            >
              <Download className="size-3.5 mr-1" />
              Install
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Installation Guide Dialog */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-w-sm rounded-3xl border border-white/10 bg-raised p-5 text-center space-y-4 shadow-2xl">
            <RiffIcon size={48} className="mx-auto" />
            <h3 className="font-display text-lg font-black text-white">Install on iPhone / iPad</h3>
            <ol className="text-xs text-zinc-300 space-y-2 text-left bg-surface/50 p-3 rounded-2xl border border-white/5">
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-bold">1</span>
                Tap the <strong>Share</strong> button in Safari toolbar.
              </li>
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-bold">2</span>
                Scroll down and tap <strong>"Add to Home Screen"</strong>.
              </li>
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-bold">3</span>
                Tap <strong>Add</strong> at top right to launch.
              </li>
            </ol>
            <Button onClick={() => setShowIosGuide(false)} className="w-full bg-surface text-white hover:bg-white/10">
              Got it!
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
