import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { StaffAuthProvider } from "@/context/StaffAuthContext";
import DataPrivacyModal from "@/components/DataPrivacyModal";
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
import PrivacyPolicy from "./pages/PrivacyPolicy";

const queryClient = new QueryClient();

const PRIVACY_NOTICE_KEY = "bris_privacy_notice_shown";

const AppContent = () => {
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);

  useEffect(() => {
    // Check if privacy notice has been shown before
    const hasShownNotice = localStorage.getItem(PRIVACY_NOTICE_KEY);
    if (!hasShownNotice) {
      // Delay showing modal slightly for better UX
      const timer = setTimeout(() => {
        setShowPrivacyNotice(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handlePrivacyNoticeClose = (open: boolean) => {
    if (!open) {
      localStorage.setItem(PRIVACY_NOTICE_KEY, "true");
      setShowPrivacyNotice(false);
    }
  };

  return (
    <>
      <DataPrivacyModal 
        open={showPrivacyNotice} 
        onOpenChange={handlePrivacyNoticeClose}
      />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
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
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="bris-theme">
      <StaffAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </StaffAuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
