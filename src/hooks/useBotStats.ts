import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, differenceInCalendarDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const INACTIVITY_DAYS = 30;

export interface InactiveCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lastVisit: string;
  daysInactive: number;
}

export interface BotStats {
  today: {
    citasGeneradas: number;
    ventasPotenciales: number;
    conversaciones: number;
    cancelaciones: number;
    clientesRecuperados: number;
    conversionRate: number | null;
  };
  month: {
    ventasGeneradas: number;
  };
  inactiveCustomers: InactiveCustomer[];
}

interface AppointmentRow {
  customer_id: string | null;
  status: string;
  source: string | null;
  services: { price: number } | null;
}

interface SalesEntryRow {
  amount: number;
  status: string;
  source: string;
}

interface CustomerNoteRow {
  customer_id: string | null;
}

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

/**
 * Métricas de desempeño del bot de WhatsApp para el dashboard de
 * estadísticas. Solo incluye lo que hoy tiene una fuente de datos confiable
 * (appointments/sales_entries/customer_notes); "interesados en reservar",
 * "no terminaron de reservar" y "citas reprogramadas" no se calculan aquí
 * porque nada en el esquema los registra todavía (ver plan de instrumentación
 * pendiente para el bot).
 */
export function useBotStats() {
  return useQuery({
    queryKey: ["bot-stats"],
    queryFn: async (): Promise<BotStats> => {
      const now = new Date();
      const todayStr = format(now, "yyyy-MM-dd");
      const monthStartStr = format(startOfMonth(now), "yyyy-MM-dd");
      const todayStartIso = `${todayStr}T00:00:00`;
      const todayEndIso = `${todayStr}T23:59:59`;

      const [apptsToday, apptsMonth, salesMonth, chatNotesToday, cancelNotesToday, allAppts, customers] = await Promise.all([
        supabase.from("appointments").select("id, customer_id, status, source, services(price)").eq("appointment_date", todayStr),
        supabase.from("appointments").select("id, status, source, services(price)").gte("appointment_date", monthStartStr),
        supabase.from("sales_entries").select("amount, status, source, sale_date").gte("sale_date", monthStartStr),
        supabase.from("customer_notes").select("id, customer_id").eq("note_type", "chat_summary").gte("occurred_at", todayStartIso).lte("occurred_at", todayEndIso),
        supabase.from("customer_notes").select("id").eq("note_type", "cancellation").gte("occurred_at", todayStartIso).lte("occurred_at", todayEndIso),
        supabase.from("appointments").select("customer_id, appointment_date, status").neq("status", "cancelled"),
        supabase.from("customers").select("id, name, phone, email"),
      ]);

      const apptsTodayData = (apptsToday.data ?? []) as unknown as AppointmentRow[];
      const apptsMonthData = (apptsMonth.data ?? []) as unknown as AppointmentRow[];
      const salesMonthData = (salesMonth.data ?? []) as unknown as SalesEntryRow[];
      const chatNotesTodayData = (chatNotesToday.data ?? []) as CustomerNoteRow[];
      const allAppointmentDateRows = (allAppts.data ?? []) as { customer_id: string | null; appointment_date: string }[];
      const customersData = (customers.data ?? []) as CustomerRow[];

      const botApptsToday = apptsTodayData.filter((a) => a.source === "whatsapp");
      const citasGeneradas = botApptsToday.length;
      const ventasPotenciales = botApptsToday.reduce((sum, a) => sum + (Number(a.services?.price) || 0), 0);
      const conversaciones = chatNotesTodayData.length;
      const cancelaciones = cancelNotesToday.data?.length ?? 0;
      const conversionRate = conversaciones > 0 ? (citasGeneradas / conversaciones) * 100 : null;

      const botApptsMonth = apptsMonthData.filter((a) => a.source === "whatsapp" && a.status === "completed");
      const ventasMonthFromAppts = botApptsMonth.reduce((sum, a) => sum + (Number(a.services?.price) || 0), 0);
      const ventasMonthFromEntries = salesMonthData
        .filter((s) => s.source === "whatsapp" && s.status !== "pending")
        .reduce((sum, s) => sum + Number(s.amount), 0);
      const ventasGeneradas = ventasMonthFromAppts + ventasMonthFromEntries;

      // Historial por cliente (excluye hoy) para detectar inactividad/recuperación.
      const historyByCustomer = new Map<string, string[]>();
      allAppointmentDateRows.forEach((a) => {
        if (!a.customer_id) return;
        const arr = historyByCustomer.get(a.customer_id) ?? [];
        arr.push(a.appointment_date);
        historyByCustomer.set(a.customer_id, arr);
      });

      const activeTodayCustomerIds = new Set<string>([
        ...botApptsToday.map((a) => a.customer_id).filter((id): id is string => Boolean(id)),
        ...chatNotesTodayData.map((n) => n.customer_id).filter((id): id is string => Boolean(id)),
      ]);

      let clientesRecuperados = 0;
      activeTodayCustomerIds.forEach((customerId) => {
        const dates = (historyByCustomer.get(customerId) ?? []).filter((d) => d !== todayStr).sort().reverse();
        if (dates.length === 0) return; // cliente nuevo, no "recuperado"
        const gap = differenceInCalendarDays(now, new Date(`${dates[0]}T00:00:00`));
        if (gap >= INACTIVITY_DAYS) clientesRecuperados++;
      });

      const customerById = new Map(customersData.map((c) => [c.id, c]));
      const inactiveCustomers: InactiveCustomer[] = [];
      historyByCustomer.forEach((dates, customerId) => {
        const lastDate = dates.sort().reverse()[0];
        const gap = differenceInCalendarDays(now, new Date(`${lastDate}T00:00:00`));
        if (gap < INACTIVITY_DAYS) return;
        const c = customerById.get(customerId);
        if (!c) return;
        inactiveCustomers.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          lastVisit: lastDate,
          daysInactive: gap,
        });
      });
      inactiveCustomers.sort((a, b) => b.daysInactive - a.daysInactive);

      return {
        today: { citasGeneradas, ventasPotenciales, conversaciones, cancelaciones, clientesRecuperados, conversionRate },
        month: { ventasGeneradas },
        inactiveCustomers,
      };
    },
  });
}

export function downloadInactiveCustomersCsv(customers: InactiveCustomer[]) {
  const header = "nombre,telefono,email,ultima_visita,dias_inactivo";
  const rows = customers.map((c) =>
    [c.name, c.phone ?? "", c.email ?? "", c.lastVisit, c.daysInactive]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clientes-inactivos-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
