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
} from "@/utils/api";

interface PendingRequest {
  id: string;
  residentName: string;
  certificateType: string;
  dateSubmitted: string;
  status: "pending" | "processing" | "approved" | "rejected";
  verificationStatus?: "verified" | "not-verified" | "checking";
  processedBy?: string;
  processedDate?: string;
  notes?: string;
  contactNumber?: string;
  email?: string;
  householdNumber?: string;
  purpose?: string;
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
  onLogout 
}: { 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}) => {
  const { state } = useSidebar();

  const menuItems = [
    { title: "Home", icon: Home, tab: "home" },
    { title: "Certificate Requests", icon: FileText, tab: "certificate-requests" },
    { title: "Manage Announcements", icon: Bell, tab: "announcements" },
    { title: "Manage Residents", icon: Users, tab: "manage-residents" },
    { title: "View Reports", icon: BarChart3, tab: "view-reports" },
  ];

  const isCollapsed = state === "collapsed";

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
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.tab)}
                    className={`hover:bg-muted/50 ${activeTab === item.tab ? "bg-muted text-primary font-medium" : ""}`}
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [totalResidents, setTotalResidents] = useState(0);

  // Load certificate requests from Supabase
  const loadRequests = useCallback(async () => {
    try {
      // Fetch from Supabase
      const { data: supabaseData, error } = await supabase
        .from('certificate_requests')
        .select('*')
        .order('resident_name', { ascending: true });

      if (supabaseData && !error) {
        const mapped: PendingRequest[] = supabaseData.map((item) => ({
          id: item.control_number,
          residentName: item.resident_name,
          certificateType: item.certificate_type,
          dateSubmitted: item.requested_date 
            ? new Date(item.requested_date).toLocaleDateString() 
            : new Date().toLocaleDateString(),
          status: (item.status?.toLowerCase() || 'pending') as PendingRequest['status'],
          processedBy: item.processed_by || undefined,
          processedDate: item.processed_date 
            ? new Date(item.processed_date).toLocaleString() 
            : undefined,
          notes: item.admin_notes || item.rejection_reason || undefined,
          contactNumber: item.resident_contact || undefined,
          email: item.resident_email || undefined,
          purpose: item.purpose,
        }));
        setRequests(mapped);
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem("certificateRequests");
        if (stored) {
          const parsed = JSON.parse(stored);
          setRequests(Array.isArray(parsed) ? parsed : []);
        }
      }

      // Get resident count
      const { count } = await supabase
        .from('residents')
        .select('*', { count: 'exact', head: true });
      setTotalResidents(count || 0);

    } catch (error) {
      console.error("Error loading requests:", error);
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem("certificateRequests");
        if (stored) {
          const parsed = JSON.parse(stored);
          setRequests(Array.isArray(parsed) ? parsed : []);
        }
      } catch {
        setRequests([]);
      }
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadRequests();
      // Refresh every 30 seconds
      const interval = setInterval(loadRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadRequests]);

  const handleAction = async (action: string, request: PendingRequest) => {
    const timestamp = new Date().toLocaleString();
    const staffName = user?.fullName || "Staff Admin";
    
    if (action === "Approve") {
      try {
        // Update in Supabase
        const { data: dbRequest } = await supabase
          .from('certificate_requests')
          .select('id')
          .eq('control_number', request.id)
          .single();

        if (dbRequest) {
          await updateRequestStatus(
            dbRequest.id, 
            'Approved', 
            staffName,
            'Approved - All requirements verified'
          );
        }

        const updatedRequests = requests.map(r => 
          r.id === request.id 
            ? { 
                ...r, 
                status: "approved" as const, 
                processedBy: staffName,
                processedDate: timestamp,
                notes: "Approved - All requirements verified"
              } 
            : r
        );
        setRequests(updatedRequests);
        localStorage.setItem("certificateRequests", JSON.stringify(updatedRequests));
        toast.success(`Request ${request.id} approved successfully`, {
          description: `Certificate for ${request.residentName} has been approved.`
        });
      } catch (error) {
        console.error("Error approving request:", error);
        toast.error("Failed to approve request");
      }
    } else if (action === "Reject") {
      try {
        const { data: dbRequest } = await supabase
          .from('certificate_requests')
          .select('id')
          .eq('control_number', request.id)
          .single();

        if (dbRequest) {
          await updateRequestStatus(
            dbRequest.id, 
            'Rejected', 
            staffName,
            'Rejected - Incomplete requirements'
          );
        }

        const updatedRequests = requests.map(r => 
          r.id === request.id 
            ? { 
                ...r, 
                status: "rejected" as const, 
                processedBy: staffName,
                processedDate: timestamp,
                notes: "Rejected - Incomplete requirements"
              } 
            : r
        );
        setRequests(updatedRequests);
        localStorage.setItem("certificateRequests", JSON.stringify(updatedRequests));
        toast.error(`Request ${request.id} rejected`, {
          description: `Certificate request for ${request.residentName} has been rejected.`
        });
      } catch (error) {
        console.error("Error rejecting request:", error);
        toast.error("Failed to reject request");
      }
    } else if (action === "View") {
      setSelectedRequest(request);
      toast.info(`Viewing details for request ${request.id}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      processing: "default",
      approved: "outline",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
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
          type: (item.announcement_type === 'important' ? 'important' : 'general') as "important" | "general",
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
        <StaffSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
        
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
              <Card>
                <CardHeader>
                  <CardTitle>Pending Certificate Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {requests.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No certificate requests yet</p>
                      <p className="text-sm">When residents submit certificate requests, they will appear here for processing</p>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Request ID</TableHead>
                            <TableHead>Resident Name</TableHead>
                            <TableHead>Certificate Type</TableHead>
                            <TableHead>Date Submitted</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Verification</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell className="font-medium">{request.id}</TableCell>
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
                                {request.verificationStatus === "verified" && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    ✓ Verified
                                  </Badge>
                                )}
                                {request.verificationStatus === "not-verified" && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    ✗ Not Verified
                                  </Badge>
                                )}
                                {request.verificationStatus === "checking" && (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    Checking...
                                  </Badge>
                                )}
                                {!request.verificationStatus && (
                                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                                    Pending
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAction("View", request)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAction("Approve", request)}
                                    className="hover:bg-green-50"
                                    disabled={request.status !== "pending"}
                                  >
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAction("Reject", request)}
                                    className="hover:bg-red-50"
                                    disabled={request.status !== "pending"}
                                  >
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      {selectedRequest && selectedRequest.notes && (
                        <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
                          <h3 className="font-semibold mb-2">Notes for {selectedRequest.id}</h3>
                          <p className="text-sm text-muted-foreground">{selectedRequest.notes}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "announcements" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Manage Announcements</h2>
                  <Button onClick={() => {
                    setEditingAnnouncement(null);
                    setAnnouncementForm({ title: "", titleTl: "", description: "", descriptionTl: "", type: "general" });
                    setShowAnnouncementDialog(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Announcement
                  </Button>
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
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {announcements.map((announcement) => (
                            <TableRow key={announcement.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{announcement.title}</p>
                                  <p className="text-sm text-muted-foreground">{announcement.titleTl}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={announcement.type === "important" ? "destructive" : "default"}>
                                  {announcement.type}
                                </Badge>
                              </TableCell>
                              <TableCell>{announcement.date}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditAnnouncement(announcement)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
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

      {/* Announcement Dialog */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? "Edit Announcement" : "Create New Announcement"}</DialogTitle>
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
