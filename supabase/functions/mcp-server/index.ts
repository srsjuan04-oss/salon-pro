// @ts-nocheck
import { Hono } from "npm:hono@4.6.14";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@0.10.0";
import { z } from "npm:zod@4.0.14";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MCP_TOKEN = Deno.env.get("MCP_API_TOKEN") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, mcp-session-id, accept",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const mcp = new McpServer({
  name: "salonpro-mcp",
  version: "1.0.0",
  schemaAdapter: (schema: any) => z.toJSONSchema
    ? z.toJSONSchema(schema)
    : zodToJsonSchemaFallback(schema),
});

function zodToJsonSchemaFallback(_s: any) {
  // mcp-lite calls schemaAdapter; if z.toJSONSchema unavailable, return empty object schema
  return { type: "object" };
}

const ok = (data: unknown) => ({
  content: [{ type: "text", text: JSON.stringify(data) }],
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveBarberId(value?: string): Promise<string | undefined> {
  if (!value) return undefined;
  if (UUID_RE.test(value)) return value;
  const { data } = await supabase
    .from("barbers").select("id, name").eq("is_active", true).ilike("name", `%${value}%`).limit(1).maybeSingle();
  if (!data) throw new Error(`Barbero no encontrado: "${value}"`);
  return data.id;
}

async function resolveServiceId(value?: string): Promise<string | undefined> {
  if (!value) return undefined;
  if (UUID_RE.test(value)) return value;
  const { data } = await supabase
    .from("services").select("id, name").eq("is_active", true).ilike("name", `%${value}%`).limit(1).maybeSingle();
  if (!data) throw new Error(`Servicio no encontrado: "${value}"`);
  return data.id;
}

// ===== Tools =====

mcp.tool("list_services", {
  description: "Lista los servicios activos (nombre, duración, precio).",
  inputSchema: z.object({}),
  handler: async () => {
    const { data, error } = await supabase
      .from("services")
      .select("id, name, description, duration_minutes, price")
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    return ok(data);
  },
});

mcp.tool("list_barbers", {
  description: "Lista los barberos activos.",
  inputSchema: z.object({}),
  handler: async () => {
    const { data, error } = await supabase
      .from("barbers")
      .select("id, name, specialty, phone, email")
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    return ok(data);
  },
});

mcp.tool("get_availability", {
  description: "Horarios disponibles por barbero para una fecha (YYYY-MM-DD).",
  inputSchema: z.object({
    date: z.string(),
    barber_id: z.string().optional(),
    service_id: z.string().optional(),
  }),
  handler: async ({ date, barber_id, service_id }) => {
    let duration = 30;
    if (service_id) {
      const { data: svc } = await supabase
        .from("services").select("duration_minutes").eq("id", service_id).maybeSingle();
      if (svc) duration = svc.duration_minutes;
    }
    let bq = supabase.from("barbers").select("id, name").eq("is_active", true);
    if (barber_id) bq = bq.eq("id", barber_id);
    const { data: barbers, error: be } = await bq;
    if (be) throw new Error(be.message);

    const { data: appts } = await supabase
      .from("appointments")
      .select("barber_id, start_time, end_time")
      .eq("appointment_date", date)
      .neq("status", "cancelled");

    const dayStart = 9 * 60, dayEnd = 20 * 60, step = 30;
    const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const fmt = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

    const result = (barbers ?? []).map((b: any) => {
      const busy = (appts ?? []).filter((a: any) => a.barber_id === b.id)
        .map((a: any) => [toMin(a.start_time), toMin(a.end_time)]);
      const slots: string[] = [];
      for (let t = dayStart; t + duration <= dayEnd; t += step) {
        if (!busy.some(([s, e]) => t < e && t + duration > s)) slots.push(fmt(t));
      }
      return { barber_id: b.id, barber_name: b.name, available_slots: slots };
    });
    return ok(result);
  },
});

mcp.tool("find_or_create_customer", {
  description: "Busca cliente por teléfono o lo crea.",
  inputSchema: z.object({
    phone: z.string(),
    name: z.string(),
    email: z.string().optional(),
    whatsapp_id: z.string().optional(),
  }),
  handler: async ({ phone, name, email, whatsapp_id }) => {
    const { data: existing } = await supabase
      .from("customers").select("*").eq("phone", phone).maybeSingle();
    if (existing) return ok(existing);
    const { data, error } = await supabase
      .from("customers").insert({ phone, name, email, whatsapp_id })
      .select().single();
    if (error) throw new Error(error.message);
    return ok(data);
  },
});

mcp.tool("create_appointment", {
  description: "Crea una nueva cita.",
  inputSchema: z.object({
    customer_id: z.string(),
    barber_id: z.string(),
    service_id: z.string(),
    appointment_date: z.string(),
    start_time: z.string(),
    notes: z.string().optional(),
  }),
  handler: async (args) => {
    const { data: svc, error: se } = await supabase
      .from("services").select("duration_minutes").eq("id", args.service_id).single();
    if (se) throw new Error(se.message);
    const [h, m] = args.start_time.split(":").map(Number);
    const endMin = h * 60 + m + svc.duration_minutes;
    const end_time = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        customer_id: args.customer_id,
        barber_id: args.barber_id,
        service_id: args.service_id,
        appointment_date: args.appointment_date,
        start_time: args.start_time,
        end_time,
        notes: args.notes,
        source: "whatsapp",
        status: "confirmed",
      }).select().single();
    if (error) throw new Error(error.message);
    return ok(data);
  },
});

mcp.tool("reschedule_appointment", {
  description: "Reagenda una cita.",
  inputSchema: z.object({
    appointment_id: z.string(),
    appointment_date: z.string(),
    start_time: z.string(),
    barber_id: z.string().optional(),
  }),
  handler: async (args) => {
    const { data: appt, error: ae } = await supabase
      .from("appointments").select("service_id").eq("id", args.appointment_id).single();
    if (ae) throw new Error(ae.message);
    const { data: svc } = await supabase
      .from("services").select("duration_minutes").eq("id", appt.service_id).single();
    const [h, m] = args.start_time.split(":").map(Number);
    const endMin = h * 60 + m + (svc?.duration_minutes ?? 30);
    const end_time = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    const update: any = {
      appointment_date: args.appointment_date,
      start_time: args.start_time,
      end_time,
    };
    if (args.barber_id) update.barber_id = args.barber_id;
    const { data, error } = await supabase
      .from("appointments").update(update).eq("id", args.appointment_id)
      .select().single();
    if (error) throw new Error(error.message);
    return ok(data);
  },
});

mcp.tool("cancel_appointment", {
  description: "Cancela una cita.",
  inputSchema: z.object({ appointment_id: z.string() }),
  handler: async ({ appointment_id }) => {
    const { data, error } = await supabase
      .from("appointments").update({ status: "cancelled" })
      .eq("id", appointment_id).select().single();
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
    let cid = customer_id;
    if (!cid && phone) {
      const { data: c } = await supabase
        .from("customers").select("id").eq("phone", phone).maybeSingle();
      if (!c) return ok([]);
      cid = c.id;
    }
    if (!cid) throw new Error("customer_id o phone requerido");
    let q = supabase
      .from("appointments")
      .select("id, appointment_date, start_time, end_time, status, barbers(name), services(name, price)")
      .eq("customer_id", cid)
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
  if (MCP_TOKEN) {
    const auth = c.req.header("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (token !== MCP_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
  await next();
  for (const [k, v] of Object.entries(corsHeaders)) c.res.headers.set(k, v);
});

app.all("/*", async (c) => httpHandler(c.req.raw));

Deno.serve(app.fetch);
