import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CalendarPage from "./pages/CalendarPage";
import ClientsPage from "./pages/ClientsPage";
import StaffPage from "./pages/StaffPage";
import SalesPage from "./pages/SalesPage";
import ExpensesPage from "./pages/ExpensesPage";
import WhatsAppPage from "./pages/WhatsAppPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/whatsapp" element={<WhatsAppPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
