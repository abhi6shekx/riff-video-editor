import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HUBS } from "@/lib/seed";
import { useRiff } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Onboarding() {
  const finish = useRiff((s) => s.finishOnboarding);
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [picked, setPicked] = useState<string[]>(["menagerie", "pavilion", "drop"]);

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function enter() {
    const n = name.trim() || "You";
    const h = (handle.trim().replace(/^@/, "") || n.toLowerCase().replace(/\s+/g, "")).slice(0, 18);
    finish({ name: n, handle: h, bio: "New in the room. Warming up the feed." }, picked);
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg text-fg">
      <img
        src="/memes/cat.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/40" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-28 pt-14">
        {step === 0 ? (
          <div className="riff-in mt-auto space-y-6">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">Riff</p>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
              Memes are how culture talks.
            </h1>
            <p className="max-w-sm text-base leading-relaxed text-muted">
              Chat with them. Remix them. Get paid when brands want in. A quieter, sharper room than the keyboard
              apps you already tried.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="w-full sm:w-auto" onClick={() => setStep(1)}>
                Step in
              </Button>
              <Button size="lg" variant="ghost" className="w-full text-muted sm:w-auto hover:text-fg" onClick={enter}>
                Skip to feed
              </Button>
            </div>
          </div>
        ) : (
          <div className="riff-in space-y-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">Your mark</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Who is riffing?</h2>
            </div>
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-xs text-muted">
                Display name
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aanya" maxLength={24} />
              </label>
              <label className="grid gap-1.5 text-xs text-muted">
                Handle
                <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="aanya.riff" maxLength={18} />
              </label>
            </div>
            <div>
              <p className="mb-3 text-sm text-muted">Pick at least three rooms.</p>
              <div className="grid grid-cols-2 gap-2">
                {HUBS.map((h) => {
                  const on = picked.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggle(h.id)}
                      className={cn(
                        "overflow-hidden rounded-xl border text-left transition-colors duration-150",
                        on ? "border-accent" : "border-border",
                      )}
                    >
                      <img src={h.cover} alt="" className="h-14 w-full object-cover" />
                      <span className="block px-3 py-2">
                        <span className="block text-sm font-medium">{h.name}</span>
                        <span className="block text-xs text-muted">{h.tag}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Button size="lg" className="w-full" disabled={picked.length < 3} onClick={enter}>
              Enter the room
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
