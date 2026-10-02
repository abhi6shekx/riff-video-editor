import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  children,
}: {
  className?: string;
  tone?: "muted" | "accent" | "primary";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        tone === "muted" && "bg-raised text-muted",
        tone === "accent" && "bg-accent/15 text-accent",
        tone === "primary" && "bg-primary/10 text-fg",
        className,
      )}
    >
      {children}
    </span>
  );
}
