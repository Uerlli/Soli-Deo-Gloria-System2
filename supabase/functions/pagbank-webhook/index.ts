import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-pagbank-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Converte valores em centavos (padrão PagBank) para reais. */
function centsToReais(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num / 100 : null;
}

/** Mantém valores que já vêm em reais. */
function toDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

interface IngestItem {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
}

interface IngestPayload {
  external_id: string | null;
  order_number: string | null;
  table_identifier: string | null;
  customer_name: string | null;
  notes: string | null;
  total_amount: number;
  source: string;
  items: IngestItem[];
}

// deno-lint-ignore no-explicit-any
function normalizePayload(raw: any): IngestPayload {
  const sourceItems: unknown[] = Array.isArray(raw?.items) ? raw.items : [];

  // deno-lint-ignore no-explicit-any
  const items: IngestItem[] = sourceItems.map((entry: any) => {
    const rawProductId = entry?.product_id ?? entry?.reference_id ?? null;
    const unitPrice =
      centsToReais(entry?.unit_amount) ??
      toDecimal(entry?.unit_price) ??
      toDecimal(entry?.price) ??
      0;

    return {
      product_id:
        typeof rawProductId === "string" && UUID_RE.test(rawProductId)
          ? rawProductId
          : null,
      product_name: String(entry?.name ?? entry?.description ?? "Item"),
      quantity: Math.max(Number(entry?.quantity) || 1, 1),
      unit_price: Number(unitPrice.toFixed(2)),
      notes:
        entry?.notes ?? entry?.observation ?? entry?.customizations ?? null,
    };
  });

  const totalFromAmount =
    centsToReais(raw?.amount?.value) ??
    centsToReais(raw?.charges?.[0]?.amount?.value);
  const totalFromField = toDecimal(raw?.total_amount ?? raw?.total);
  const computedTotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const total = totalFromAmount ?? totalFromField ?? computedTotal;

  const externalId =
    raw?.id ?? raw?.transaction_id ?? raw?.reference_id ?? raw?.order_id ?? "";

  return {
    external_id: externalId ? String(externalId) : null,
    order_number:
      raw?.order_number ?? raw?.short_id ?? raw?.reference_id ?? null,
    table_identifier:
      raw?.table_identifier ?? raw?.table ?? raw?.metadata?.table ?? null,
    customer_name: raw?.customer?.name ?? raw?.customer_name ?? null,
    notes: raw?.notes ?? raw?.observation ?? null,
    total_amount: Number(total.toFixed(2)),
    source: "pagbank",
    items,
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  // Token opcional: se PAGBANK_WEBHOOK_TOKEN estiver configurado, valida a chamada.
  const expectedToken = Deno.env.get("PAGBANK_WEBHOOK_TOKEN");
  if (expectedToken) {
    const url = new URL(req.url);
    const provided =
      req.headers.get("x-pagbank-token") ?? url.searchParams.get("token");
    if (provided !== expectedToken) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }
  }

  // deno-lint-ignore no-explicit-any
  let raw: any;
  try {
    raw = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const payload = normalizePayload(raw);

  if (payload.items.length === 0) {
    return json({ ok: false, error: "Payload has no items" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, error: "Server not configured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc("ingest_order", {
    p_payload: payload,
  });

  if (error) {
    return json({ ok: false, error: error.message }, 400);
  }

  return json({ ok: true, result: data });
});