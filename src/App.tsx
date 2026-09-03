import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

import CalendarPage from "./pages/CalendarPage";
import AppointmentsHistoryPage from "./pages/AppointmentsHistoryPage";
import ClientsPage from "./pages/ClientsPage";
import ClientProfilePage from "./pages/ClientProfilePage";
import TasksPage from "./pages/TasksPage";
import StaffPage from "./pages/StaffPage";
import SalesPage from "./pages/SalesPage";
import ExpensesPage from "./pages/ExpensesPage";
import WhatsAppPage from "./pages/WhatsAppPage";
import AutomationPage from "./pages/AutomationPage";
import SettingsPage from "./pages/SettingsPage";
import PlatformAdminPage from "./pages/PlatformAdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route path="/" element={<ProtectedRoute hideFromBarber><Index /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/appointments-history" element={<ProtectedRoute hideFromBarber><AppointmentsHistoryPage /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute hideFromBarber><ClientsPage /></ProtectedRoute>} />
          <Route path="/clients/:id" element={<ProtectedRoute hideFromBarber><ClientProfilePage /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute hideFromBarber><TasksPage /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute hideFromBarber><StaffPage /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute hideFromBarber><SalesPage /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute hideFromBarber><ExpensesPage /></ProtectedRoute>} />
          <Route path="/whatsapp" element={<ProtectedRoute hideFromBarber><WhatsAppPage /></ProtectedRoute>} />
          <Route path="/automation" element={<ProtectedRoute hideFromBarber><AutomationPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute requireAdmin><SettingsPage /></ProtectedRoute>} />
          <Route path="/empresas" element={<ProtectedRoute requirePlatformAdmin><PlatformAdminPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
