import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { StaffAuthProvider } from "@/context/StaffAuthContext";
import { BarangayStatsProvider } from "@/context/BarangayStatsContext";
import { StaffProtectedRoute, ResidentProtectedRoute } from "@/components/ProtectedRoute";
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
import ResidentSettings from "./pages/resident/Settings";
import ResidentIncidents from "./pages/resident/Incidents";
import ResidentEcologicalProfile from "./pages/resident/EcologicalProfile";
import StaffIncidents from "./pages/staff/Incidents";
import StaffSettings from "./pages/staff/Settings";
import StaffResidents from "./pages/staff/Residents";
import StaffHouseholds from "./pages/staff/Households";

import AdminStaffManagement from "./pages/admin/StaffManagement";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminResidentApproval from "./pages/admin/ResidentApproval";
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

  // Auto-logout on new visit (tab close + reopen, new tab, navigate away and back)
  // sessionStorage persists on refresh but clears on tab close — perfect for this
  useEffect(() => {
    const SESSION_MARKER = "bris_active_session";
    const isReturningVisit = sessionStorage.getItem(SESSION_MARKER);

    if (!isReturningVisit) {
      // New visit (new tab, reopened after closing, navigated away and back)
      // Clear all auth tokens to force re-login
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
      // Mark forced logout for both resident and staff
      localStorage.setItem("bris_resident_forced_logout", String(Date.now()));
      localStorage.setItem("bris_staff_forced_logout", String(Date.now()));
    }

    // Mark this tab as having an active session (survives refresh, dies on tab close)
    sessionStorage.setItem(SESSION_MARKER, "true");
  }, []);

  useEffect(() => {
    const handlePageShow = (event: Event) => {
      // Force reload when restored from browser back/forward cache (bfcache)
      if ("persisted" in event && (event as { persisted?: boolean }).persisted) {
        window.location.reload();
      }
    };

    // Also check forced logout on popstate (browser back/forward within SPA)
    const handlePopState = () => {
      const residentForced = localStorage.getItem("bris_resident_forced_logout") !== null;
      const staffForced = localStorage.getItem("bris_staff_forced_logout") !== null;
      if (residentForced || staffForced) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return (
    <>
      <DataPrivacyModal 
        open={showPrivacyNotice} 
        onOpenChange={handlePrivacyNoticeClose}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/request-certificate" element={<RequestCertificate />} />
        <Route path="/track-request" element={<TrackRequest />} />
        <Route path="/contact" element={<Contact />} />
        
        {/* Staff Protected Routes */}
        <Route path="/staff-dashboard" element={
          <StaffProtectedRoute>
            <StaffDashboard />
          </StaffProtectedRoute>
        } />
        <Route path="/staff/incidents" element={
          <StaffProtectedRoute>
            <StaffIncidents />
          </StaffProtectedRoute>
        } />
        <Route path="/staff/residents" element={
          <StaffProtectedRoute>
            <StaffResidents />
          </StaffProtectedRoute>
        } />
        <Route path="/staff/households" element={
          <StaffProtectedRoute>
            <StaffHouseholds />
          </StaffProtectedRoute>
        } />
        
        {/* Admin Protected Routes */}
        <Route path="/admin/staff" element={
          <StaffProtectedRoute 
            requiredFeature="staff_management"
            allowedRoles={['admin', 'barangay_captain']}
          >
            <AdminStaffManagement />
          </StaffProtectedRoute>
        } />
        <Route path="/admin/audit-logs" element={
          <StaffProtectedRoute 
            requiredFeature="audit_logs"
            allowedRoles={['admin', 'barangay_captain']}
          >
            <AdminAuditLogs />
          </StaffProtectedRoute>
        } />
        <Route path="/admin/resident-approval" element={
          <StaffProtectedRoute requiredFeature="resident_approval">
            <AdminResidentApproval />
          </StaffProtectedRoute>
        } />
        
        {/* Resident Protected Routes */}
        <Route path="/resident/dashboard" element={
          <ResidentProtectedRoute>
            <ResidentDashboard />
          </ResidentProtectedRoute>
        } />
        <Route path="/resident/profile" element={
          <ResidentProtectedRoute>
            <ResidentProfile />
          </ResidentProtectedRoute>
        } />
        <Route path="/resident/requests" element={
          <ResidentProtectedRoute>
            <ResidentRequests />
          </ResidentProtectedRoute>
        } />
        <Route path="/resident/messages" element={
          <ResidentProtectedRoute>
            <ResidentMessages />
          </ResidentProtectedRoute>
        } />
        <Route path="/resident/settings" element={
          <ResidentProtectedRoute>
            <ResidentSettings />
          </ResidentProtectedRoute>
        } />
        <Route path="/resident/incidents" element={
          <ResidentProtectedRoute>
            <ResidentIncidents />
          </ResidentProtectedRoute>
        } />
        <Route path="/resident/ecological-profile" element={
          <ResidentProtectedRoute>
            <ResidentEcologicalProfile />
          </ResidentProtectedRoute>
        } />
        
        {/* Staff Settings */}
        <Route path="/staff/settings" element={
          <StaffProtectedRoute>
            <StaffSettings />
          </StaffProtectedRoute>
        } />
        
        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="bris-theme">
      <StaffAuthProvider>
        <BarangayStatsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </BarangayStatsProvider>
      </StaffAuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
