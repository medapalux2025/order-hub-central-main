import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Public visit tracking for external landing pages.
 *
 * Security model:
 * - only a landing page slug is accepted; nothing else is read from the request
 * - the counter is incremented atomically by a security-definer SQL function
 * - inactive or unknown slugs are silently ignored (no data disclosure)
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
};

const payloadSchema = z.object({
  landing_page_slug: z.string().trim().min(1).max(120),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS });

export const Route = createFileRoute("/api/public/visits")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        const parsed = payloadSchema.safeParse(raw);
        if (!parsed.success) return json({ error: "validation_failed" }, 422);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.rpc("track_landing_page_visit", {
          _slug: parsed.data.landing_page_slug,
        } as never);

        if (error) {
          console.error("visit tracking failed", error);
          return json({ error: "tracking_failed" }, 500);
        }

        return json({ success: true });
      },
    },
  },
});
