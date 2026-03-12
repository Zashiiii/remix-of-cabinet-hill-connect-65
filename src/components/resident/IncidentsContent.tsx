import { useState, useEffect } from "react";
import { AlertTriangle, Plus, Clock, CheckCircle, XCircle, Loader2, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useResidentAuth } from "@/hooks/useResidentAuth";
import { supabase } from "@/integrations/supabase/client";
import IncidentRequestForm from "@/components/resident/IncidentRequestForm";

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

const IncidentsContent = () => {
  const { user, profile } = useResidentAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [residentId, setResidentId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadResidentId();
  }, [user]);

  const loadResidentId = async () => {
    try {
      const { data, error } = await supabase.from("residents").select("id").eq("user_id", user?.id).single();
      if (error) throw error;
      if (data) {
        setResidentId(data.id);
        loadIncidents(data.id);
        setupRealtimeSubscription(data.id);
      }
    } catch (error) { console.error("Error loading resident ID:", error); }
  };

  const loadIncidents = async (resId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("incidents").select("*")
        .eq("submitted_by_resident_id", resId).order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        setIncidents(data.map(i => ({
          id: i.id, incidentNumber: i.incident_number,
          incidentDate: new Date(i.incident_date).toLocaleDateString(),
          incidentType: i.incident_type, incidentDescription: i.incident_description,
          incidentLocation: i.incident_location || undefined,
          respondentName: i.respondent_name || undefined,
          status: i.status || "open", approvalStatus: i.approval_status || "pending",
          rejectionReason: i.rejection_reason || undefined,
          createdAt: new Date(i.created_at || "").toLocaleDateString(),
          photoEvidenceUrl: i.photo_evidence_url || undefined,
        })));
      }
    } catch (error) { toast.error("Failed to load incidents"); }
    finally { setIsLoading(false); }
  };

  const setupRealtimeSubscription = (resId: string) => {
    const channel = supabase.channel('resident-incidents-inline')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'incidents',
        filter: `submitted_by_resident_id=eq.${resId}`
      }, (payload) => {
        loadIncidents(resId);
        if (payload.eventType === 'UPDATE') {
          const newData = payload.new as any;
          if (newData.approval_status === 'approved') toast.success("Your incident report has been approved!");
          else if (newData.approval_status === 'rejected') toast.error("Your incident report has been rejected.");
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const getApprovalBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
      approved: { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
    };
    const { variant, icon } = config[status] || config.pending;
    return <Badge variant={variant} className="capitalize">{icon}{status}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      open: { variant: "destructive", icon: <AlertCircle className="h-3 w-3 mr-1" /> },
      investigating: { variant: "default", icon: <Clock className="h-3 w-3 mr-1" /> },
      resolved: { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      closed: { variant: "secondary", icon: <XCircle className="h-3 w-3 mr-1" /> },
    };
    const { variant, icon } = config[status] || config.open;
    return <Badge variant={variant} className="capitalize">{icon}{status}</Badge>;
  };

  const residentName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}` : profile?.fullName || "Resident";

  return (
    <>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />My Incident Reports
              </CardTitle>
              <CardDescription>Submit and track your incident/blotter reports</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />Report Incident
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium text-lg mb-2">No Incident Reports</h3>
              <p className="text-muted-foreground mb-4">You haven't submitted any incident reports yet.</p>
              <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />Report an Incident</Button>
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
                        <Button variant="outline" size="sm" onClick={() => { setSelectedIncident(incident); setShowViewDialog(true); }}>
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

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report an Incident</DialogTitle>
            <DialogDescription>Submit a new incident or complaint to the barangay</DialogDescription>
          </DialogHeader>
          {residentId && user && (
            <IncidentRequestForm residentId={residentId} residentName={residentName} userId={user.id}
              onSuccess={() => { setShowCreateDialog(false); if (residentId) loadIncidents(residentId); }} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Incident Details</DialogTitle>
            <DialogDescription>{selectedIncident?.incidentNumber}</DialogDescription>
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
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{selectedIncident.incidentDate}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{selectedIncident.incidentType}</span></div>
                {selectedIncident.incidentLocation && <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{selectedIncident.incidentLocation}</span></div>}
                {selectedIncident.respondentName && <div><span className="text-muted-foreground">Respondent:</span> <span className="font-medium">{selectedIncident.respondentName}</span></div>}
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground text-sm mb-1">Description:</p>
                <p className="text-sm whitespace-pre-wrap">{selectedIncident.incidentDescription}</p>
              </div>
              {selectedIncident.photoEvidenceUrl && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Photo Evidence:</p>
                    <img src={selectedIncident.photoEvidenceUrl} alt="Evidence" className="rounded-lg max-h-64 object-cover" />
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IncidentsContent;
