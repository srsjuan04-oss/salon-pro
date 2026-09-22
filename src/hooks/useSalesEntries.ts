import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type FulfillmentStatus = "preparing" | "out_for_delivery" | "delivered";

export interface Sale {
  id: string;
  client: string;
  service: string;
  amount: number;
  stylist: string;
  date: string;
  time: string;
  method: string;
  status: "paid" | "pending";
  /** Solo presente en pedidos de producto hechos por el bot (request_product). */
  fulfillmentStatus: FulfillmentStatus | null;
  /** Dirección de envío del pedido (solo pedidos de producto). */
  deliveryAddress: string | null;
  /** Tiempo estimado de entrega, editable por el negocio (ej: "30-45 min"). */
  estimatedDelivery: string | null;
}

/**
 * Las "ventas" de la app son la unión de dos fuentes: citas completadas
 * (appointments) y registros manuales (sales_entries). Antes vivía como
 * loadSales() inline en SalesPage.tsx con su propio useState/useEffect.
 */
export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async (): Promise<Sale[]> => {
      const [apptRes, entryRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, appointment_date, start_time, status, customers(name), services(name, price), barbers(name)")
          .neq("status", "cancelled")
          .order("appointment_date", { ascending: false }),
        supabase.from("sales_entries").select("*").order("sale_date", { ascending: false }),
      ]);
      if (apptRes.error) throw apptRes.error;
      if (entryRes.error) throw entryRes.error;

      const fromAppts: Sale[] = (apptRes.data ?? []).map((a: any) => ({
        id: a.id,
        client: a.customers?.name ?? "Sin cliente",
        service: a.services?.name ?? "Servicio",
        amount: Number(a.services?.price) || 0,
        stylist: a.barbers?.name ?? "—",
        date: a.appointment_date,
        time: (a.start_time ?? "").slice(0, 5),
        method: a.status === "completed" ? "Efectivo" : "-",
        status: a.status === "completed" ? "paid" : "pending",
        fulfillmentStatus: null,
        deliveryAddress: null,
        estimatedDelivery: null,
      }));
      const fromEntries: Sale[] = (entryRes.data ?? []).map((e: any) => ({
        id: `entry-${e.id}`,
        client: e.client_name,
        service: e.service_name,
        amount: Number(e.amount),
        stylist: e.stylist_name ?? "—",
        date: e.sale_date,
        time: e.sale_time ?? "",
        method: e.payment_method ?? "-",
        status: e.status === "pending" ? "pending" : "paid",
        fulfillmentStatus: e.fulfillment_status ?? null,
        deliveryAddress: e.delivery_address ?? null,
        estimatedDelivery: e.estimated_delivery ?? null,
      }));

      return [...fromAppts, ...fromEntries].sort((a, b) => b.date.localeCompare(a.date));
    },
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: { client: string; service: string; amount: number; paymentMethod: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("sales_entries").insert({
        client_name: sale.client,
        service_name: sale.service,
        amount: sale.amount,
        sale_date: format(new Date(), "yyyy-MM-dd"),
        sale_time: format(new Date(), "HH:mm"),
        payment_method: sale.paymentMethod || null,
        status: "paid",
        source: "manual",
        created_by: userData.user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

/**
 * Solo aplica a filas de sales_entries (pedidos de producto vía WhatsApp,
 * id con prefijo "entry-"). Las citas no tienen estado de entrega.
 */
export function useUpdateFulfillmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, status }: { saleId: string; status: FulfillmentStatus }) => {
      const realId = saleId.replace("entry-", "");
      const { error } = await supabase
        .from("sales_entries")
        .update({ fulfillment_status: status })
        .eq("id", realId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

/**
 * Solo aplica a filas de sales_entries (pedidos de producto vía WhatsApp,
 * id con prefijo "entry-"). Permite al negocio anotar/editar el tiempo
 * estimado de entrega para que el bot lo informe si el cliente pregunta.
 */
export function useUpdateEstimatedDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, estimatedDelivery }: { saleId: string; estimatedDelivery: string }) => {
      const realId = saleId.replace("entry-", "");
      const { error } = await supabase
        .from("sales_entries")
        .update({ estimated_delivery: estimatedDelivery || null })
        .eq("id", realId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

export function useMarkSaleAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, method }: { saleId: string; method: string }) => {
      if (saleId.startsWith("entry-")) {
        const realId = saleId.replace("entry-", "");
        const { error } = await supabase
          .from("sales_entries")
          .update({ status: "paid", payment_method: method })
          .eq("id", realId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointments").update({ status: "completed" }).eq("id", saleId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}
