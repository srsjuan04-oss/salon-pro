import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

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
