import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertTriangle, 
  ArrowLeft, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  Eye,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import IncidentRequestForm from "@/components/resident/IncidentRequestForm";
import { Home, User, FileText, Settings, LogOut } from "lucide-react";
import { logResidentLogout } from "@/utils/auditLog";

interface Incident {
  id: string;
  incidentNumber: string;
  incidentDate: string;
  incidentType: string;
  incidentDescription: string;
  incidentLocation?: string;
  respondentName?: string;
  status: string;
  approvalStatus: string;
  rejectionReason?: string;
  createdAt: string;
  photoEvidenceUrl?: string;
}

const ResidentSidebar = ({ 
  activeTab, 
  setActiveTab, 
  onLogout 
}: { 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const menuItems = [
    { title: "Dashboard", icon: Home, tab: "dashboard" },
    { title: "My Profile", icon: User, tab: "profile" },
    { title: "Request Certificate", icon: FileText, tab: "request" },
    { title: "My Requests", icon: Clock, tab: "requests" },
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

const ResidentIncidents = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading: authLoading, logout } = useResidentAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [residentId, setResidentId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadResidentId();
    }
  }, [isAuthenticated, user]);

  const loadResidentId = async () => {
    try {
      const { data, error } = await supabase
        .from("residents")
        .select("id")
        .eq("user_id", user?.id)
        .single();
      
      if (error) throw error;
      if (data) {
        setResidentId(data.id);
        loadIncidents(data.id);
        setupRealtimeSubscription(data.id);
      }
    } catch (error) {
      console.error("Error loading resident ID:", error);
    }
  };

  const loadIncidents = async (resId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("submitted_by_resident_id", resId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setIncidents(data.map(i => ({
          id: i.id,
          incidentNumber: i.incident_number,
          incidentDate: new Date(i.incident_date).toLocaleDateString(),
          incidentType: i.incident_type,
          incidentDescription: i.incident_description,
          incidentLocation: i.incident_location || undefined,
          respondentName: i.respondent_name || undefined,
          status: i.status || "open",
          approvalStatus: i.approval_status || "pending",
          rejectionReason: i.rejection_reason || undefined,
          createdAt: new Date(i.created_at || "").toLocaleDateString(),
          photoEvidenceUrl: i.photo_evidence_url || undefined,
        })));
      }
    } catch (error) {
      console.error("Error loading incidents:", error);
      toast.error("Failed to load incidents");
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = (resId: string) => {
    const channel = supabase
      .channel('resident-incidents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents',
          filter: `submitted_by_resident_id=eq.${resId}`
        },
        (payload) => {
          console.log('Incident update:', payload);
          loadIncidents(resId);
          
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as any;
            if (newData.approval_status === 'approved') {
              toast.success("Your incident report has been approved!");
            } else if (newData.approval_status === 'rejected') {
              toast.error("Your incident report has been rejected. Check the details for the reason.");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleLogout = async () => {
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
    }
  };

  const handleSuccess = (incidentNumber: string) => {
    setShowCreateDialog(false);
    if (residentId) {
      loadIncidents(residentId);
    }
  };

  const getApprovalBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
      approved: { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
    };

    const { variant, icon } = config[status] || config.pending;

    return (
      <Badge variant={variant} className="capitalize">
        {icon}
        {status}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      open: { variant: "destructive", icon: <AlertCircle className="h-3 w-3 mr-1" /> },
      investigating: { variant: "default", icon: <Clock className="h-3 w-3 mr-1" /> },
      resolved: { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      closed: { variant: "secondary", icon: <XCircle className="h-3 w-3 mr-1" /> },
    };

    const { variant, icon } = config[status] || config.open;

    return (
      <Badge variant={variant} className="capitalize">
        {icon}
        {status}
      </Badge>
    );
  };

  const residentName = profile?.firstName && profile?.lastName 
    ? `${profile.firstName} ${profile.lastName}` 
    : profile?.fullName || "Resident";

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
          activeTab="incidents" 
          setActiveTab={handleTabChange}
          onLogout={handleLogout}
        />
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="flex items-center gap-4 mb-6">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" onClick={() => navigate("/resident/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6" />
                    My Incident Reports
                  </CardTitle>
                  <CardDescription>
                    Submit and track your incident/blotter reports
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Report Incident
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : incidents.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium text-lg mb-2">No Incident Reports</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't submitted any incident reports yet.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Report an Incident
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report No.</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Approval</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidents.map((incident) => (
                        <TableRow key={incident.id}>
                          <TableCell className="font-medium">{incident.incidentNumber}</TableCell>
                          <TableCell>{incident.incidentDate}</TableCell>
                          <TableCell>{incident.incidentType}</TableCell>
                          <TableCell>{getApprovalBadge(incident.approvalStatus)}</TableCell>
                          <TableCell>{getStatusBadge(incident.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedIncident(incident);
                                setShowViewDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Incident Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Report an Incident</DialogTitle>
                <DialogDescription>
                  Submit a new incident or complaint to the barangay
                </DialogDescription>
              </DialogHeader>
              {residentId && user && (
                <IncidentRequestForm
                  residentId={residentId}
                  residentName={residentName}
                  userId={user.id}
                  onSuccess={handleSuccess}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* View Incident Dialog */}
          <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Incident Details</DialogTitle>
                <DialogDescription>
                  {selectedIncident?.incidentNumber}
                </DialogDescription>
              </DialogHeader>
              {selectedIncident && (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {getApprovalBadge(selectedIncident.approvalStatus)}
                    {selectedIncident.approvalStatus === "approved" && getStatusBadge(selectedIncident.status)}
                  </div>

                  {selectedIncident.approvalStatus === "rejected" && selectedIncident.rejectionReason && (
                    <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                      <p className="font-medium text-destructive">Rejection Reason:</p>
                      <p className="text-sm">{selectedIncident.rejectionReason}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Incident Type</p>
                      <p className="font-medium">{selectedIncident.incidentType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Incident Date</p>
                      <p className="font-medium">{selectedIncident.incidentDate}</p>
                    </div>
                    {selectedIncident.incidentLocation && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-medium">{selectedIncident.incidentLocation}</p>
                      </div>
                    )}
                    {selectedIncident.respondentName && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Respondent</p>
                        <p className="font-medium">{selectedIncident.respondentName}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Description</p>
                    <p className="bg-muted p-3 rounded-lg text-sm">{selectedIncident.incidentDescription}</p>
                  </div>

                  {selectedIncident.photoEvidenceUrl && (
                    <div>
                      <p className="text-muted-foreground text-sm mb-2">Photo Evidence</p>
                      <img 
                        src={selectedIncident.photoEvidenceUrl} 
                        alt="Incident evidence" 
                        className="max-h-64 rounded-lg object-contain border"
                      />
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Submitted on {selectedIncident.createdAt}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ResidentIncidents;
