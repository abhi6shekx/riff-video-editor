import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-zinc-950 text-zinc-50"
      }
    >
      <span className="text-rose-500" aria-hidden="true">
        <TriangleAlert className="size-12" strokeWidth={2} />
      </span>
      <h1 className="text-xl font-bold font-display">Something went wrong</h1>
      <p className="max-w-md text-xs break-words text-zinc-400 font-mono">
        {errorMessage(error)}
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch (_) {}
          window.location.href = "/";
        }}
        className="mt-4 rounded-full bg-[#00f0ff] px-6 py-2.5 text-xs font-extrabold text-black hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)]"
      >
        ↻ Reset Cache & Reload App
      </button>
    </main>
  );
}
