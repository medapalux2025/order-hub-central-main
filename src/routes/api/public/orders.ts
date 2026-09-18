import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Public order intake endpoint for external landing pages.
 *
 * Security model:
 * - prices are NEVER read from the request; they come from the products table
 * - payload is validated with zod
 * - API key authentication is preferred: X-API-Key resolves the landing page
 *   and its connected product automatically
 * - requests are rate-limited per API key (60 req/min by default)
 * - every request is written to api_request_logs for audit and rate limiting
 * - the endpoint writes with the server-only service role, never exposed to the browser
 */

type LandingPageRow = {
  id: string;
  product_id: string | null;
  is_active: boolean;
  api_key_hash: string | null;
};
type ProductRow = { id: string; name: string; price: number; is_active: boolean };

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 60;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-api-key",
  "Content-Type": "application/json",
};

const payloadSchema = z.object({
  product_id: z.string().uuid().optional(),
  product_slug: z.string().min(1).max(120).optional(),
  landing_page_id: z.string().uuid().optional(),
  landing_page_slug: z.string().min(1).max(120).optional(),
  customer_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(30),
  city: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  source: z.string().trim().max(60).optional(),
  campaign: z.string().trim().max(160).optional().nullable(),
  utm_source: z.string().trim().max(60).optional().nullable(),
  utm_medium: z.string().trim().max(60).optional().nullable(),
  utm_campaign: z.string().trim().max(160).optional().nullable(),
  utm_content: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS });

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

async function logRequest(
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  {
    landing_page_id,
    api_key_hash,
    method,
    path,
    ip,
    origin,
    status_code,
    error_message,
  }: {
    landing_page_id: string | null;
    api_key_hash: string | null;
    method: string;
    path: string;
    ip: string | null;
    origin: string | null;
    status_code: number;
    error_message?: string;
  },
) {
  const { error } = await supabaseAdmin.from("api_request_logs").insert({
    landing_page_id,
    api_key_hash,
    method,
    path,
    ip,
    origin,
    status_code,
    error_message: error_message ?? null,
  } as never);
  if (error) {
    console.error("api_request_logs insert failed", error);
  }
}

async function checkRateLimit(
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  apiKeyHash: string,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from("api_request_logs")
    .select("*", { count: "exact", head: true })
    .eq("api_key_hash", apiKeyHash)
    .gte("created_at", windowStart);

  if (error) {
    console.error("rate limit check failed", error);
    return false;
  }

  return (count ?? 0) >= RATE_LIMIT_MAX_REQUESTS;
}

