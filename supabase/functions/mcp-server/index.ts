// @ts-nocheck
import { Hono } from "npm:hono@4.6.14";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@0.10.0";
import { z } from "npm:zod@4.0.14";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LEGACY_TOKEN = Deno.env.get("MCP_API_TOKEN") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, mcp-session-id, accept",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

// Per-request org context. Uses AsyncLocalStorage so concurrent MCP requests
// never overwrite each other's organization (a module-level variable made
// create_appointment insert a null organization_id under concurrency).
import { AsyncLocalStorage } from "node:async_hooks";

const orgStore = new AsyncLocalStorage<{ org: string }>();
const requireOrg = () => {
  const org = orgStore.getStore()?.org;
  if (!org) throw new Error("Sin organización asociada al token MCP.");
  return org;
};

const mcp = new McpServer({
  name: "salonpro-mcp",
  version: "1.1.0",
  schemaAdapter: (schema: any) => z.toJSONSchema
    ? z.toJSONSchema(schema)
    : { type: "object" },
});

const ok = (data: unknown) => ({ content: [{ type: "text", text: JSON.stringify(data) }] });
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
const STOPWORDS = new Set(["de","del","la","el","los","las","y","e","con","sin","para"]);
function fuzzyMatch<T extends { id: string; name: string }>(items: T[], value: string): T | undefined {
  const target = normalize(value);
  if (!target) return undefined;
  let hit = items.find(i => normalize(i.name) === target);
  if (hit) return hit;
  hit = items.find(i => normalize(i.name).includes(target) || target.includes(normalize(i.name)));
  if (hit) return hit;
  const targetTokens = target.split(" ").filter(t => t && !STOPWORDS.has(t));
  let best: { item: T; score: number } | undefined;
  for (const item of items) {
    const itemTokens = normalize(item.name).split(" ").filter(t => t && !STOPWORDS.has(t));
    const score = targetTokens.filter(t => itemTokens.some(it => it.includes(t) || t.includes(it))).length;
    if (score > 0 && (!best || score > best.score)) best = { item, score };
  }
  return best?.item;
}

async function resolveBarberId(value?: string): Promise<string | undefined> {
  if (!value) return undefined;
  if (UUID_RE.test(value)) return value;
  const { data } = await supabase.from("barbers").select("id, name")
    .eq("is_active", true).eq("organization_id", requireOrg());
  const hit = fuzzyMatch(data ?? [], value);
  if (!hit) throw new Error(`Barbero no encontrado: "${value}". Disponibles: ${(data ?? []).map(b => b.name).join(", ")}`);
  return hit.id;
}
async function resolveServiceId(value?: string): Promise<string | undefined> {
  if (!value) return undefined;
  if (UUID_RE.test(value)) return value;
  const { data } = await supabase.from("services").select("id, name")
    .eq("is_active", true).eq("organization_id", requireOrg());
  const hit = fuzzyMatch(data ?? [], value);
  if (!hit) throw new Error(`Servicio no encontrado: "${value}". Disponibles: ${(data ?? []).map(s => s.name).join(", ")}`);
  return hit.id;
}

mcp.tool("list_services", {
  description: "Lista los servicios activos.",
  inputSchema: z.object({}),
  handler: async () => {
    const { data, error } = await supabase.from("services")
      .select("id, name, description, duration_minutes, price")
      .eq("is_active", true).eq("organization_id", requireOrg());
    if (error) throw new Error(error.message);
    return ok(data);
  },
});

mcp.tool("list_barbers", {
  description: "Lista los barberos activos.",
  inputSchema: z.object({}),
  handler: async () => {
    const { data, error } = await supabase.from("barbers")
      .select("id, name, specialty, phone, email")
      .eq("is_active", true).eq("organization_id", requireOrg());
    if (error) throw new Error(error.message);
    return ok(data);
  },
});

const DEFAULT_DAY_START = "10:00";
const DEFAULT_DAY_END   = "20:00";
const DEFAULT_SLOT_MIN  = 40;

