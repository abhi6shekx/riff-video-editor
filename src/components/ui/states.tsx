import type { ReactNode } from "react";
import { AlertCircle, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 1. PageSkeleton
 * Accessible shimmer skeleton used during route transitions and data loading.
 */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading page content"
      aria-busy="true"
      className={cn("mx-auto w-full max-w-3xl space-y-6 px-4 py-8 animate-pulse", className)}
    >
      {/* Heading Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-xl bg-white/[0.08]" />
        <div className="h-4 w-72 rounded-lg bg-white/[0.04]" />
      </div>

      {/* Filter / Tabs Skeleton */}
      <div className="flex gap-2 pt-2">
        <div className="h-8 w-20 rounded-full bg-white/[0.08]" />
        <div className="h-8 w-24 rounded-full bg-white/[0.05]" />
        <div className="h-8 w-20 rounded-full bg-white/[0.05]" />
      </div>

      {/* Content Cards Skeleton */}
      <div className="space-y-4 pt-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="rounded-2xl border border-white/5 bg-[#0f0f14] p-5 space-y-4 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-white/[0.08]" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-32 rounded bg-white/[0.08]" />
                <div className="h-2.5 w-20 rounded bg-white/[0.04]" />
              </div>
            </div>
            <div className="h-48 w-full rounded-xl bg-white/[0.04]" />
            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-4">
                <div className="h-4 w-12 rounded bg-white/[0.06]" />
                <div className="h-4 w-12 rounded bg-white/[0.06]" />
              </div>
              <div className="h-4 w-8 rounded bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * 2. InlineLoader
 * Lightweight spinner for inline actions, buttons, and subcomponents.
 */
export function InlineLoader({
  label = "Loading...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn("flex items-center justify-center gap-2.5 py-6 text-xs text-white/50", className)}
    >
      <div className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-[#00f0ff]" />
      {label && <span>{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * 3. EmptyState
 * Reusable empty state with icon, title, description, and action button.
 */
export function EmptyState({
  icon = "👀",
  title = "No content found",
  description = "There is nothing here yet. Check back later or explore new creators.",
  actionLabel,
  onAction,
  className,
}: {
  icon?: ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        "rounded-3xl border border-white/10 bg-[#0f0f14]/80 p-10 text-center shadow-xl backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto mb-3 flex size-12 items-center justify-center text-3xl">
        {icon}
      </div>
      <h3 className="font-display text-base font-bold text-white">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-xs text-white/50 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          size="sm"
          onClick={onAction}
          className="mt-5 rounded-xl bg-[#d4ff00] text-black font-bold text-xs hover:opacity-90"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * 4. SearchEmptyState
 * Specialized empty state for search queries.
 */
export function SearchEmptyState({
  query,
  onReset,
  className,
}: {
  query: string;
  onReset?: () => void;
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label="No search results"
      className={cn(
        "rounded-3xl border border-white/10 bg-[#0f0f14]/80 p-10 text-center shadow-xl backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-white/[0.04] text-white/60">
        <Search className="size-6 text-white/40" />
      </div>
      <h3 className="font-display text-base font-bold text-white">No results found</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs text-white/50 leading-relaxed">
        We couldn&apos;t find anything matching &ldquo;{query}&rdquo;. Check for typos or try searching for another topic or creator.
      </p>
      {onReset && (
        <Button
          size="sm"
          onClick={onReset}
          className="mt-5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20"
        >
          Reset search
        </Button>
      )}
    </div>
  );
}

/**
 * 5. ErrorState
 * Standard error boundary presentation.
 */
export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this section properly. Please try again.",
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "rounded-3xl border border-rose-500/20 bg-[#140c0f] p-8 text-center shadow-xl",
        className,
      )}
    >
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
        <AlertCircle className="size-6" />
      </div>
      <h3 className="font-display text-base font-bold text-white">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs text-white/60 leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-500/30"
        >
          <RefreshCw className="size-3.5" />
          <span>Try again</span>
        </Button>
      )}
    </div>
  );
}
