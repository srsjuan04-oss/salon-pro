import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AppointmentList } from "@/components/dashboard/AppointmentList";
import { StaffPerformance } from "@/components/dashboard/StaffPerformance";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ProfitSummary } from "@/components/dashboard/ProfitSummary";
import { DollarSign, TrendingUp, Calendar, Receipt } from "lucide-react";

export default function Index() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">¡Buenos días, Carlos! 👋</h1>
            <p className="text-muted-foreground mt-1">
              Aquí está el resumen de tu salón para hoy
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 border border-success/20">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium text-success">WhatsApp Conectado</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Utilidad del Mes"
            value="$4,250"
            change={18}
            icon={<TrendingUp className="w-6 h-6" />}
            variant="success"
          />
          <StatCard
            title="Ventas de Hoy"
            value="$2,450"
            change={12}
            icon={<DollarSign className="w-6 h-6" />}
            variant="primary"
          />
          <StatCard
            title="Citas Hoy"
            value="18"
            change={8}
            icon={<Calendar className="w-6 h-6" />}
          />
          <StatCard
            title="Gastos Totales"
            value="$8,200"
            change={-5}
            icon={<Receipt className="w-6 h-6" />}
            variant="info"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <RevenueChart />
            <AppointmentList />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ProfitSummary sales={12450} expenses={8200} />
            <QuickActions />
            <MiniCalendar />
            <StaffPerformance />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
