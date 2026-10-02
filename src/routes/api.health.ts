import { createFileRoute } from "@tanstack/react-router";
import { checkServerHealth } from "@/lib/server/health";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const { ok, data } = await checkServerHealth();
        return new Response(JSON.stringify(data), {
          status: ok ? 200 : 503,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        });
      },
    },
  },
  component: () => null,
});
