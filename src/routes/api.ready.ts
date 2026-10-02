import { createFileRoute } from "@tanstack/react-router";
import { checkServerHealth } from "@/lib/server/health";

export const Route = createFileRoute("/api/ready")({
  server: {
    handlers: {
      GET: async () => {
        const { ok, data } = await checkServerHealth();
        return new Response(
          JSON.stringify({
            ready: ok,
            status: data.status,
            timestamp: data.timestamp,
          }),
          {
            status: ok ? 200 : 503,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          },
        );
      },
    },
  },
  component: () => null,
});
