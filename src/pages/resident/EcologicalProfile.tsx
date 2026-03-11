import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info, Home, User, FileText, Clock, Settings, LogOut, MessageSquare, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useResidentAuth } from "@/hooks/useResidentAuth";
import { supabase } from "@/integrations/supabase/client";
import { logResidentLogout } from "@/utils/auditLog";
import EcologicalProfileForm from "@/components/resident/EcologicalProfileForm";

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
    { title: "Incident Reports", icon: AlertTriangle, tab: "incidents" },
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

const EcologicalProfile = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading: authLoading, logout } = useResidentAuth();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUnreadMessageCount();
    }
  }, [isAuthenticated, user]);

  const loadUnreadMessageCount = async () => {
    if (user?.id) {
      const { data: msgCount } = await supabase.rpc("get_resident_unread_message_count", {
        p_user_id: user.id,
      });
      setUnreadMessageCount(msgCount || 0);
    }
  };

  const handleTabChange = (tab: string) => {
    if (tab === "dashboard") {
      navigate("/resident/dashboard");
    } else if (tab === "profile") {
      navigate("/resident/profile");
    } else if (tab === "requests") {
      navigate("/resident/requests");
    } else if (tab === "settings") {
      navigate("/resident/settings");
    } else if (tab === "request") {
      navigate("/resident/dashboard");
    } else if (tab === "messages") {
      navigate("/resident/messages");
    } else if (tab === "incidents") {
      navigate("/resident/incidents");
    }
  };

  const handleLogout = async () => {
    if (user?.id && profile?.fullName) {
      await logResidentLogout(user.id, profile.fullName);
    }
    await logout();
    navigate("/auth", { replace: true });
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
          activeTab="ecological-profile" 
          setActiveTab={handleTabChange}
          onLogout={handleLogout}
          unreadMessageCount={unreadMessageCount}
        />
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="flex items-center gap-4 mb-6">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" onClick={() => navigate("/resident/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ecological Profile Census</h1>
              <p className="text-muted-foreground">Submit your household's ecological profile data</p>
            </div>
          </div>

          <Alert className="mb-6 border-primary/20 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm text-muted-foreground">
              This feature helps reduce manual house-to-house data collection and improves barangay reporting efficiency. Your submission will be reviewed and approved by staff before being included in analytics.
            </AlertDescription>
          </Alert>

          <EcologicalProfileForm 
            onSuccess={() => navigate("/resident/dashboard")}
            onCancel={() => navigate("/resident/dashboard")}
          />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default EcologicalProfile;
