// @ts-nocheck
import { Hono } from "npm:hono@4.6.14";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@0.10.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MCP_TOKEN = Deno.env.get("MCP_API_TOKEN") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const mcp = new McpServer({
  name: "salonpro-mcp",
  version: "1.0.0",
});

// ===== Tools =====

mcp.tool({
  name: "list_services",
  description: "Lista los servicios activos de la barbería (nombre, duración, precio).",
  inputSchema: { type: "object", properties: {} },
  handler: async () => {
    const { data, error } = await supabase
      .from("services")
      .select("id, name, description, duration_minutes, price")
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
});

mcp.tool({
  name: "list_barbers",
  description: "Lista los barberos activos.",
  inputSchema: { type: "object", properties: {} },
  handler: async () => {
    const { data, error } = await supabase
      .from("barbers")
      .select("id, name, specialty, phone, email")
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
});

mcp.tool({
  name: "get_availability",
  description:
    "Obtiene horarios disponibles para una fecha dada. Devuelve los slots libres por barbero considerando citas existentes.",
  inputSchema: {
    type: "object",
    properties: {
      date: { type: "string", description: "Fecha YYYY-MM-DD" },
      barber_id: { type: "string", description: "Opcional: filtrar por barbero" },
      service_id: { type: "string", description: "Opcional: para calcular duración" },
    },
    required: ["date"],
  },
  handler: async ({ date, barber_id, service_id }: any) => {
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
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number); return h * 60 + m;
    };
    const fmt = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

    const result = (barbers ?? []).map((b: any) => {
      const busy = (appts ?? [])
        .filter((a: any) => a.barber_id === b.id)
        .map((a: any) => [toMin(a.start_time), toMin(a.end_time)]);
      const slots: string[] = [];
      for (let t = dayStart; t + duration <= dayEnd; t += step) {
        const overlap = busy.some(([s, e]) => t < e && t + duration > s);
        if (!overlap) slots.push(fmt(t));
      }
      return { barber_id: b.id, barber_name: b.name, available_slots: slots };
    });

    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  },
});

mcp.tool({
  name: "find_or_create_customer",
  description: "Busca un cliente por teléfono. Si no existe lo crea. Devuelve el cliente.",
  inputSchema: {
    type: "object",
    properties: {
      phone: { type: "string" },
      name: { type: "string" },
      email: { type: "string" },
      whatsapp_id: { type: "string" },
    },
    required: ["phone", "name"],
  },
  handler: async ({ phone, name, email, whatsapp_id }: any) => {
    const { data: existing } = await supabase
      .from("customers").select("*").eq("phone", phone).maybeSingle();
    if (existing) return { content: [{ type: "text", text: JSON.stringify(existing) }] };
    const { data, error } = await supabase
      .from("customers")
      .insert({ phone, name, email, whatsapp_id })
      .select().single();
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
});

mcp.tool({
  name: "create_appointment",
  description: "Crea una nueva cita.",
  inputSchema: {
    type: "object",
    properties: {
      customer_id: { type: "string" },
      barber_id: { type: "string" },
      service_id: { type: "string" },
      appointment_date: { type: "string", description: "YYYY-MM-DD" },
      start_time: { type: "string", description: "HH:MM" },
      notes: { type: "string" },
    },
    required: ["customer_id", "barber_id", "service_id", "appointment_date", "start_time"],
  },
  handler: async (args: any) => {
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
      })
      .select().single();
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
});

mcp.tool({
  name: "reschedule_appointment",
  description: "Reagenda una cita existente a nueva fecha/hora.",
  inputSchema: {
    type: "object",
    properties: {
      appointment_id: { type: "string" },
      appointment_date: { type: "string" },
      start_time: { type: "string" },
      barber_id: { type: "string", description: "Opcional: cambiar barbero" },
    },
    required: ["appointment_id", "appointment_date", "start_time"],
  },
  handler: async (args: any) => {
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
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
});

mcp.tool({
  name: "cancel_appointment",
  description: "Cancela una cita.",
  inputSchema: {
    type: "object",
    properties: { appointment_id: { type: "string" } },
    required: ["appointment_id"],
  },
  handler: async ({ appointment_id }: any) => {
    const { data, error } = await supabase
      .from("appointments").update({ status: "cancelled" })
      .eq("id", appointment_id).select().single();
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
});

mcp.tool({
  name: "list_customer_appointments",
  description: "Lista citas de un cliente (por teléfono o por id).",
  inputSchema: {
    type: "object",
    properties: {
      customer_id: { type: "string" },
      phone: { type: "string" },
      include_past: { type: "boolean", description: "Default false" },
    },
  },
  handler: async ({ customer_id, phone, include_past }: any) => {
    let cid = customer_id;
    if (!cid && phone) {
      const { data: c } = await supabase
        .from("customers").select("id").eq("phone", phone).maybeSingle();
      if (!c) return { content: [{ type: "text", text: "[]" }] };
      cid = c.id;
    }
    if (!cid) throw new Error("customer_id o phone requerido");
    let q = supabase
      .from("appointments")
      .select("id, appointment_date, start_time, end_time, status, barbers(name), services(name, price)")
      .eq("customer_id", cid)
      .order("appointment_date", { ascending: false });
    if (!include_past) {
      const today = new Date().toISOString().slice(0, 10);
      q = q.gte("appointment_date", today);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
});

// ===== HTTP server with auth =====

const app = new Hono();
const transport = new StreamableHttpTransport();

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (MCP_TOKEN) {
    const auth = c.req.header("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (token !== MCP_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }
  await next();
  for (const [k, v] of Object.entries(corsHeaders)) c.res.headers.set(k, v);
});

app.all("/*", async (c) => transport.handleRequest(c.req.raw, mcp));

Deno.serve(app.fetch);
