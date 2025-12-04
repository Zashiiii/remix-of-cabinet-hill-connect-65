import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { StaffAuthProvider } from "@/context/StaffAuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import RequestCertificate from "./pages/RequestCertificate";
import TrackRequest from "./pages/TrackRequest";
import StaffDashboard from "./pages/StaffDashboard";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import ResidentDashboard from "./pages/resident/Dashboard";
import ResidentProfile from "./pages/resident/Profile";
import ResidentRequests from "./pages/resident/Requests";
import ResidentMessages from "./pages/resident/Messages";
import StaffIncidents from "./pages/staff/Incidents";
import StaffResidents from "./pages/staff/Residents";
import AdminTemplates from "./pages/admin/Templates";
import AdminStaffManagement from "./pages/admin/StaffManagement";
import AdminAuditLogs from "./pages/admin/AuditLogs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="bris-theme">
      <StaffAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/request-certificate" element={<RequestCertificate />} />
              <Route path="/track-request" element={<TrackRequest />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/staff-dashboard" element={<StaffDashboard />} />
              {/* Resident Portal Routes */}
              <Route path="/resident/dashboard" element={<ResidentDashboard />} />
              <Route path="/resident/profile" element={<ResidentProfile />} />
              <Route path="/resident/requests" element={<ResidentRequests />} />
              <Route path="/resident/messages" element={<ResidentMessages />} />
              {/* Staff Routes */}
              <Route path="/staff/incidents" element={<StaffIncidents />} />
              <Route path="/staff/residents" element={<StaffResidents />} />
              {/* Admin Routes */}
              <Route path="/admin/templates" element={<AdminTemplates />} />
              <Route path="/admin/staff" element={<AdminStaffManagement />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </StaffAuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