export const Route = createFileRoute("/api/public/orders")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const path = new URL(request.url).pathname;
        const method = request.method;
        const ip = getClientIp(request);
        const origin = request.headers.get("origin");
        const apiKeyHeader = request.headers.get("x-api-key");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          await logRequest(supabaseAdmin, {
            landing_page_id: null,
            api_key_hash: null,
            method,
            path,
            ip,
            origin,
            status_code: 400,
            error_message: "invalid_json",
          });
          return json({ error: "invalid_json" }, 400);
        }

        const parsed = payloadSchema.safeParse(raw);
        if (!parsed.success) {
          await logRequest(supabaseAdmin, {
            landing_page_id: null,
            api_key_hash: null,
            method,
            path,
            ip,
            origin,
            status_code: 422,
            error_message: "validation_failed",
          });
          return json(
            {
              error: "validation_failed",
              issues: parsed.error.issues.map((i) => i.path.join(".") + ": " + i.message),
            },
            422,
          );
        }
        const input = parsed.data;

        let landingPage: LandingPageRow | null = null;
        let apiKeyHash: string | null = null;

        // API key authentication: resolves landing page + product automatically
        if (apiKeyHeader) {
          apiKeyHash = await sha256(apiKeyHeader);

          const { data } = await supabaseAdmin
            .from("landing_pages")
            .select("id, product_id, is_active, api_key_hash")
            .eq("api_key_hash", apiKeyHash)
            .maybeSingle();

          if (!data) {
            await logRequest(supabaseAdmin, {
              landing_page_id: null,
              api_key_hash: apiKeyHash,
              method,
              path,
              ip,
              origin,
              status_code: 401,
              error_message: "invalid_api_key",
            });
            return json({ error: "invalid_api_key" }, 401);
          }

          landingPage = data as unknown as LandingPageRow;

          if (!landingPage.is_active) {
            await logRequest(supabaseAdmin, {
              landing_page_id: landingPage.id,
              api_key_hash: apiKeyHash,
              method,
              path,
              ip,
              origin,
              status_code: 409,
              error_message: "landing_page_inactive",
            });
            return json({ error: "landing_page_inactive" }, 409);
          }

          const rateLimited = await checkRateLimit(supabaseAdmin, apiKeyHash);
          if (rateLimited) {
            await logRequest(supabaseAdmin, {
              landing_page_id: landingPage.id,
              api_key_hash: apiKeyHash,
              method,
              path,
              ip,
              origin,
              status_code: 429,
              error_message: "rate_limited",
            });
            return json({ error: "rate_limited" }, 429);
          }
        }

        // Backward compatibility: explicit identifiers when no API key is provided
        if (!landingPage && (input.landing_page_id || input.landing_page_slug)) {
          const query = supabaseAdmin
            .from("landing_pages")
            .select("id, product_id, is_active, api_key_hash");
          const { data } = input.landing_page_id
            ? await query.eq("id", input.landing_page_id).maybeSingle()
            : await query.eq("slug", input.landing_page_slug!).maybeSingle();
          if (!data) {
            await logRequest(supabaseAdmin, {
              landing_page_id: null,
              api_key_hash: null,
              method,
              path,
              ip,
              origin,
              status_code: 404,
              error_message: "landing_page_not_found",
            });
            return json({ error: "landing_page_not_found" }, 404);
          }
          landingPage = data as unknown as LandingPageRow;
          if (!landingPage.is_active) {
            await logRequest(supabaseAdmin, {
              landing_page_id: landingPage.id,
              api_key_hash: null,
              method,
              path,
              ip,
              origin,
              status_code: 409,
              error_message: "landing_page_inactive",
            });
            return json({ error: "landing_page_inactive" }, 409);
          }
        }

        if (!input.product_id && !input.product_slug && !landingPage?.product_id) {
          await logRequest(supabaseAdmin, {
            landing_page_id: landingPage?.id ?? null,
            api_key_hash: apiKeyHash,
            method,
            path,
            ip,
            origin,
            status_code: 422,
            error_message: "product_or_landing_page_required",
          });
          return json({ error: "product_or_landing_page_required" }, 422);
        }

        // Resolve product: explicit id/slug wins, otherwise the landing page's product
        const productId = input.product_id ?? landingPage?.product_id ?? null;
        let product: ProductRow | null = null;
        if (productId) {
          const { data } = await supabaseAdmin
            .from("products")
            .select("id, name, price, is_active")
            .eq("id", productId)
            .maybeSingle();
          product = data as unknown as ProductRow;
        } else if (input.product_slug) {
          const { data } = await supabaseAdmin
            .from("products")
            .select("id, name, price, is_active")
            .eq("slug", input.product_slug)
            .maybeSingle();
          product = data as unknown as ProductRow;
        }

        if (!product) {
          await logRequest(supabaseAdmin, {
            landing_page_id: landingPage?.id ?? null,
            api_key_hash: apiKeyHash,
            method,
            path,
            ip,
            origin,
            status_code: 404,
            error_message: "product_not_found",
          });
          return json({ error: "product_not_found" }, 404);
        }
        if (!product.is_active) {
          await logRequest(supabaseAdmin, {
            landing_page_id: landingPage?.id ?? null,
            api_key_hash: apiKeyHash,
            method,
            path,
            ip,
            origin,
            status_code: 409,
            error_message: "product_inactive",
          });
          return json({ error: "product_inactive" }, 409);
        }

        // Server-side pricing — request prices are ignored on purpose
        const unitPrice = Number(product.price);
        const quantity = input.quantity;
        const totalPrice = Number((unitPrice * quantity).toFixed(2));

        const phone = input.phone.replace(/[^\d+]/g, "");

        // Upsert the customer by phone
        const { data: existingCustomer } = await supabaseAdmin
          .from("customers")
          .select("id")
          .eq("phone", phone)
          .maybeSingle();

        let customerId = (existingCustomer as { id: string } | null)?.id ?? null;
        if (customerId) {
          await supabaseAdmin
            .from("customers")
            .update({
              full_name: input.customer_name,
              city: input.city ?? null,
              address: input.address ?? null,
            })
            .eq("id", customerId);
        } else {
          const { data: createdCustomer, error: customerError } = await supabaseAdmin
            .from("customers")
            .insert({
              full_name: input.customer_name,
              phone,
              city: input.city ?? null,
              address: input.address ?? null,
            } as never)
            .select("id")
            .single();
          if (customerError) {
            await logRequest(supabaseAdmin, {
              landing_page_id: landingPage?.id ?? null,
              api_key_hash: apiKeyHash,
              method,
              path,
              ip,
              origin,
              status_code: 500,
              error_message: "customer_create_failed",
            });
            return json({ error: "customer_create_failed" }, 500);
          }
          customerId = (createdCustomer as { id: string }).id;
        }

        const source = (input.source ?? input.utm_source ?? "organic").toLowerCase();

        const { data: order, error: orderError } = await supabaseAdmin
          .from("orders")
          .insert({
            customer_id: customerId,
            product_id: product.id,
            landing_page_id: landingPage?.id ?? null,
            customer_name: input.customer_name,
            phone,
            city: input.city ?? null,
            address: input.address ?? null,
            quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            status: "new",
            source,
            campaign: input.campaign ?? input.utm_campaign ?? null,
            utm_source: input.utm_source ?? null,
            utm_medium: input.utm_medium ?? null,
            utm_campaign: input.utm_campaign ?? null,
            utm_content: input.utm_content ?? null,
            notes: input.notes ?? null,
          } as never)
          .select("id, order_number, total_price, status")
          .single();

        if (orderError || !order) {
          console.error("order insert failed", orderError);
          await logRequest(supabaseAdmin, {
            landing_page_id: landingPage?.id ?? null,
            api_key_hash: apiKeyHash,
            method,
            path,
            ip,
            origin,
            status_code: 500,
            error_message: "order_create_failed",
          });
          return json({ error: "order_create_failed" }, 500);
        }

        const created = order as {
          id: string;
          order_number: number;
          total_price: number;
          status: string;
        };

        await supabaseAdmin.from("order_items").insert({
          order_id: created.id,
          product_id: product.id,
          product_name: product.name,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
        } as never);

        await logRequest(supabaseAdmin, {
          landing_page_id: landingPage?.id ?? null,
          api_key_hash: apiKeyHash,
          method,
          path,
          ip,
          origin,
          status_code: 201,
        });

        return json(
          {
            success: true,
            order: {
              id: created.id,
              order_number: created.order_number,
              product: product.name,
              quantity,
              unit_price: unitPrice,
              total_price: created.total_price,
              currency: "MAD",
              status: created.status,
            },
          },
          201,
        );
      },
    },
  },
});
