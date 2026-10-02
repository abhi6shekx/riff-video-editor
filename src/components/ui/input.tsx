import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-raised px-3.5 text-sm text-fg placeholder:text-faint outline-none transition-colors duration-150 focus:border-muted focus:ring-2 focus:ring-accent/30",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border border-border bg-raised px-3.5 py-3 text-sm text-fg placeholder:text-faint outline-none transition-colors duration-150 focus:border-muted focus:ring-2 focus:ring-accent/30",
        className,
      )}
      {...props}
    />
  );
}
