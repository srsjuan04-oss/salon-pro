import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AppointmentList } from "@/components/dashboard/AppointmentList";
import { StaffPerformance } from "@/components/dashboard/StaffPerformance";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ProfitSummary } from "@/components/dashboard/ProfitSummary";
import { DollarSign, TrendingUp, Calendar, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

export default function Index() {
  const [stats, setStats] = useState({
    monthProfit: 0,
    todaySales: 0,
    todayAppointments: 0,
    monthExpenses: 0,
    monthSales: 0,
  });

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
      const todayStr = format(now, "yyyy-MM-dd");

      const [apptsMonth, apptsToday, entriesMonth, entriesToday, expensesMonth] = await Promise.all([
        supabase.from("appointments").select("status, services(price), appointment_date")
          .gte("appointment_date", monthStart).lte("appointment_date", monthEnd),
        supabase.from("appointments").select("id, status, services(price)")
          .eq("appointment_date", todayStr),
        supabase.from("sales_entries").select("amount, sale_date, status")
          .gte("sale_date", monthStart).lte("sale_date", monthEnd),
        supabase.from("sales_entries").select("amount, status").eq("sale_date", todayStr),
        supabase.from("expenses").select("amount")
          .gte("expense_date", monthStart).lte("expense_date", monthEnd),
      ]);

      const sumAppts = (apptsMonth.data ?? [])
        .filter((a: any) => a.status === "completed")
        .reduce((s: number, a: any) => s + (Number(a.services?.price) || 0), 0);
      const sumEntries = (entriesMonth.data ?? [])
        .filter((e: any) => e.status === "paid")
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const monthSales = sumAppts + sumEntries;

      const todayApptSales = (apptsToday.data ?? [])
        .filter((a: any) => a.status === "completed")
        .reduce((s: number, a: any) => s + (Number(a.services?.price) || 0), 0);
      const todayEntrySales = (entriesToday.data ?? [])
        .filter((e: any) => e.status === "paid")
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

      const monthExpenses = (expensesMonth.data ?? [])
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

      setStats({
        monthProfit: monthSales - monthExpenses,
        todaySales: todayApptSales + todayEntrySales,
        todayAppointments: (apptsToday.data ?? []).length,
        monthExpenses,
        monthSales,
      });
    };
    load();
  }, []);

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">¡Bienvenido! 👋</h1>
            <p className="text-muted-foreground mt-1">
              Aquí está el resumen financiero de tu salón
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 border border-success/20">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium text-success">Sistema Activo</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Utilidad del Mes"
            value={fmt(stats.monthProfit)}
            icon={<TrendingUp className="w-6 h-6" />}
            variant="success"
          />
          <StatCard
            title="Ventas de Hoy"
            value={fmt(stats.todaySales)}
            icon={<DollarSign className="w-6 h-6" />}
            variant="primary"
          />
          <StatCard
            title="Citas Hoy"
            value={String(stats.todayAppointments)}
            icon={<Calendar className="w-6 h-6" />}
          />
          <StatCard
            title="Gastos del Mes"
            value={fmt(stats.monthExpenses)}
            icon={<Receipt className="w-6 h-6" />}
            variant="info"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <RevenueChart />
            <AppointmentList />
          </div>

          <div className="space-y-6">
            <ProfitSummary sales={stats.monthSales} expenses={stats.monthExpenses} />
            <QuickActions />
            <MiniCalendar />
            <StaffPerformance />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
