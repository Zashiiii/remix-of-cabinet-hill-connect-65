import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  TrendingUp,
  Activity,
  Bell,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Phone,
  Mail,
  Calendar,
  User,
  AlertCircle,
  AlertTriangle,
  Settings,
  History,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useStaffAuthContext } from "@/context/StaffAuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPendingRequests,
  updateRequestStatus,
  fetchActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  fetchAllRequests,
  fetchRecentProcessedRequests,
} from "@/utils/api";

interface PendingRequest {
  id: string;
  residentName: string;
  certificateType: string;
  dateSubmitted: string;
  status: "pending" | "processing" | "approved" | "rejected" | "verifying";
  verificationStatus?: "verified" | "not-verified" | "checking";
  processedBy?: string;
  processedDate?: string;
  notes?: string;
  contactNumber?: string;
  email?: string;
  householdNumber?: string;
  purpose?: string;
  priority?: string;
  readyDate?: string;
  rejectionReason?: string;
  residentNotes?: string;
}

interface Announcement {
  id: string;
  type: "important" | "general";
  title: string;
  titleTl: string;
  description: string;
  descriptionTl: string;
  date: string;
}

const StaffSidebar = ({ 
  activeTab, 
  setActiveTab, 
  onLogout,
  userRole,
}: { 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  userRole?: string;
}) => {
  const { state } = useSidebar();
  const navigate = useNavigate();

  const mainMenuItems = [
    { title: "Home", icon: Home, tab: "home" },
    { title: "Certificate Requests", icon: FileText, tab: "certificate-requests" },
    { title: "Incident/Blotter", icon: AlertTriangle, tab: "incidents", route: "/staff/incidents" },
    { title: "Manage Announcements", icon: Bell, tab: "announcements" },
    { title: "Manage Residents", icon: Users, route: "/staff/residents" },
    { title: "View Reports", icon: BarChart3, tab: "view-reports" },
  ];

  const adminMenuItems = [
    { title: "Certificate Templates", icon: FileText, route: "/admin/templates" },
    { title: "Staff Management", icon: Shield, route: "/admin/staff" },
    { title: "Audit Logs", icon: History, route: "/admin/audit-logs" },
  ];

  const isCollapsed = state === "collapsed";
  const isAdmin = userRole === "admin";

  const handleMenuClick = (item: { tab?: string; route?: string }) => {
    if (item.route) {
      navigate(item.route);
    } else if (item.tab) {
      setActiveTab(item.tab);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          <h2 className={`font-bold text-lg text-primary ${isCollapsed ? "hidden" : "block"}`}>
            Staff Portal
          </h2>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "hidden" : "block"}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => handleMenuClick(item)}
                    className={`hover:bg-muted/50 ${activeTab === item.tab ? "bg-muted text-primary font-medium" : ""}`}
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "hidden" : "block"}>
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleMenuClick(item)}
                      className="hover:bg-muted/50"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onLogout}
                  className="hover:bg-destructive/10 text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {!isCollapsed && <span>Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useStaffAuthContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("home");
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please login to access the dashboard");
      navigate("/");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Certificate requests state
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [recentRequests, setRecentRequests] = useState<PendingRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [totalResidents, setTotalResidents] = useState(0);

  // View Details Dialog state
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [detailsRequest, setDetailsRequest] = useState<PendingRequest | null>(null);

  // Rejection Dialog state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [requestToReject, setRequestToReject] = useState<PendingRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load certificate requests from Supabase
  const loadRequests = useCallback(async () => {
    try {
      // Fetch from Supabase - both filtered and recent
      const [allData, recentData] = await Promise.all([
        fetchAllRequests(statusFilter),
        fetchRecentProcessedRequests()
      ]);

      if (allData) {
        const mapped: PendingRequest[] = allData.map((item: any) => ({
          id: item.control_number,
          residentName: item.full_name,
          certificateType: item.certificate_type,
          dateSubmitted: item.created_at 
            ? new Date(item.created_at).toLocaleDateString() 
            : new Date().toLocaleDateString(),
          status: (item.status?.toLowerCase() || 'pending') as PendingRequest['status'],
          processedBy: item.processed_by || undefined,
          processedDate: item.updated_at 
            ? new Date(item.updated_at).toLocaleString() 
            : undefined,
          notes: item.notes || undefined,
          rejectionReason: item.notes || undefined,
          contactNumber: item.contact_number || undefined,
          email: item.email || undefined,
          purpose: item.purpose || undefined,
          priority: item.priority || 'Normal',
          readyDate: item.preferred_pickup_date 
            ? new Date(item.preferred_pickup_date).toLocaleDateString()
            : undefined,
          residentNotes: item.household_number ? `Household: ${item.household_number}` : undefined,
        }));
        setRequests(mapped);
      }

      if (recentData) {
        const mappedRecent: PendingRequest[] = recentData.map((item: any) => ({
          id: item.control_number,
          residentName: item.full_name,
          certificateType: item.certificate_type,
          dateSubmitted: item.created_at 
            ? new Date(item.created_at).toLocaleDateString() 
            : new Date().toLocaleDateString(),
          status: (item.status?.toLowerCase() || 'pending') as PendingRequest['status'],
          processedBy: item.processed_by || undefined,
          processedDate: item.updated_at 
            ? new Date(item.updated_at).toLocaleString() 
            : undefined,
          notes: item.notes || undefined,
          rejectionReason: item.notes || undefined,
        }));
        setRecentRequests(mappedRecent);
      }

      // Get resident count
      const { count } = await supabase
        .from('residents')
        .select('*', { count: 'exact', head: true });
      setTotalResidents(count || 0);

    } catch (error) {
      console.error("Error loading requests:", error);
      toast.error("Failed to load certificate requests");
    } finally {
      setIsDataLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      loadRequests();
      
      // Real-time subscription for certificate requests
      const requestsChannel = supabase
        .channel('certificate-requests-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'certificate_requests'
        }, () => {
          console.log('Certificate request changed, reloading...');
          loadRequests();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(requestsChannel);
      };
    }
  }, [isAuthenticated, loadRequests]);

  // Open View Details Dialog
  const handleViewDetails = (request: PendingRequest) => {
    setDetailsRequest(request);
    setShowDetailsDialog(true);
  };

  // Open Rejection Dialog
  const handleOpenRejectDialog = (request: PendingRequest) => {
    setRequestToReject(request);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  // Confirm Rejection with reason
  const handleConfirmReject = async () => {
    if (!requestToReject || !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsProcessing(true);
    const staffName = user?.fullName || "Staff Admin";

    try {
      // Get database record by control number
      const { data: dbRequest, error: fetchError } = await supabase
        .from('certificate_requests')
        .select('id')
        .eq('control_number', requestToReject.id)
        .single();

      if (fetchError || !dbRequest) {
        throw new Error("Request not found in database");
      }

      // Update in Supabase with rejection reason
      await updateRequestStatus(
        dbRequest.id, 
        'Rejected', 
        staffName,
        rejectionReason.trim()
      );

      toast.success(`Request rejected successfully`, {
        description: `Certificate for ${requestToReject.residentName} has been rejected.`
      });

      // Close dialog and reload
      setShowRejectDialog(false);
      setRequestToReject(null);
      setRejectionReason("");
      loadRequests();
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      if (error.message?.includes('RLS') || error.message?.includes('policy')) {
        toast.error("Permission denied. Please contact administrator.");
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error(`Failed to reject request: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = async (action: string, request: PendingRequest) => {
    const timestamp = new Date().toLocaleString();
    const staffName = user?.fullName || "Staff Admin";

    // Handle View action
    if (action === "View") {
      handleViewDetails(request);
      return;
    }

    // Handle Reject action - open dialog instead of direct rejection
    if (action === "Reject") {
      handleOpenRejectDialog(request);
      return;
    }
    
    if (action === "Approve" || action === "Verifying") {
      setIsProcessing(true);
      try {
        // Get database record by control number
        const { data: dbRequest, error: fetchError } = await supabase
          .from('certificate_requests')
          .select('id')
          .eq('control_number', request.id)
          .single();

        if (fetchError || !dbRequest) {
          throw new Error("Request not found in database");
        }

        // Map action to status
        const statusMap: Record<string, string> = {
          'Approve': 'Approved',
          'Verifying': 'Verifying',
        };

        const newStatus = statusMap[action];
        const actionNote = action === 'Approve' 
          ? 'Approved - All requirements verified'
          : 'Under verification';

        // Update in Supabase
        await updateRequestStatus(
          dbRequest.id, 
          newStatus, 
          staffName,
          actionNote
        );

        // Update local state
        const updatedRequests = requests.map(r => 
          r.id === request.id 
            ? { 
                ...r, 
                status: newStatus.toLowerCase() as PendingRequest['status'], 
                processedBy: staffName,
                processedDate: timestamp,
                notes: actionNote
              } 
            : r
        );
        setRequests(updatedRequests);

        const actionMessage = action === 'Approve' 
          ? 'approved' 
          : 'marked as verifying';
        
        toast.success(`Request ${actionMessage} successfully`, {
          description: `Certificate for ${request.residentName} has been ${actionMessage}.`
        });

        // Reload to get fresh data
        loadRequests();
      } catch (error: any) {
        console.error(`Error ${action}ing request:`, error);
        if (error.message?.includes('RLS') || error.message?.includes('policy')) {
          toast.error("Permission denied. Please contact administrator.");
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          toast.error("Network error. Please check your connection.");
        } else {
          toast.error(`Failed to ${action.toLowerCase()} request: ${error.message || 'Unknown error'}`);
        }
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Create demo request for testing
  const createDemoRequest = async () => {
    const demoControlNumber = `DEMO-${Date.now().toString().slice(-8)}`;
    
    try {
      const { error } = await supabase.from('certificate_requests').insert({
        control_number: demoControlNumber,
        certificate_type: 'Barangay Clearance',
        full_name: 'Juan Dela Cruz',
        contact_number: '09123456789',
        email: 'juan.delacruz@email.com',
        purpose: 'Employment requirement for job application at ABC Company',
        priority: 'Normal',
        status: 'Pending',
        household_number: 'A-01',
        birth_date: '1990-05-15',
        preferred_pickup_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      if (error) throw error;

      toast.success(`Demo request created: ${demoControlNumber}`);
      loadRequests();
    } catch (error: any) {
      console.error("Error creating demo request:", error);
      toast.error(`Failed to create demo request: ${error.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      processing: "default",
      verifying: "default",
      approved: "outline",
      rejected: "destructive",
    };
    
    const labels: Record<string, string> = {
      pending: "Pending",
      processing: "Processing",
      verifying: "Under Verification",
      approved: "Approved",
      rejected: "Rejected",
    };

    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      processing: "bg-blue-100 text-blue-800 border-blue-200",
      verifying: "bg-purple-100 text-purple-800 border-purple-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    
    return (
      <Badge 
        variant={variants[status] || "default"} 
        className={colors[status] || ""}
      >
        {labels[status] || status}
      </Badge>
    );
  };

  // Announcement Management
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    titleTl: "",
    description: "",
    descriptionTl: "",
    type: "general" as "important" | "general",
  });

  // Load announcements from Supabase
  const loadAnnouncements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (data && !error) {
        const mapped: Announcement[] = data.map((item) => ({
          id: item.id,
          type: (item.type === 'important' ? 'important' : 'general') as "important" | "general",
          title: item.title,
          titleTl: item.title_tl || item.title,
          description: item.content,
          descriptionTl: item.content_tl || item.content,
          date: new Date(item.created_at || Date.now()).toLocaleDateString("en-US", { 
            year: "numeric", 
            month: "long", 
            day: "numeric" 
          }),
        }));
        setAnnouncements(mapped);
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem("barangay_announcements");
        if (stored) {
          const parsed = JSON.parse(stored);
          setAnnouncements(Array.isArray(parsed) ? parsed : []);
        }
      }
    } catch (error) {
      console.error("Error loading announcements:", error);
      try {
        const stored = localStorage.getItem("barangay_announcements");
        if (stored) {
          const parsed = JSON.parse(stored);
          setAnnouncements(Array.isArray(parsed) ? parsed : []);
        }
      } catch {
        setAnnouncements([]);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAnnouncements();
      
      // Real-time subscription for announcements
      const announcementsChannel = supabase
        .channel('announcements-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'announcements'
        }, () => {
          console.log('Announcements changed, reloading...');
          loadAnnouncements();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(announcementsChannel);
      };
    }
  }, [isAuthenticated, loadAnnouncements]);

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingAnnouncement) {
        // Update existing announcement
        await updateAnnouncement(editingAnnouncement.id, {
          title: announcementForm.title,
          content: announcementForm.description,
          titleTl: announcementForm.titleTl,
          contentTl: announcementForm.descriptionTl,
          type: announcementForm.type,
        });
        toast.success("Announcement updated successfully");
      } else {
        // Create new announcement
        await createAnnouncement({
          title: announcementForm.title,
          content: announcementForm.description,
          titleTl: announcementForm.titleTl,
          contentTl: announcementForm.descriptionTl,
          type: announcementForm.type,
          createdBy: user?.id,
        });
        toast.success("Announcement created successfully");
      }

      // Reload announcements
      await loadAnnouncements();

      // Also update localStorage for backward compatibility
      const localAnnouncement: Announcement = {
        id: editingAnnouncement?.id || `ann-${Date.now()}`,
        type: announcementForm.type,
        title: announcementForm.title,
        titleTl: announcementForm.titleTl || announcementForm.title,
        description: announcementForm.description,
        descriptionTl: announcementForm.descriptionTl || announcementForm.description,
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      };

      const storedAnnouncements = JSON.parse(localStorage.getItem("barangay_announcements") || "[]");
      let updatedLocal;
      if (editingAnnouncement) {
        updatedLocal = storedAnnouncements.map((a: Announcement) => 
          a.id === editingAnnouncement.id ? localAnnouncement : a
        );
      } else {
        updatedLocal = [localAnnouncement, ...storedAnnouncements];
      }
      localStorage.setItem("barangay_announcements", JSON.stringify(updatedLocal));
      
      window.dispatchEvent(new StorageEvent("storage", {
        key: "barangay_announcements",
        newValue: JSON.stringify(updatedLocal),
      }));

      setShowAnnouncementDialog(false);
      setEditingAnnouncement(null);
      setAnnouncementForm({ title: "", titleTl: "", description: "", descriptionTl: "", type: "general" });
    } catch (error) {
      console.error("Error saving announcement:", error);
      toast.error("Failed to save announcement");
    }
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      titleTl: announcement.titleTl,
      description: announcement.description,
      descriptionTl: announcement.descriptionTl,
      type: announcement.type,
    });
    setShowAnnouncementDialog(true);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      await loadAnnouncements();

      // Also update localStorage
      const storedAnnouncements = JSON.parse(localStorage.getItem("barangay_announcements") || "[]");
      const updatedLocal = storedAnnouncements.filter((a: Announcement) => a.id !== id);
      localStorage.setItem("barangay_announcements", JSON.stringify(updatedLocal));
      
      window.dispatchEvent(new StorageEvent("storage", {
        key: "barangay_announcements",
        newValue: JSON.stringify(updatedLocal),
      }));
      
      toast.success("Announcement deleted successfully");
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  // Show loading state
  if (authLoading || isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StaffSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} userRole={user?.role} />
        
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <header className="h-16 border-b bg-card flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SidebarTrigger>
              <h1 className="text-xl font-bold text-foreground">Staff Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-foreground">
                  {user?.fullName || "Staff Admin"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            {activeTab === "home" && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Residents</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalResidents || 1344}</div>
                      <p className="text-xs text-muted-foreground">Registered residents</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{pendingCount}</div>
                      <p className="text-xs text-muted-foreground">Awaiting processing</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Processed Today</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {requests.filter(r => r.status === "approved" || r.status === "rejected").length}
                      </div>
                      <p className="text-xs text-muted-foreground">Certificates processed</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">System Status</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">Online</div>
                      <p className="text-xs text-muted-foreground">All systems operational</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => navigate("/request-certificate")}>
                      <FileText className="h-4 w-4 mr-2" />
                      New Certificate Request
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("announcements")}>
                      <Bell className="h-4 w-4 mr-2" />
                      Manage Announcements
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("certificate-requests")}>
                      <FileText className="h-4 w-4 mr-2" />
                      View Certificate Requests
                    </Button>
                  </div>
                </div>

                {/* Recent Requests */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Certificate Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {requests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No certificate requests yet</p>
                        <p className="text-sm">Requests submitted by residents will appear here</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Request ID</TableHead>
                            <TableHead>Resident Name</TableHead>
                            <TableHead>Certificate Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requests.slice(0, 5).map((request) => (
                            <TableRow key={request.id}>
                              <TableCell className="font-medium">{request.id}</TableCell>
                              <TableCell>{request.residentName}</TableCell>
                              <TableCell>{request.certificateType}</TableCell>
                              <TableCell>{request.dateSubmitted}</TableCell>
                              <TableCell>{getStatusBadge(request.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "certificate-requests" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Certificate Requests</h2>
                </div>

                {/* Status Filter Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {["All", "Pending", "Verifying", "Approved", "Rejected"].map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      onClick={() => setStatusFilter(status)}
                      size="sm"
                    >
                      {status}
                    </Button>
                  ))}
                </div>

                {isDataLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="inline-block animate-spin h-8 w-8 text-primary" />
                    <p className="mt-2 text-muted-foreground">Loading requests...</p>
                  </div>
                ) : (
                  <>
                    {/* Pending/Filtered Certificate Requests Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          {statusFilter === "All" ? "All Certificate Requests" : `${statusFilter} Requests`}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {requests.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No {statusFilter !== "All" ? statusFilter.toLowerCase() : ""} requests found</p>
                            <p className="text-sm">When residents submit certificate requests, they will appear here for processing</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Control Number</TableHead>
                                <TableHead>Resident Name</TableHead>
                                <TableHead>Certificate Type</TableHead>
                                <TableHead>Date Submitted</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {requests.map((request) => (
                                <TableRow key={request.id}>
                                  <TableCell className="font-medium font-mono text-xs">{request.id}</TableCell>
                                  <TableCell>{request.residentName}</TableCell>
                                  <TableCell>{request.certificateType}</TableCell>
                                  <TableCell>{request.dateSubmitted}</TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      {getStatusBadge(request.status)}
                                      {request.processedBy && (
                                        <div className="text-xs text-muted-foreground">
                                          By: {request.processedBy}
                                          <br />
                                          {request.processedDate}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAction("View", request)}
                                        title="View Details"
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        View
                                      </Button>
                                      {(request.status === "pending" || request.status === "verifying") && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleAction("Approve", request)}
                                            className="hover:bg-green-50 text-green-600"
                                            disabled={isProcessing}
                                            title="Approve Request"
                                          >
                                            <CheckCircle className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleAction("Reject", request)}
                                            className="hover:bg-red-50 text-red-600"
                                            disabled={isProcessing}
                                            title="Reject Request"
                                          >
                                            <XCircle className="h-4 w-4" />
                                          </Button>
                                          {request.status === "pending" && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleAction("Verifying", request)}
                                              className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                              disabled={isProcessing}
                                              title="Mark as Verifying"
                                            >
                                              <Clock className="h-4 w-4 mr-1" />
                                              Verify
                                            </Button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>

                    {/* Recent Certificate Requests (History) */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Certificate Requests (Last 30 Days)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {recentRequests.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No recent processed requests found</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Control Number</TableHead>
                                <TableHead>Resident Name</TableHead>
                                <TableHead>Certificate Type</TableHead>
                                <TableHead>Date Submitted</TableHead>
                                <TableHead>Current Status</TableHead>
                                <TableHead>Processed Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {recentRequests.map((request) => (
                                <TableRow key={request.id}>
                                  <TableCell className="font-medium font-mono text-xs">{request.id}</TableCell>
                                  <TableCell>{request.residentName}</TableCell>
                                  <TableCell>{request.certificateType}</TableCell>
                                  <TableCell>{request.dateSubmitted}</TableCell>
                                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                                  <TableCell>
                                    {request.processedDate || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}

            {activeTab === "announcements" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Manage Announcements</h2>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => window.open('/', '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View on Landing Page
                    </Button>
                    <Button onClick={() => {
                      setEditingAnnouncement(null);
                      setAnnouncementForm({ title: "", titleTl: "", description: "", descriptionTl: "", type: "general" });
                      setShowAnnouncementDialog(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Announcement
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-6">
                    {announcements.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No announcements yet</p>
                        <p className="text-sm">Create your first announcement to inform residents</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {announcements.map((announcement) => (
                            <TableRow key={announcement.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{announcement.title}</p>
                                  <p className="text-sm text-muted-foreground line-clamp-2">{announcement.description}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={announcement.type === "important" ? "destructive" : "default"}>
                                  {announcement.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {announcement.date}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingAnnouncement(announcement);
                                      setAnnouncementForm({
                                        title: announcement.title,
                                        titleTl: announcement.titleTl,
                                        description: announcement.description,
                                        descriptionTl: announcement.descriptionTl,
                                        type: announcement.type,
                                      });
                                      setShowAnnouncementDialog(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      if (confirm("Are you sure you want to delete this announcement?")) {
                                        try {
                                          await deleteAnnouncement(announcement.id);
                                          toast.success("Announcement deleted successfully");
                                          loadAnnouncements();
                                        } catch (error) {
                                          toast.error("Failed to delete announcement");
                                        }
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "manage-residents" && (
              <Card>
                <CardHeader>
                  <CardTitle>Manage Residents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Resident Management</p>
                    <p className="text-sm">Feature coming in Phase 2</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "view-reports" && (
              <Card>
                <CardHeader>
                  <CardTitle>Reports & Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Reports & Analytics</p>
                    <p className="text-sm">Feature coming in Phase 2</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Request Details
            </DialogTitle>
            <DialogDescription>
              Complete information for certificate request {detailsRequest?.id}
            </DialogDescription>
          </DialogHeader>
          
          {detailsRequest && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Current Status</span>
                {getStatusBadge(detailsRequest.status)}
              </div>

              {/* Request Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Control Number</Label>
                  <p className="font-mono text-sm font-medium">{detailsRequest.id}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Certificate Type</Label>
                  <p className="font-medium">{detailsRequest.certificateType}</p>
                </div>
              </div>

              {/* Resident Information */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Resident Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Full Name</Label>
                    <p className="font-medium">{detailsRequest.residentName}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Contact Number
                    </Label>
                    <p>{detailsRequest.contactNumber || 'Not provided'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </Label>
                    <p>{detailsRequest.email || 'Not provided'}</p>
                  </div>
                  {detailsRequest.residentNotes && (
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs text-muted-foreground">Additional Info</Label>
                      <p className="text-sm">{detailsRequest.residentNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Request Details */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Request Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Date Submitted</Label>
                    <p>{detailsRequest.dateSubmitted}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <Badge variant={detailsRequest.priority === 'Urgent' ? 'destructive' : 'secondary'}>
                      {detailsRequest.priority || 'Normal'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Preferred Pickup Date</Label>
                    <p>{detailsRequest.readyDate || 'Not specified'}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-muted-foreground">Purpose</Label>
                    <p className="text-sm">{detailsRequest.purpose || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Processing Information */}
              {(detailsRequest.processedBy || detailsRequest.notes || detailsRequest.rejectionReason) && (
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Processing Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                    {detailsRequest.processedBy && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Processed By</Label>
                        <p>{detailsRequest.processedBy}</p>
                      </div>
                    )}
                    {detailsRequest.processedDate && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Processed Date</Label>
                        <p>{detailsRequest.processedDate}</p>
                      </div>
                    )}
                    {detailsRequest.notes && (
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs text-muted-foreground">Admin Notes</Label>
                        <p className="text-sm">{detailsRequest.notes}</p>
                      </div>
                    )}
                    {detailsRequest.rejectionReason && (
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs text-muted-foreground text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Rejection Reason
                        </Label>
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{detailsRequest.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            {detailsRequest && (detailsRequest.status === "pending" || detailsRequest.status === "verifying") && (
              <>
                <Button 
                  variant="default" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    handleAction("Approve", detailsRequest);
                  }}
                  disabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    handleAction("Reject", detailsRequest);
                  }}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Request
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this certificate request. This will be visible to the resident.
            </DialogDescription>
          </DialogHeader>
          
          {requestToReject && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  <strong>Request:</strong> {requestToReject.id}
                </p>
                <p className="text-sm">
                  <strong>Resident:</strong> {requestToReject.residentName}
                </p>
                <p className="text-sm">
                  <strong>Certificate:</strong> {requestToReject.certificateType}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejection-reason" className="text-sm font-medium">
                  Rejection Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Incomplete documentation. Please bring valid ID when visiting the barangay hall."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This message will be shown to the resident when they track their request.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRejectDialog(false);
                setRequestToReject(null);
                setRejectionReason("");
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={isProcessing || !rejectionReason.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? "Edit Announcement" : "Create New Announcement"}</DialogTitle>
            <DialogDescription>
              {editingAnnouncement 
                ? "Update the announcement details below. Changes will be visible on the landing page immediately."
                : "Fill in the details below to create a new announcement. It will appear on the landing page for residents."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title (English)*</Label>
              <Input
                id="title"
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                placeholder="Enter announcement title"
              />
            </div>
            <div>
              <Label htmlFor="titleTl">Title (Tagalog)</Label>
              <Input
                id="titleTl"
                value={announcementForm.titleTl}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, titleTl: e.target.value })}
                placeholder="Ilagay ang pamagat"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (English)*</Label>
              <Textarea
                id="description"
                value={announcementForm.description}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, description: e.target.value })}
                placeholder="Enter announcement description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="descriptionTl">Description (Tagalog)</Label>
              <Textarea
                id="descriptionTl"
                value={announcementForm.descriptionTl}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, descriptionTl: e.target.value })}
                placeholder="Ilagay ang deskripsyon"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="type">Type*</Label>
              <Select
                value={announcementForm.type}
                onValueChange={(value: "important" | "general") => 
                  setAnnouncementForm({ ...announcementForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="important">Important (Yellow/Red)</SelectItem>
                  <SelectItem value="general">General (Blue)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnnouncementDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAnnouncement}>
              {editingAnnouncement ? "Update" : "Create"} Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default StaffDashboard;
