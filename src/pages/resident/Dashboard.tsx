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
  ArrowLeft,
  Leaf,
  CalendarDays,
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
import ResidentCertificateRequestForm from "@/components/resident/ResidentCertificateRequestForm";
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
  priority?: string;
  preferredPickupDate?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  imageUrl?: string;
}

type EcoStatus = "none" | "pending" | "approved" | "rejected";

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
    { title: "Messages", icon: MessageSquare, tab: "messages", badge: unreadMessageCount > 0 ? unreadMessageCount : undefined },
    { title: "Incident Reports", icon: AlertCircle, tab: "incidents" },
    { title: "Ecological Profile", icon: Leaf, tab: "ecological-profile" },
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

const AnnouncementItem = ({ announcement }: { announcement: Announcement }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = announcement.content.length > 200;

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-start justify-between">
        <h4 className="font-medium">{announcement.title}</h4>
        <Badge variant={announcement.type === "important" ? "destructive" : "secondary"}>
          {announcement.type}
        </Badge>
      </div>
      {announcement.imageUrl && (
        <img
          src={announcement.imageUrl}
          alt={announcement.title}
          className="w-full h-32 object-cover rounded-md mt-2"
          loading="lazy"
        />
      )}
      <p className={`text-sm text-muted-foreground mt-1 ${!expanded && isLong ? "line-clamp-3" : ""}`}>
        {announcement.content}
      </p>
      {isLong && (
        <Button variant="link" size="sm" className="px-0 h-auto text-xs" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show Less" : "View More"}
        </Button>
      )}
      <p className="text-xs text-muted-foreground mt-1">{announcement.createdAt}</p>
    </div>
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
  const [ecoStatus, setEcoStatus] = useState<EcoStatus>("none");

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
        .limit(50);

      if (requestsData) {
        setRequests(requestsData.map(r => ({
          id: r.id,
          controlNumber: r.control_number,
          certificateType: r.certificate_type,
          status: r.status || "pending",
          dateSubmitted: new Date(r.created_at || "").toLocaleDateString(),
          rejectionReason: r.rejection_reason || r.notes,
          priority: r.priority || "Normal",
          preferredPickupDate: r.preferred_pickup_date
            ? new Date(r.preferred_pickup_date).toLocaleDateString()
            : undefined,
        })));
      }

      // Load announcements with image
      const announcementsData = await fetchActiveAnnouncements();
      if (announcementsData) {
        setAnnouncements(announcementsData.slice(0, 3).map((a: any) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          type: a.type,
          createdAt: new Date(a.created_at).toLocaleDateString(),
          imageUrl: a.image_url || undefined,
        })));
      }

      // Load unread message count
      if (user?.id) {
        const { data: msgCount } = await supabase.rpc("get_resident_unread_message_count", {
          p_user_id: user.id,
        });
        setUnreadMessageCount(msgCount || 0);
      }

      // Load ecological profile status
      if (profile?.id) {
        const { data: ecoData } = await supabase
          .from("ecological_profile_submissions")
          .select("status")
          .eq("submitted_by_resident_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (ecoData && ecoData.length > 0) {
          const s = ecoData[0].status;
          setEcoStatus(s === "approved" ? "approved" : s === "rejected" ? "rejected" : "pending");
        } else {
          setEcoStatus("none");
        }
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
    } else if (tab === "settings") {
      navigate("/resident/settings");
    } else if (tab === "incidents") {
      navigate("/resident/incidents");
    } else if (tab === "messages") {
      navigate("/resident/messages");
    } else if (tab === "ecological-profile") {
      navigate("/resident/ecological-profile");
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

  const latestRequest = requests.length > 0 ? requests[0] : null;

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

              {/* Status Cards Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* My Latest Request Status */}
                <Card className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      My Latest Request Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : latestRequest ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{latestRequest.certificateType}</p>
                          {getStatusBadge(latestRequest.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Control No: {latestRequest.controlNumber} • {latestRequest.dateSubmitted}
                        </p>
                        {latestRequest.priority?.toLowerCase() === "urgent" && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
                        {latestRequest.preferredPickupDate && latestRequest.status === "approved" && (
                          <p className="text-sm flex items-center gap-1 text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            Est. Pickup: {latestRequest.preferredPickupDate}
                          </p>
                        )}
                        {latestRequest.status === "rejected" && latestRequest.rejectionReason && (
                          <p className="text-sm text-destructive">Reason: {latestRequest.rejectionReason}</p>
                        )}
                        <Button variant="link" size="sm" className="px-0" onClick={() => setActiveTab("requests")}>
                          View all requests →
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">No requests yet</p>
                        <Button variant="link" size="sm" onClick={() => setActiveTab("request")}>
                          Request your first certificate
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Ecological Profile Status */}
                <Card className="border-l-4 border-l-accent">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-accent" />
                      Ecological Profile Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {ecoStatus === "approved" && (
                            <Badge variant="outline" className="capitalize">
                              <CheckCircle className="h-3 w-3 mr-1" /> Approved
                            </Badge>
                          )}
                          {ecoStatus === "pending" && (
                            <Badge variant="secondary" className="capitalize">
                              <Clock className="h-3 w-3 mr-1" /> Pending Approval
                            </Badge>
                          )}
                          {ecoStatus === "rejected" && (
                            <Badge variant="destructive" className="capitalize">
                              <XCircle className="h-3 w-3 mr-1" /> Rejected
                            </Badge>
                          )}
                          {ecoStatus === "none" && (
                            <Badge variant="secondary" className="capitalize">
                              Not Submitted
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {ecoStatus === "none"
                            ? "Submit your household ecological profile to help improve barangay services."
                            : ecoStatus === "pending"
                            ? "Your submission is being reviewed by staff."
                            : ecoStatus === "approved"
                            ? "Your ecological profile has been approved and recorded."
                            : "Your submission was returned. Please update and resubmit."}
                        </p>
                        <Button
                          variant="link"
                          size="sm"
                          className="px-0"
                          onClick={() => navigate("/resident/ecological-profile")}
                        >
                          {ecoStatus === "none" ? "Submit Profile →" : "Update Profile →"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions - reduced */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                  onClick={() => navigate("/resident/incidents")}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Report Incident</h3>
                      <p className="text-sm text-muted-foreground">File a blotter or complaint</p>
                    </div>
                    <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
                  </CardContent>
                </Card>
              </div>

              {/* Announcements - full width */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Announcements</CardTitle>
                    <CardDescription>Latest barangay updates</CardDescription>
                  </div>
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
                        <AnnouncementItem key={announcement.id} announcement={announcement} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
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
                  {profile && (
                    <ResidentCertificateRequestForm 
                      profile={{
                        id: profile.id,
                        fullName: profile.fullName,
                        email: profile.email,
                        contactNumber: profile.contactNumber,
                        householdId: profile.householdId,
                      }}
                      onSuccess={handleRequestSuccess} 
                    />
                  )}
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

          {activeTab === "requests" && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <SidebarTrigger />
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("dashboard")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>

              <Card className="max-w-4xl mx-auto">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Clock className="h-6 w-6" />
                      My Requests
                    </CardTitle>
                    <CardDescription>
                      Track the status of your certificate requests
                    </CardDescription>
                  </div>
                  <Button onClick={() => setActiveTab("request")}>
                    New Request
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="font-medium text-lg mb-2">No Requests Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        You haven't submitted any certificate requests.
                      </p>
                      <Button onClick={() => setActiveTab("request")}>
                        Request a Certificate
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((request) => (
                        <div
                          key={request.id}
                          className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-semibold">{request.certificateType}</h3>
                                {getStatusBadge(request.status)}
                                {request.priority?.toLowerCase() === "urgent" && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Urgent
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Control No: {request.controlNumber}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Submitted: {request.dateSubmitted}
                              </p>
                              {request.status === "rejected" && request.rejectionReason && (
                                <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                                  <p className="text-sm text-destructive font-medium">
                                    Rejection Reason:
                                  </p>
                                  <p className="text-sm text-destructive">
                                    {request.rejectionReason}
                                  </p>
                                </div>
                              )}
                              {request.status === "approved" && (
                                <div className="mt-2 p-2 rounded bg-accent/10 border border-accent/20">
                                  <p className="text-sm text-accent font-medium">
                                    Ready for Pickup
                                  </p>
                                  {request.preferredPickupDate && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <CalendarDays className="h-3 w-3" />
                                      Est. Pickup: {request.preferredPickupDate}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
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
