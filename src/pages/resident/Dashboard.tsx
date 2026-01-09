import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  FileText, 
  Bell, 
  MessageSquare, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  LogOut,
  Home,
  Settings,
  ChevronRight,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { toast } from "sonner";
import { useResidentAuth } from "@/hooks/useResidentAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchActiveAnnouncements } from "@/utils/api";
import CertificateRequestForm from "@/components/CertificateRequestForm";
import SuccessModal from "@/components/SuccessModal";
import ChatWidget from "@/components/ChatWidget";
import { logResidentLogout } from "@/utils/auditLog";

interface Request {
  id: string;
  controlNumber: string;
  certificateType: string;
  status: string;
  dateSubmitted: string;
  rejectionReason?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
}

const ResidentSidebar = ({ 
  activeTab, 
  setActiveTab, 
  onLogout,
  unreadMessageCount,
}: { 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  unreadMessageCount?: number;
}) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const menuItems = [
    { title: "Dashboard", icon: Home, tab: "dashboard" },
    { title: "My Profile", icon: User, tab: "profile" },
    { title: "Request Certificate", icon: FileText, tab: "request" },
    { title: "My Requests", icon: Clock, tab: "requests" },
    { title: "Messages", icon: MessageSquare, tab: "messages", badge: unreadMessageCount },
    { title: "Incident Reports", icon: AlertCircle, tab: "incidents" },
    { title: "Settings", icon: Settings, tab: "settings" },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          <h2 className={`font-bold text-lg text-primary ${isCollapsed ? "hidden" : "block"}`}>
            Resident Portal
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
                    {!isCollapsed && (
                      <span className="flex items-center justify-between flex-1">
                        {item.title}
                        {item.badge && item.badge > 0 && (
                          <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] px-1.5 text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </span>
                    )}
                    {isCollapsed && item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
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

const ResidentDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading: authLoading, logout } = useResidentAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [requests, setRequests] = useState<Request[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedControlNumber, setSubmittedControlNumber] = useState("");
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Auth is now handled by ResidentProtectedRoute wrapper

  useEffect(() => {
    if (isAuthenticated && user) {
      loadData();
    }
  }, [isAuthenticated, user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load user's requests
      const { data: requestsData } = await supabase
        .from("certificate_requests")
        .select("*")
        .eq("email", user?.email)
        .order("created_at", { ascending: false })
        .limit(5);

      if (requestsData) {
        setRequests(requestsData.map(r => ({
          id: r.id,
          controlNumber: r.control_number,
          certificateType: r.certificate_type,
          status: r.status || "pending",
          dateSubmitted: new Date(r.created_at || "").toLocaleDateString(),
          rejectionReason: r.rejection_reason || r.notes,
        })));
      }

      // Load announcements
      const announcementsData = await fetchActiveAnnouncements();
      if (announcementsData) {
        setAnnouncements(announcementsData.slice(0, 3).map((a: any) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          type: a.type,
          createdAt: new Date(a.created_at).toLocaleDateString(),
        })));
      }

      // Load unread message count
      if (user?.id) {
        const { data: msgCount } = await supabase.rpc("get_resident_unread_message_count", {
          p_user_id: user.id,
        });
        setUnreadMessageCount(msgCount || 0);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    // Log the logout action
    if (user && profile) {
      const fullName = profile.firstName && profile.lastName 
        ? `${profile.firstName} ${profile.lastName}`
        : profile.fullName || "Unknown Resident";
      await logResidentLogout(fullName, user.id);
    }
    await logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleTabChange = (tab: string) => {
    if (tab === "profile") {
      navigate("/resident/profile");
    } else if (tab === "requests") {
      navigate("/resident/requests");
    } else if (tab === "settings") {
      navigate("/resident/settings");
    } else if (tab === "incidents") {
      navigate("/resident/incidents");
    } else if (tab === "messages") {
      navigate("/resident/messages");
    } else {
      setActiveTab(tab);
    }
  };

  const handleRequestSuccess = (controlNumber: string) => {
    setSubmittedControlNumber(controlNumber);
    setShowSuccessModal(true);
    loadData(); // Refresh the requests list
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setActiveTab("dashboard");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      verifying: "default",
      approved: "outline",
      rejected: "destructive",
    };
    
    const icons: Record<string, React.ReactNode> = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      verifying: <AlertCircle className="h-3 w-3 mr-1" />,
      approved: <CheckCircle className="h-3 w-3 mr-1" />,
      rejected: <XCircle className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge variant={variants[status.toLowerCase()] || "secondary"} className="capitalize">
        {icons[status.toLowerCase()]}
        {status}
      </Badge>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ResidentSidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabChange}
          onLogout={handleLogout}
          unreadMessageCount={unreadMessageCount}
        />
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {activeTab === "dashboard" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">
                      Welcome, {profile?.firstName && profile?.lastName 
                        ? `${profile.firstName} ${profile.lastName}` 
                        : profile?.fullName || "Resident"}
                    </h1>
                    <p className="text-muted-foreground">
                      Manage your barangay services online
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card 
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary"
                  onClick={() => setActiveTab("request")}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Request Certificate</h3>
                      <p className="text-sm text-muted-foreground">Apply for barangay documents</p>
                    </div>
                    <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-accent"
                  onClick={() => navigate("/track-request")}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Track Request</h3>
                      <p className="text-sm text-muted-foreground">Check status of your requests</p>
                    </div>
                    <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-amber-500"
                  onClick={() => navigate("/resident/profile")}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">My Profile</h3>
                      <p className="text-sm text-muted-foreground">Update your information</p>
                    </div>
                    <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Requests */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Recent Requests</CardTitle>
                      <CardDescription>Your latest certificate requests</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate("/resident/requests")}>
                      View All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : requests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No certificate requests yet</p>
                        <Button 
                          variant="link" 
                          className="mt-2"
                          onClick={() => setActiveTab("request")}
                        >
                          Request your first certificate
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {requests.map((request) => (
                          <div 
                            key={request.id} 
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <p className="font-medium">{request.certificateType}</p>
                              <p className="text-sm text-muted-foreground">
                                {request.controlNumber} • {request.dateSubmitted}
                              </p>
                              {request.status === "rejected" && request.rejectionReason && (
                                <p className="text-sm text-destructive mt-1">
                                  Reason: {request.rejectionReason}
                                </p>
                              )}
                            </div>
                            {getStatusBadge(request.status)}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Announcements */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Announcements</CardTitle>
                      <CardDescription>Latest barangay updates</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("announcements")}>
                      View All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : announcements.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No announcements at the moment</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {announcements.map((announcement) => (
                          <div 
                            key={announcement.id} 
                            className="p-3 rounded-lg border bg-card"
                          >
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium">{announcement.title}</h4>
                              <Badge variant={announcement.type === "important" ? "destructive" : "secondary"}>
                                {announcement.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {announcement.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {announcement.createdAt}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeTab === "request" && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <SidebarTrigger />
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("dashboard")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>

              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    Request Certificate
                  </CardTitle>
                  <CardDescription>
                    Fill out the form below to request a barangay certificate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CertificateRequestForm onSuccess={handleRequestSuccess} />
                </CardContent>
              </Card>

              <SuccessModal
                open={showSuccessModal}
                onOpenChange={setShowSuccessModal}
                controlNumber={submittedControlNumber}
                onReset={() => setActiveTab("dashboard")}
              />
            </>
          )}
        </main>

        {/* Floating Chat Widget */}
        <ChatWidget />
      </div>
    </SidebarProvider>
  );
};

export default ResidentDashboard;