async function loadScheduleSettings() {
  const { data } = await supabase.from("schedule_settings")
    .select("day_start, day_end, slot_minutes")
    .eq("organization_id", requireOrg()).limit(1).maybeSingle();
  return {
    day_start: (data?.day_start ?? DEFAULT_DAY_START).slice(0, 5),
    day_end:   (data?.day_end   ?? DEFAULT_DAY_END).slice(0, 5),
    slot_minutes: data?.slot_minutes ?? DEFAULT_SLOT_MIN,
  };
}

mcp.tool("get_availability", {
  description: "Horarios disponibles por barbero para una fecha (YYYY-MM-DD). barber_id y service_id aceptan UUID o nombre.",
  inputSchema: z.object({
    date: z.string(),
    barber_id: z.string().optional(),
    service_id: z.string().optional(),
    day_start: z.string().optional(),
    day_end: z.string().optional(),
    slot_minutes: z.number().optional(),
  }),
  handler: async ({ date, barber_id, service_id, day_start, day_end, slot_minutes }) => {
    const org = requireOrg();
    const resolvedBarber = await resolveBarberId(barber_id);
    const resolvedService = await resolveServiceId(service_id);
    const cfg = await loadScheduleSettings();
    const step = slot_minutes && slot_minutes > 0 ? slot_minutes : cfg.slot_minutes;
    let duration = step;
    if (resolvedService) {
      const { data: svc } = await supabase.from("services")
        .select("duration_minutes").eq("id", resolvedService).maybeSingle();
      if (svc) duration = svc.duration_minutes;
    }
    let bq = supabase.from("barbers").select("id, name")
      .eq("is_active", true).eq("organization_id", org);
    if (resolvedBarber) bq = bq.eq("id", resolvedBarber);
    const { data: barbers, error: be } = await bq;
    if (be) throw new Error(be.message);
    const { data: appts } = await supabase.from("appointments")
      .select("barber_id, start_time, end_time")
      .eq("appointment_date", date).eq("organization_id", org)
      .neq("status", "cancelled");
    const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const fmt = (m: number) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
    const dayStart = toMin(day_start ?? cfg.day_start);
    const dayEnd   = toMin(day_end   ?? cfg.day_end);
    const result = (barbers ?? []).map((b: any) => {
      const busy = (appts ?? []).filter((a: any) => a.barber_id === b.id)
        .map((a: any) => [toMin(a.start_time), toMin(a.end_time)]);
      const slots: string[] = [];
      for (let t = dayStart; t + duration <= dayEnd; t += step) {
        if (!busy.some(([s, e]) => t < e && t + duration > s)) slots.push(fmt(t));
      }
      return { barber_id: b.id, barber_name: b.name, slot_minutes: step, slot_duration: duration,
        window: `${fmt(dayStart)}-${fmt(dayEnd)}`, available_slots: slots };
    });
    return ok(result);
  },
});

mcp.tool("find_or_create_customer", {
  description: "Busca cliente por teléfono o lo crea.",
  inputSchema: z.object({
    phone: z.string(), name: z.string(),
    email: z.string().optional(), whatsapp_id: z.string().optional(),
  }),
  handler: async ({ phone, name, email, whatsapp_id }) => {
    const org = requireOrg();
    const tail = phone.replace(/\D/g, "").slice(-10);
    const { data: matches } = await supabase.from("customers").select("*")
      .eq("organization_id", org)
      .or(`phone.ilike.%${tail}%,whatsapp_id.ilike.%${tail}%`).limit(1);
    if (matches && matches[0]) return ok(matches[0]);
    const { data, error } = await supabase.from("customers")
      .insert({ phone, name, email, whatsapp_id, organization_id: org }).select().single();
    if (error) throw new Error(error.message);
    return ok(data);
  },
});

