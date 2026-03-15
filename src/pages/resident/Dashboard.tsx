import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
  RefreshCw,
  Copy,
  X,
  ExternalLink,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
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

import ChatWidget from "@/components/ChatWidget";
import { logResidentLogout } from "@/utils/auditLog";
import { secureLogoutRedirect } from "@/utils/authNavigationGuard";
import ProfileContent from "@/components/resident/ProfileContent";
import MessagesContent from "@/components/resident/MessagesContent";
import IncidentsContent from "@/components/resident/IncidentsContent";

import SettingsContent from "@/components/resident/SettingsContent";
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
    { title: "My Requests", icon: Clock, tab: "requests", href: "/resident/requests" },
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
  const [imageOpen, setImageOpen] = useState(false);
  const isLong = announcement.content.length > 150;

  return (
    <div className={`p-3 rounded-lg border overflow-hidden ${
      announcement.type === "important"
        ? "border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20"
        : "bg-card"
    }`}>
      <div className="flex gap-3">
        {announcement.imageUrl && (
          <>
            <img
              src={announcement.imageUrl}
              alt={announcement.title}
              className="w-20 h-20 object-cover rounded-md shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              loading="lazy"
              onClick={() => setImageOpen(true)}
            />
            <Dialog open={imageOpen} onOpenChange={setImageOpen}>
              <DialogContent className="max-w-4xl p-2">
                <DialogTitle className="sr-only">{announcement.title}</DialogTitle>
                <img src={announcement.imageUrl} alt={announcement.title} className="w-full h-auto object-contain rounded" />
              </DialogContent>
            </Dialog>
          </>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm truncate">{announcement.title}</h4>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={announcement.type === "important" ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
                {announcement.type}
              </Badge>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{announcement.createdAt}</span>
            </div>
          </div>
          <p className={`text-xs text-muted-foreground mt-1 break-words whitespace-pre-line overflow-hidden ${!expanded && isLong ? "line-clamp-2" : ""}`}>
            {announcement.content}
          </p>
          {isLong && (
            <Button variant="link" size="sm" className="px-0 h-auto text-[11px] mt-0.5" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show Less" : "View More"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const MOBILE_TAB_ORDER = ["dashboard", "requests", "messages", "incidents", "profile"];

const ResidentDashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, profile, isAuthenticated, isLoading: authLoading, logout } = useResidentAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [requests, setRequests] = useState<Request[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  
  const [submittedControlNumber, setSubmittedControlNumber] = useState("");
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [ecoStatus, setEcoStatus] = useState<EcoStatus>("none");

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  // Swipe animation state
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [tabBounceKey, setTabBounceKey] = useState(0);

  // Touch refs for swipe and pull
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const pullThreshold = 60;
  const swipeThreshold = 50;

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
        const mapped = announcementsData.map((a: any) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          type: a.type,
          createdAt: new Date(a.created_at).toLocaleDateString(),
          imageUrl: a.image_url || undefined,
        }));
        // Sort: important first, then by date descending
        mapped.sort((a: any, b: any) => {
          if (a.type === "important" && b.type !== "important") return -1;
          if (a.type !== "important" && b.type === "important") return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setAnnouncements(mapped);
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

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Pull-to-refresh: only when scrolled to top and pulling down
    if (mainContentRef.current && mainContentRef.current.scrollTop <= 0 && deltaY > 0) {
      const clampedDistance = Math.min(deltaY * 0.5, 100);
      setPullDistance(clampedDistance);
      setIsPulling(true);
      if (clampedDistance > 10) {
        e.preventDefault();
      }
    }
  }, [isMobile]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;

    // Pull-to-refresh trigger
    if (isPulling && pullDistance >= pullThreshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);
      setIsPulling(false);
      loadData().finally(() => {
        setIsRefreshing(false);
        toast.success("Dashboard refreshed");
      });
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }

    // Horizontal swipe detection (only if mostly horizontal and fast enough)
    if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && elapsed < 500) {
      const currentIndex = MOBILE_TAB_ORDER.indexOf(activeTab);
      if (currentIndex === -1) {
        touchStartRef.current = null;
        return;
      }
      if (deltaX < 0 && currentIndex < MOBILE_TAB_ORDER.length - 1) {
        // Swipe left → next tab
        setSwipeDirection("left");
        handleTabChange(MOBILE_TAB_ORDER[currentIndex + 1]);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swipe right → previous tab
        setSwipeDirection("right");
        handleTabChange(MOBILE_TAB_ORDER[currentIndex - 1]);
      }
    }

    touchStartRef.current = null;
  }, [isMobile, isPulling, pullDistance, isRefreshing, activeTab]);
    const handleLogout = async () => {
    if (user && profile) {
      const fullName = profile.firstName && profile.lastName 
        ? `${profile.firstName} ${profile.lastName}`
        : profile.fullName || "Unknown Resident";
      await logResidentLogout(fullName, user.id);
    }
    await logout();
    toast.success("Logged out successfully");
    secureLogoutRedirect("/");
  };

  const handleTabChange = (tab: string) => {
    setTabBounceKey(prev => prev + 1);
    // Clear swipe animation after it plays
    setTimeout(() => setSwipeDirection(null), 250);
    if (tab === "ecological-profile") {
      navigate("/resident/ecological-profile");
    } else {
      setActiveTab(tab);
    }
  };

  const handleRequestSuccess = (controlNumber: string) => {
    setSubmittedControlNumber(controlNumber);
    setActiveTab("requests");
    loadData(); // Refresh the requests list
    toast.success("Certificate request submitted successfully!");
  };

  const handleDismissSuccessBanner = () => {
    setSubmittedControlNumber("");
  };

  const handleCopyControlNumber = () => {
    navigator.clipboard.writeText(submittedControlNumber);
    toast.success("Control number copied to clipboard!");
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
        
        <main 
          ref={mainContentRef}
          className={`flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto ${
            swipeDirection === "left" ? "animate-swipe-in-left" : 
            swipeDirection === "right" ? "animate-swipe-in-right" : ""
          }`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Pull-to-refresh indicator */}
          {isMobile && (isPulling || isRefreshing) && (
            <div 
              className="flex items-center justify-center transition-all duration-200 overflow-hidden"
              style={{ height: isRefreshing ? 48 : pullDistance * 0.8 }}
            >
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""} ${pullDistance >= pullThreshold ? "text-primary" : ""}`} />
                <span>
                  {isRefreshing ? "Refreshing..." : pullDistance >= pullThreshold ? "Release to refresh" : "Pull to refresh"}
                </span>
              </div>
            </div>
          )}

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
                          onClick={() => setActiveTab("ecological-profile")}
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
                  onClick={() => setActiveTab("incidents")}
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
                      {(showAllAnnouncements ? announcements : announcements.slice(0, 3)).map((announcement) => (
                        <AnnouncementItem key={announcement.id} announcement={announcement} />
                      ))}
                      {announcements.length > 3 && (
                        <div className="text-center pt-2">
                          <Button variant="outline" size="sm" onClick={() => setShowAllAnnouncements(!showAllAnnouncements)}>
                            {showAllAnnouncements ? "View Less" : `View More Announcements (${announcements.length - 3} more)`}
                          </Button>
                        </div>
                      )}
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

              {/* Success Banner */}
              {submittedControlNumber && (
                <div className="max-w-4xl mx-auto mb-4">
                  <div className="rounded-lg border border-green-300 bg-green-50/80 dark:bg-green-950/30 dark:border-green-800 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-green-800 dark:text-green-300">Request Submitted Successfully!</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-green-700 dark:text-green-400">Control Number:</span>
                            <span className="font-mono font-bold text-green-900 dark:text-green-200">{submittedControlNumber}</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopyControlNumber}>
                              <Copy className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                            </Button>
                          </div>
                          <p className="text-sm text-green-700/80 dark:text-green-400/80 mt-2">
                            Your request is now being processed. You will receive an email notification once it's reviewed. You can track its status below.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 gap-1.5 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40"
                            onClick={() => navigate("/track-request")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Track Request Status
                          </Button>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleDismissSuccessBanner}>
                        <X className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <Card className="max-w-4xl mx-auto">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                      <p className="text-muted-foreground">
                        You haven't submitted any certificate requests. Click "New Request" above to get started.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((request) => {
                        const isNew = request.controlNumber === submittedControlNumber;
                        return (
                          <div
                            key={request.id}
                            className={`p-4 rounded-lg border hover:shadow-md transition-shadow ${
                              isNew
                                ? "border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
                                : "bg-card"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className="font-semibold">{request.certificateType}</h3>
                                  {isNew && (
                                    <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">
                                      New
                                    </Badge>
                                  )}
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
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "profile" && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <SidebarTrigger />
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("dashboard")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
              <ProfileContent />
            </>
          )}

          {activeTab === "messages" && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <SidebarTrigger />
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("dashboard")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
              <MessagesContent />
            </>
          )}

          {activeTab === "incidents" && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <SidebarTrigger />
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("dashboard")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
              <IncidentsContent />
            </>
          )}

          {activeTab === "settings" && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <SidebarTrigger />
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("dashboard")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
              <SettingsContent />
            </>
          )}
        </main>

        {/* Floating Chat Widget */}
        <ChatWidget />

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t shadow-medium">
          <div className="flex items-center justify-around h-16">
            {[
              { icon: Home, label: "Home", tab: "dashboard" },
              { icon: FileText, label: "Requests", tab: "requests" },
              { icon: MessageSquare, label: "Messages", tab: "messages" },
              { icon: AlertCircle, label: "Incidents", tab: "incidents" },
              { icon: User, label: "Profile", tab: "profile" },
            ].map((item) => {
              const isActive = activeTab === item.tab;
              return (
                <button
                  key={item.tab}
                  onClick={() => handleTabChange(item.tab)}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? "animate-tab-bounce" : ""}`} key={isActive ? tabBounceKey : undefined} />
                  {item.tab === "messages" && unreadMessageCount > 0 && (
                    <span className="absolute top-2 right-1/4 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                      {unreadMessageCount}
                    </span>
                  )}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </SidebarProvider>
  );
};

export default ResidentDashboard;
