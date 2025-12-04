import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter,
  Loader2,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  XCircle
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
}

const StaffIncidents = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useStaffAuthContext();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please login to access this page");
      navigate("/");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const loadIncidents = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setIncidents(data.map(i => ({
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
        })));
      }
    } catch (error) {
      console.error("Error loading incidents:", error);
      toast.error("Failed to load incidents");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      loadIncidents();
    }
  }, [isAuthenticated, loadIncidents]);

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
      const { error } = await supabase.from("incidents").insert({
        incident_number: generateIncidentNumber(),
        incident_date: formData.incidentDate,
        incident_type: formData.incidentType,
        complainant_name: formData.complainantName,
        complainant_address: formData.complainantAddress || null,
        complainant_contact: formData.complainantContact || null,
        respondent_name: formData.respondentName || null,
        respondent_address: formData.respondentAddress || null,
        incident_location: formData.incidentLocation || null,
        incident_description: formData.incidentDescription,
        action_taken: formData.actionTaken || null,
        status: "open",
        reported_by: user?.fullName,
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

  const handleUpdateStatus = async (incident: Incident, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        handled_by: user?.fullName,
      };

      if (newStatus === "resolved") {
        updateData.resolution_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("incidents")
        .update(updateData)
        .eq("id", incident.id);

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

  const filteredIncidents = incidents.filter(i => 
    i.complainantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.incidentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.incidentType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-6 px-4">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/staff-dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

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
            {/* Filters */}
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
            </div>

            {/* Incidents Table */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium text-lg mb-2">No Incidents Found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all" 
                    ? "No incidents match your search criteria."
                    : "No incidents have been logged yet."}
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
                      <TableHead>Status</TableHead>
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
                        <TableCell>{getStatusBadge(incident.status)}</TableCell>
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
                          </div>
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
              <DialogTitle>Log New Incident</DialogTitle>
              <DialogDescription>
                Record a new barangay incident or complaint
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="incidentType">Incident Type *</Label>
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
                  <Label htmlFor="incidentDate">Incident Date *</Label>
                  <Input
                    id="incidentDate"
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
                  <Label htmlFor="complainantName">Complainant Name *</Label>
                  <Input
                    id="complainantName"
                    value={formData.complainantName}
                    onChange={(e) => setFormData({ ...formData, complainantName: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complainantContact">Contact Number</Label>
                  <Input
                    id="complainantContact"
                    value={formData.complainantContact}
                    onChange={(e) => setFormData({ ...formData, complainantContact: e.target.value })}
                    placeholder="09XXXXXXXXX"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="complainantAddress">Address</Label>
                  <Input
                    id="complainantAddress"
                    value={formData.complainantAddress}
                    onChange={(e) => setFormData({ ...formData, complainantAddress: e.target.value })}
                    placeholder="Complete address"
                  />
                </div>
              </div>

              <Separator />
              <h4 className="font-medium">Respondent Information (if applicable)</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="respondentName">Respondent Name</Label>
                  <Input
                    id="respondentName"
                    value={formData.respondentName}
                    onChange={(e) => setFormData({ ...formData, respondentName: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="respondentAddress">Respondent Address</Label>
                  <Input
                    id="respondentAddress"
                    value={formData.respondentAddress}
                    onChange={(e) => setFormData({ ...formData, respondentAddress: e.target.value })}
                    placeholder="Address"
                  />
                </div>
              </div>

              <Separator />
              <h4 className="font-medium">Incident Details</h4>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="incidentLocation">Incident Location</Label>
                  <Input
                    id="incidentLocation"
                    value={formData.incidentLocation}
                    onChange={(e) => setFormData({ ...formData, incidentLocation: e.target.value })}
                    placeholder="Where did the incident occur?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incidentDescription">Description *</Label>
                  <Textarea
                    id="incidentDescription"
                    value={formData.incidentDescription}
                    onChange={(e) => setFormData({ ...formData, incidentDescription: e.target.value })}
                    placeholder="Describe the incident in detail..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actionTaken">Initial Action Taken</Label>
                  <Textarea
                    id="actionTaken"
                    value={formData.actionTaken}
                    onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                    placeholder="What action has been taken so far?"
                    rows={2}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateIncident} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
              <DialogDescription>
                {selectedIncident?.incidentNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedIncident && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(selectedIncident.status)}
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Incident Type</Label>
                    <p className="font-medium">{selectedIncident.incidentType}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Date</Label>
                    <p className="font-medium">{selectedIncident.incidentDate}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Complainant</Label>
                    <p className="font-medium">{selectedIncident.complainantName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Location</Label>
                    <p className="font-medium">{selectedIncident.incidentLocation || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Description</Label>
                  <p className="mt-1">{selectedIncident.incidentDescription}</p>
                </div>
                {selectedIncident.actionTaken && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Action Taken</Label>
                    <p className="mt-1">{selectedIncident.actionTaken}</p>
                  </div>
                )}
                {selectedIncident.handledBy && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Handled By</Label>
                    <p className="mt-1">{selectedIncident.handledBy}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StaffIncidents;