mcp.tool("create_appointment", {
  description: "Crea una cita. Puedes pasar customer_id O customer_phone + customer_name. barber_id/service_id aceptan UUID o nombre.",
  inputSchema: z.object({
    customer_id: z.string().optional(),
    customer_phone: z.string().optional(),
    customer_name: z.string().optional(),
    customer_email: z.string().optional(),
    barber_id: z.string(),
    service_id: z.string(),
    appointment_date: z.string(),
    start_time: z.string(),
    notes: z.string().optional(),
  }),
  handler: async (args) => {
    const org = requireOrg();
    console.log("[create_appointment] org:", org, "args:", JSON.stringify(args));
    try {
      let customerId = args.customer_id;
      if (!customerId) {
        if (!args.customer_phone) throw new Error("Falta customer_id o customer_phone.");
        const tail = args.customer_phone.replace(/\D/g, "").slice(-10);
        const { data: matches } = await supabase.from("customers").select("id")
          .eq("organization_id", org)
          .or(`phone.ilike.%${tail}%,whatsapp_id.ilike.%${tail}%`).limit(1);
        const existing = matches?.[0];
        if (existing) customerId = existing.id;
        else {
          if (!args.customer_name) throw new Error("Cliente nuevo: se requiere customer_name.");
          const { data: created, error: ce } = await supabase.from("customers").insert({
            phone: args.customer_phone, name: args.customer_name,
            email: args.customer_email, organization_id: org,
          }).select("id").single();
          if (ce) throw new Error(`No se pudo crear el cliente: ${ce.message}`);
          customerId = created.id;
        }
      }
      const todayBogota = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(args.appointment_date))
        throw new Error("appointment_date debe tener formato YYYY-MM-DD.");
      if (args.appointment_date < todayBogota)
        throw new Error(`Fecha en el pasado (${args.appointment_date}). Hoy es ${todayBogota}; verifica el año y vuelve a enviar la fecha correcta.`);
      const barberId = await resolveBarberId(args.barber_id);
      const serviceId = await resolveServiceId(args.service_id);

      const { data: svc, error: se } = await supabase.from("services")
        .select("duration_minutes").eq("id", serviceId!).single();
      if (se) throw new Error(se.message);
      const [h, m] = args.start_time.split(":").map(Number);
      const startMin = h * 60 + m;
      const endMin = startMin + svc.duration_minutes;
      const end_time = `${String(Math.floor(endMin/60)).padStart(2,"0")}:${String(endMin%60).padStart(2,"0")}`;
      const { data: clash } = await supabase.from("appointments")
        .select("id, start_time, end_time")
        .eq("appointment_date", args.appointment_date).eq("barber_id", barberId)
        .eq("organization_id", org).neq("status", "cancelled");
      const toMin = (t: string) => { const [hh, mm] = t.split(":").map(Number); return hh*60+mm; };
      const overlap = (clash ?? []).find((a: any) =>
        startMin < toMin(a.end_time) && endMin > toMin(a.start_time));
      if (overlap) throw new Error(`El barbero ya tiene una cita ${overlap.start_time}-${overlap.end_time}.`);
      const { data, error } = await supabase.from("appointments").insert({
        customer_id: customerId, barber_id: barberId, service_id: serviceId,
        appointment_date: args.appointment_date, start_time: args.start_time,
        end_time, notes: args.notes, source: "whatsapp", status: "confirmed",
        organization_id: org,
      }).select().single();
      if (error) throw new Error(error.message);
      return ok(data);
    } catch (e) {
      console.error("[create_appointment] ERROR:", (e as Error).message);
      throw e;
    }
  },
});

