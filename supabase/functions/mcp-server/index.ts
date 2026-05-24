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

// Defaults si no hay fila en schedule_settings.
const DEFAULT_DAY_START = "10:00";
const DEFAULT_DAY_END   = "20:00";
const DEFAULT_SLOT_MIN  = 40;

async function loadScheduleSettings() {
  const { data } = await supabase
    .from("schedule_settings")
    .select("day_start, day_end, slot_minutes")
    .limit(1).maybeSingle();
  return {
    day_start: (data?.day_start ?? DEFAULT_DAY_START).slice(0, 5),
    day_end:   (data?.day_end   ?? DEFAULT_DAY_END).slice(0, 5),
    slot_minutes: data?.slot_minutes ?? DEFAULT_SLOT_MIN,
  };
}

mcp.tool("get_availability", {
  description:
    "Horarios disponibles por barbero para una fecha (YYYY-MM-DD). " +
    "Usa la configuración guardada en schedule_settings (jornada y bloque). " +
    "Se puede sobreescribir por llamada con day_start, day_end y slot_minutes. " +
    "barber_id y service_id aceptan UUID o nombre.",
  inputSchema: z.object({
    date: z.string().describe("Fecha YYYY-MM-DD"),
    barber_id: z.string().optional().describe("UUID o nombre del barbero"),
    service_id: z.string().optional().describe("UUID o nombre del servicio"),
    day_start: z.string().optional().describe("Override hora inicio HH:MM"),
    day_end:   z.string().optional().describe("Override hora fin HH:MM"),
    slot_minutes: z.number().optional().describe("Override tamaño bloque en minutos"),
  }),
  handler: async ({ date, barber_id, service_id, day_start, day_end, slot_minutes }) => {
    const resolvedBarber = await resolveBarberId(barber_id);
    const resolvedService = await resolveServiceId(service_id);
    const cfg = await loadScheduleSettings();

    const step = slot_minutes && slot_minutes > 0 ? slot_minutes : cfg.slot_minutes;
    let duration = step;
    if (resolvedService) {
      const { data: svc } = await supabase
        .from("services").select("duration_minutes").eq("id", resolvedService).maybeSingle();
      if (svc) duration = svc.duration_minutes;
    }

    let bq = supabase.from("barbers").select("id, name").eq("is_active", true);
    if (resolvedBarber) bq = bq.eq("id", resolvedBarber);
    const { data: barbers, error: be } = await bq;
    if (be) throw new Error(be.message);

    const { data: appts } = await supabase
      .from("appointments")
      .select("barber_id, start_time, end_time")
      .eq("appointment_date", date)
      .neq("status", "cancelled");

    const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const fmt = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

    const dayStart = toMin(day_start ?? cfg.day_start);
    const dayEnd   = toMin(day_end   ?? cfg.day_end);

    const result = (barbers ?? []).map((b: any) => {
      const busy = (appts ?? []).filter((a: any) => a.barber_id === b.id)
        .map((a: any) => [toMin(a.start_time), toMin(a.end_time)]);
      const slots: string[] = [];
      for (let t = dayStart; t + duration <= dayEnd; t += step) {
        if (!busy.some(([s, e]) => t < e && t + duration > s)) slots.push(fmt(t));
      }
      return {
        barber_id: b.id,
        barber_name: b.name,
        slot_minutes: step,
        slot_duration: duration,
        window: `${fmt(dayStart)}-${fmt(dayEnd)}`,
        available_slots: slots,
      };
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
    const tail = phone.replace(/\D/g, "").slice(-10);
    const { data: matches } = await supabase
      .from("customers").select("*")
      .or(`phone.ilike.%${tail}%,whatsapp_id.ilike.%${tail}%`).limit(1);
    if (matches && matches[0]) return ok(matches[0]);
    const { data, error } = await supabase
      .from("customers").insert({ phone, name, email, whatsapp_id })
      .select().single();
    if (error) throw new Error(error.message);
    return ok(data);
  },
});

mcp.tool("create_appointment", {
  description:
    "Crea una nueva cita. Puedes pasar customer_id O bien customer_phone + customer_name " +
    "(si no existe el cliente se crea automáticamente). barber_id y service_id aceptan UUID o nombre.",
  inputSchema: z.object({
    customer_id: z.string().optional(),
    customer_phone: z.string().optional(),
    customer_name: z.string().optional(),
    customer_email: z.string().optional(),
    barber_id: z.string(),
    service_id: z.string(),
    appointment_date: z.string().describe("YYYY-MM-DD"),
    start_time: z.string().describe("HH:MM"),
    notes: z.string().optional(),
  }),
  handler: async (args) => {
    // Resolver/crear cliente
    let customerId = args.customer_id;
    if (!customerId) {
      if (!args.customer_phone) {
        throw new Error("Falta customer_id o customer_phone para identificar al cliente.");
      }
      const tail = args.customer_phone.replace(/\D/g, "").slice(-10);
      const { data: matches } = await supabase
        .from("customers").select("id")
        .or(`phone.ilike.%${tail}%,whatsapp_id.ilike.%${tail}%`).limit(1);
      const existing = matches?.[0];
      if (existing) {
        customerId = existing.id;
      } else {
        if (!args.customer_name) {
          throw new Error("Cliente nuevo: se requiere customer_name junto con customer_phone.");
        }
        const { data: created, error: ce } = await supabase
          .from("customers").insert({
            phone: args.customer_phone,
            name: args.customer_name,
            email: args.customer_email,
          }).select("id").single();
        if (ce) throw new Error(`No se pudo crear el cliente: ${ce.message}`);
        customerId = created.id;
      }
    }

    const barberId = await resolveBarberId(args.barber_id);
    const serviceId = await resolveServiceId(args.service_id);
    const { data: svc, error: se } = await supabase
      .from("services").select("duration_minutes").eq("id", serviceId!).single();
    if (se) throw new Error(se.message);

    const [h, m] = args.start_time.split(":").map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + svc.duration_minutes;
    const end_time = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

    // Validar choque
    const { data: clash } = await supabase
      .from("appointments")
      .select("id, start_time, end_time")
      .eq("appointment_date", args.appointment_date)
      .eq("barber_id", barberId)
      .neq("status", "cancelled");
    const toMin = (t: string) => { const [hh, mm] = t.split(":").map(Number); return hh * 60 + mm; };
    const overlap = (clash ?? []).find((a: any) =>
      startMin < toMin(a.end_time) && endMin > toMin(a.start_time)
    );
    if (overlap) {
      throw new Error(
        `El barbero ya tiene una cita ${overlap.start_time}-${overlap.end_time}. Elige otro horario.`
      );
    }

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        customer_id: customerId,
        barber_id: barberId,
        service_id: serviceId,
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
    const barberId = await resolveBarberId(args.barber_id);
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
    if (barberId) update.barber_id = barberId;
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
    console.log("[list_customer_appointments] args:", { customer_id, phone, include_past });
    let cid = customer_id;
    if (!cid && phone) {
      // Búsqueda tolerante por los últimos 10 dígitos (ignora + y prefijo país)
      const digits = phone.replace(/\D/g, "");
      const tail = digits.slice(-10);
      console.log("[list_customer_appointments] searching tail:", tail);
      const { data: matches, error: mErr } = await supabase
        .from("customers").select("id, phone")
        .or(`phone.ilike.%${tail}%,whatsapp_id.ilike.%${tail}%`);
      console.log("[list_customer_appointments] matches:", matches, "err:", mErr);
      const c = matches?.[0];
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
