import { useState, useEffect, useCallback } from "react";
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter,
  Loader2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  UserCheck,
  UserX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useStaffAuthContext } from "@/context/StaffAuthContext";
import { supabase } from "@/integrations/supabase/client";

const INCIDENT_TYPES = [
  "Noise Complaint",
  "Property Dispute",
  "Domestic Violence",
  "Theft/Robbery",
  "Vandalism",
  "Assault",
  "Public Disturbance",
  "Neighbor Dispute",
  "Traffic Incident",
  "Other"
];

interface Incident {
  id: string;
  incidentNumber: string;
  incidentDate: string;
  incidentType: string;
  complainantName: string;
  complainantAddress?: string;
  complainantContact?: string;
  respondentName?: string;
  respondentAddress?: string;
  incidentLocation?: string;
  incidentDescription: string;
  actionTaken?: string;
  status: string;
  reportedBy?: string;
  handledBy?: string;
  resolutionDate?: string;
  resolutionNotes?: string;
  submittedByResidentId?: string;
  approvalStatus?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  photoEvidenceUrl?: string;
}

const IncidentsTab = () => {
  const { user } = useStaffAuthContext();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("pending");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [formData, setFormData] = useState({
    incidentType: "",
    incidentDate: new Date().toISOString().split("T")[0],
    complainantName: "",
    complainantAddress: "",
    complainantContact: "",
    respondentName: "",
    respondentAddress: "",
    incidentLocation: "",
    incidentDescription: "",
    actionTaken: "",
  });

  const loadIncidents = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use RPC function to bypass RLS for staff session-based auth
      const approvalFilter = activeTab === "all" ? null : activeTab;
      const statusParam = activeTab === "approved" && statusFilter !== "all" ? statusFilter : null;

      const { data, error } = await supabase.rpc("get_all_incidents_for_staff", {
        p_approval_status: approvalFilter,
        p_status: statusParam,
      });

      if (error) throw error;

      if (data) {
        setIncidents(data.map((i: any) => ({
          id: i.id,
          incidentNumber: i.incident_number,
          incidentDate: new Date(i.incident_date).toLocaleDateString(),
          incidentType: i.incident_type,
          complainantName: i.complainant_name,
          complainantAddress: i.complainant_address || undefined,
          complainantContact: i.complainant_contact || undefined,
          respondentName: i.respondent_name || undefined,
          respondentAddress: i.respondent_address || undefined,
          incidentLocation: i.incident_location || undefined,
          incidentDescription: i.incident_description,
          actionTaken: i.action_taken || undefined,
          status: i.status || "open",
          reportedBy: i.reported_by || undefined,
          handledBy: i.handled_by || undefined,
          resolutionDate: i.resolution_date ? new Date(i.resolution_date).toLocaleDateString() : undefined,
          resolutionNotes: i.resolution_notes || undefined,
          submittedByResidentId: i.submitted_by_resident_id || undefined,
          approvalStatus: i.approval_status || "pending",
          reviewedBy: i.reviewed_by || undefined,
          reviewedAt: i.reviewed_at ? new Date(i.reviewed_at).toLocaleDateString() : undefined,
          rejectionReason: i.rejection_reason || undefined,
          photoEvidenceUrl: i.photo_evidence_url || undefined,
        })));
      }
    } catch (error) {
      console.error("Error loading incidents:", error);
      toast.error("Failed to load incidents");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, statusFilter]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Realtime subscription for incidents
  useEffect(() => {
    const channel = supabase
      .channel('staff-incidents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents'
        },
        () => {
          loadIncidents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadIncidents]);

  const generateIncidentNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `INC-${year}${month}-${random}`;
  };

  const handleCreateIncident = async () => {
    if (!formData.incidentType || !formData.complainantName || !formData.incidentDescription) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.rpc("staff_create_incident", {
        p_incident_type: formData.incidentType,
        p_incident_date: formData.incidentDate,
        p_complainant_name: formData.complainantName,
        p_complainant_address: formData.complainantAddress || null,
        p_complainant_contact: formData.complainantContact || null,
        p_respondent_name: formData.respondentName || null,
        p_respondent_address: formData.respondentAddress || null,
        p_incident_location: formData.incidentLocation || null,
        p_incident_description: formData.incidentDescription,
        p_action_taken: formData.actionTaken || null,
        p_reported_by: user?.fullName || "Staff",
      });

      if (error) throw error;

      toast.success("Incident logged successfully");
      setShowCreateDialog(false);
      resetForm();
      loadIncidents();
    } catch (error: any) {
      console.error("Error creating incident:", error);
      toast.error(error.message || "Failed to create incident");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveIncident = async (incident: Incident) => {
    try {
      const { error } = await supabase.rpc("staff_approve_incident", {
        p_incident_id: incident.id,
        p_reviewed_by: user?.fullName || "Staff",
      });

      if (error) throw error;

      toast.success("Incident report approved");
      loadIncidents();
    } catch (error: any) {
      console.error("Error approving incident:", error);
      toast.error("Failed to approve incident");
    }
  };

  const handleRejectIncident = async () => {
    if (!selectedIncident || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.rpc("staff_reject_incident", {
        p_incident_id: selectedIncident.id,
        p_reviewed_by: user?.fullName || "Staff",
        p_rejection_reason: rejectionReason,
      });

      if (error) throw error;

      toast.success("Incident report rejected");
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedIncident(null);
      loadIncidents();
    } catch (error: any) {
      console.error("Error rejecting incident:", error);
      toast.error("Failed to reject incident");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (incident: Incident, newStatus: string) => {
    try {
      const { error } = await supabase.rpc("staff_update_incident_status", {
        p_incident_id: incident.id,
        p_status: newStatus,
        p_handled_by: user?.fullName || "Staff",
      });

      if (error) throw error;

      toast.success(`Incident marked as ${newStatus}`);
      loadIncidents();
    } catch (error: any) {
      console.error("Error updating incident:", error);
      toast.error("Failed to update incident");
    }
  };

  const resetForm = () => {
    setFormData({
      incidentType: "",
      incidentDate: new Date().toISOString().split("T")[0],
      complainantName: "",
      complainantAddress: "",
      complainantContact: "",
      respondentName: "",
      respondentAddress: "",
      incidentLocation: "",
      incidentDescription: "",
      actionTaken: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      open: { variant: "destructive", icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
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

  const filteredIncidents = incidents.filter(i => 
    i.complainantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.incidentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.incidentType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = incidents.filter(i => i.approvalStatus === "pending").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Incident / Blotter Management
            </CardTitle>
            <CardDescription>
              Log and manage barangay incidents and complaints
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log New Incident
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              Pending Review
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {activeTab === "approved" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium text-lg mb-2">No Incidents Found</h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? "No incidents match your search criteria."
                : activeTab === "pending" 
                  ? "No pending incident reports to review."
                  : "No incidents in this category."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incident No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Complainant</TableHead>
                  {activeTab === "approved" && <TableHead>Status</TableHead>}
                  {activeTab === "pending" && <TableHead>Source</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-medium">{incident.incidentNumber}</TableCell>
                    <TableCell>{incident.incidentDate}</TableCell>
                    <TableCell>{incident.incidentType}</TableCell>
                    <TableCell>{incident.complainantName}</TableCell>
                    {activeTab === "approved" && (
                      <TableCell>{getStatusBadge(incident.status)}</TableCell>
                    )}
                    {activeTab === "pending" && (
                      <TableCell>
                        <Badge variant="outline">
                          {incident.submittedByResidentId ? "Resident" : "Staff"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                        
                        {activeTab === "pending" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleApproveIncident(incident)}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                setSelectedIncident(incident);
                                setShowRejectDialog(true);
                              }}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        {activeTab === "approved" && (
                          <>
                            {incident.status === "open" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateStatus(incident, "investigating")}
                              >
                                Investigate
                              </Button>
                            )}
                            {incident.status === "investigating" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateStatus(incident, "resolved")}
                              >
                                Resolve
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
          </div>
        )}
      </CardContent>

      {/* Create Incident Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log New Incident</DialogTitle>
            <DialogDescription>
              Record a new barangay incident or complaint
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Incident Type *</Label>
                <Select 
                  value={formData.incidentType} 
                  onValueChange={(v) => setFormData({ ...formData, incidentType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Incident Date *</Label>
                <Input
                  type="date"
                  value={formData.incidentDate}
                  onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                />
              </div>
            </div>

            <Separator />
            <h4 className="font-medium">Complainant Information</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Complainant Name *</Label>
                <Input
                  value={formData.complainantName}
                  onChange={(e) => setFormData({ ...formData, complainantName: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input
                  value={formData.complainantContact}
                  onChange={(e) => setFormData({ ...formData, complainantContact: e.target.value })}
                  placeholder="09XXXXXXXXX"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Input
                  value={formData.complainantAddress}
                  onChange={(e) => setFormData({ ...formData, complainantAddress: e.target.value })}
                  placeholder="Complete address"
                />
              </div>
            </div>

            <Separator />
            <h4 className="font-medium">Respondent Information</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Respondent Name</Label>
                <Input
                  value={formData.respondentName}
                  onChange={(e) => setFormData({ ...formData, respondentName: e.target.value })}
                  placeholder="Full name (if known)"
                />
              </div>
              <div className="space-y-2">
                <Label>Respondent Address</Label>
                <Input
                  value={formData.respondentAddress}
                  onChange={(e) => setFormData({ ...formData, respondentAddress: e.target.value })}
                  placeholder="Address (if known)"
                />
              </div>
            </div>

            <Separator />
            <h4 className="font-medium">Incident Details</h4>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Incident Location</Label>
                <Input
                  value={formData.incidentLocation}
                  onChange={(e) => setFormData({ ...formData, incidentLocation: e.target.value })}
                  placeholder="Where did the incident occur?"
                />
              </div>
              <div className="space-y-2">
                <Label>Incident Description *</Label>
                <Textarea
                  value={formData.incidentDescription}
                  onChange={(e) => setFormData({ ...formData, incidentDescription: e.target.value })}
                  placeholder="Describe the incident in detail..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Action Taken</Label>
                <Textarea
                  value={formData.actionTaken}
                  onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                  placeholder="Initial actions taken (if any)..."
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateIncident} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Log Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Incident Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Incident Details</DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-medium">{selectedIncident.incidentNumber}</span>
                <div className="flex gap-2">
                  {getApprovalBadge(selectedIncident.approvalStatus || "pending")}
                  {selectedIncident.approvalStatus === "approved" && getStatusBadge(selectedIncident.status)}
                </div>
              </div>
              
              {selectedIncident.submittedByResidentId && (
                <Badge variant="outline" className="text-xs">Submitted by Resident</Badge>
              )}

              {selectedIncident.rejectionReason && (
                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                  <p className="font-medium text-destructive text-sm">Rejection Reason:</p>
                  <p className="text-sm">{selectedIncident.rejectionReason}</p>
                </div>
              )}

              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p>{selectedIncident.incidentType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p>{selectedIncident.incidentDate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Complainant</Label>
                  <p>{selectedIncident.complainantName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Respondent</Label>
                  <p>{selectedIncident.respondentName || "N/A"}</p>
                </div>
                {selectedIncident.incidentLocation && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Location</Label>
                    <p>{selectedIncident.incidentLocation}</p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1 bg-muted p-3 rounded-lg text-sm">{selectedIncident.incidentDescription}</p>
              </div>
              {selectedIncident.photoEvidenceUrl && (
                <div>
                  <Label className="text-muted-foreground">Photo Evidence</Label>
                  <img 
                    src={selectedIncident.photoEvidenceUrl} 
                    alt="Incident evidence" 
                    className="mt-2 max-h-64 rounded-lg object-contain border"
                  />
                </div>
              )}
              {selectedIncident.actionTaken && (
                <div>
                  <Label className="text-muted-foreground">Action Taken</Label>
                  <p className="mt-1">{selectedIncident.actionTaken}</p>
                </div>
              )}
              {selectedIncident.reviewedBy && (
                <div className="text-xs text-muted-foreground">
                  Reviewed by {selectedIncident.reviewedBy} on {selectedIncident.reviewedAt}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Incident Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Incident Report</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this incident report.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Rejection Reason *</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this incident report is being rejected..."
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason("");
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectIncident} 
              disabled={isSaving || !rejectionReason.trim()}
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reject Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default IncidentsTab;
