import { cn } from "@/lib/utils";
import type { Person } from "@/lib/types";

const VARIANTS: Record<Person["mark"] | "squad" | "hub", { bg: string; fg: string; motif: "arc" | "bar" | "dot" | "slash" | "ring" | "plus" }> = {
  you: { bg: "bg-accent", fg: "text-accent-fg", motif: "plus" },
  aanya: { bg: "bg-primary", fg: "text-primary-fg", motif: "arc" },
  kabir: { bg: "bg-raised", fg: "text-fg", motif: "bar" },
  mira: { bg: "bg-accent/80", fg: "text-accent-fg", motif: "dot" },
  zane: { bg: "bg-primary/80", fg: "text-primary-fg", motif: "slash" },
  priya: { bg: "bg-raised", fg: "text-accent", motif: "ring" },
  nova: { bg: "bg-fg", fg: "text-bg", motif: "bar" },
  pitch: { bg: "bg-accent", fg: "text-accent-fg", motif: "slash" },
  squad: { bg: "bg-raised", fg: "text-fg", motif: "dot" },
  hub: { bg: "bg-surface", fg: "text-accent", motif: "ring" },
};

function Motif({ kind }: { kind: (typeof VARIANTS)[Person["mark"]]["motif"] }) {
  if (kind === "arc") {
    return <path d="M7 20a9 9 0 0 1 18 0" fill="none" stroke="currentColor" strokeWidth="2.4" />;
  }
  if (kind === "bar") {
    return <rect x="10" y="8" width="12" height="16" rx="2" fill="currentColor" />;
  }
  if (kind === "dot") {
    return <circle cx="16" cy="16" r="5" fill="currentColor" />;
  }
  if (kind === "slash") {
    return <path d="M11 22 L21 10" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />;
  }
  if (kind === "ring") {
    return <circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="2.2" />;
  }
  return <path d="M16 9v14M9 16h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />;
}

export function PersonMark({
  mark,
  className,
  size = "md",
}: {
  mark: Person["mark"] | "squad" | "hub";
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const v = VARIANTS[mark] ?? VARIANTS.you;
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full",
        v.bg,
        v.fg,
        size === "sm" && "size-8",
        size === "md" && "size-10",
        size === "lg" && "size-14",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="size-[62%]">
        <Motif kind={v.motif} />
      </svg>
    </span>
  );
}