mcp.tool("reschedule_appointment", {
  description: "Reagenda una cita. Identifica por appointment_id, o phone + original_date.",
  inputSchema: z.object({
    appointment_id: z.string().optional(),
    phone: z.string().optional(),
    original_date: z.string().optional(),
    appointment_date: z.string(),
    start_time: z.string(),
    barber_id: z.string().optional(),
  }),
  handler: async (args) => {
    const org = requireOrg();
    const barberId = await resolveBarberId(args.barber_id);
    let apptId = args.appointment_id;
    if (!apptId) {
      if (!args.phone || !args.original_date) throw new Error("Envía appointment_id, o phone + original_date.");
      const tail = args.phone.replace(/\D/g, "").slice(-10);
      const { data: cust } = await supabase.from("customers").select("id")
        .eq("organization_id", org)
        .or(`phone.ilike.%${tail}%,whatsapp_id.ilike.%${tail}%`).limit(1).maybeSingle();
      if (!cust) throw new Error(`Cliente no encontrado para ${args.phone}`);
      const { data: found } = await supabase.from("appointments").select("id")
        .eq("customer_id", cust.id).eq("organization_id", org)
        .eq("appointment_date", args.original_date).neq("status", "cancelled")
        .order("start_time", { ascending: true }).limit(1).maybeSingle();
      if (!found) throw new Error(`No hay cita activa para ${args.phone} el ${args.original_date}`);
      apptId = found.id;
    }
    const { data: appt, error: ae } = await supabase.from("appointments")
      .select("service_id, organization_id").eq("id", apptId).single();
    if (ae) throw new Error(ae.message);
    if (appt.organization_id !== org) throw new Error("Cita fuera de tu organización.");
    const { data: svc } = await supabase.from("services")
      .select("duration_minutes").eq("id", appt.service_id).single();
    const [h, m] = args.start_time.split(":").map(Number);
    const endMin = h*60 + m + (svc?.duration_minutes ?? 30);
    const end_time = `${String(Math.floor(endMin/60)).padStart(2,"0")}:${String(endMin%60).padStart(2,"0")}`;
    const update: any = {
      appointment_date: args.appointment_date, start_time: args.start_time,
      end_time, status: "confirmed",
    };
    if (barberId) update.barber_id = barberId;
    const { data, error } = await supabase.from("appointments").update(update).eq("id", apptId)
      .select().single();
    if (error) throw new Error(error.message);
    return ok(data);
  },
});

mcp.tool("cancel_appointment", {
  description: "Cancela una cita.",
  inputSchema: z.object({ appointment_id: z.string() }),
  handler: async ({ appointment_id }) => {
    const org = requireOrg();
    const { data, error } = await supabase.from("appointments")
      .update({ status: "cancelled" }).eq("id", appointment_id)
      .eq("organization_id", org).select().single();
    if (error) throw new Error(error.message);
    return ok(data);
  },
});

mcp.tool("list_customer_appointments", {
  description: "Lista citas de un cliente (por phone o customer_id).",
  inputSchema: z.object({
    customer_id: z.string().optional(),
    phone: z.string().optional(),
    include_past: z.boolean().optional(),
  }),
  handler: async ({ customer_id, phone, include_past }) => {
    const org = requireOrg();
    let cid = customer_id;
    if (!cid && phone) {
      const tail = phone.replace(/\D/g, "").slice(-10);
      const { data: matches } = await supabase.from("customers").select("id, phone")
        .eq("organization_id", org)
        .or(`phone.ilike.%${tail}%,whatsapp_id.ilike.%${tail}%`);
      const c = matches?.[0];
      if (!c) return ok([]);
      cid = c.id;
    }
    if (!cid) throw new Error("customer_id o phone requerido");
    let q = supabase.from("appointments")
      .select("id, appointment_date, start_time, end_time, status, barbers(name), services(name, price)")
      .eq("customer_id", cid).eq("organization_id", org)
      .order("appointment_date", { ascending: false });
    if (!include_past) q = q.gte("appointment_date", new Date().toISOString().slice(0, 10));
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ok(data);
  },
});

// ===== HTTP server =====
const app = new Hono();
const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcp);

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = c.req.header("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing bearer token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  // Legacy shared token → fall back to first org (backwards compatibility)
  let org: string | null = null;
  if (LEGACY_TOKEN && token === LEGACY_TOKEN) {
    const { data } = await supabase.from("organizations").select("id")
      .order("created_at", { ascending: true }).limit(1).maybeSingle();
    org = data?.id ?? null;
  } else {
    const { data } = await supabase.from("organizations").select("id")
      .eq("mcp_token", token).maybeSingle();
    org = data?.id ?? null;
  }
  if (!org) {
    return new Response(JSON.stringify({ error: "Token MCP inválido" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  await orgStore.run({ org }, () => next());
  for (const [k, v] of Object.entries(corsHeaders)) c.res.headers.set(k, v);
});

app.all("/*", async (c) => httpHandler(c.req.raw));

Deno.serve(app.fetch);
