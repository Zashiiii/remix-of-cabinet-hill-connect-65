import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { 
  FileText, 
  AlertTriangle, 
  Search, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Filter,
  CalendarIcon,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCertificateRequests } from "@/utils/staffApi";
import { cn } from "@/lib/utils";
import CertificateMonthlyChart from "@/components/staff/CertificateMonthlyChart";
import CertificateTypePieChart from "@/components/staff/CertificateTypePieChart";
import TopCertificateTypes from "@/components/staff/TopCertificateTypes";

interface IncidentReport {
  id: string;
  incidentNumber: string;
  incidentDate: string;
  incidentType: string;
  complainantName: string;
  incidentDescription: string;
  incidentLocation?: string;
  respondentName?: string;
  status: string;
  approvalStatus: string;
  submittedByResidentId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  photoEvidenceUrl?: string;
  createdAt: string;
}

interface CertificateRequest {
  id: string;
  controlNumber: string;
  fullName: string;
  certificateType: string;
  status: string;
  purpose?: string;
  contactNumber?: string;
  email?: string;
  householdNumber?: string;
  birthDate?: string;
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
}

const ViewReportsTab = () => {
  const [activeTab, setActiveTab] = useState("incidents");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  
  // Date range filter state
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Incidents state
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  
  // Certificates state
  const [certificates, setCertificates] = useState<CertificateRequest[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateRequest | null>(null);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);

  const loadIncidents = useCallback(async () => {
    try {
      const filterToSend = statusFilter !== "all" ? statusFilter : null;
      const { data, error } = await supabase.rpc("get_incidents_for_staff", {
        p_status_filter: filterToSend,
      });

      if (error) throw error;

      if (data) {
        setIncidents(data.map((i: any) => ({
          id: i.id,
          incidentNumber: i.incident_number,
          incidentDate: new Date(i.incident_date).toLocaleDateString(),
          incidentType: i.incident_type,
          complainantName: i.complainant_name,
          incidentDescription: i.incident_description,
          incidentLocation: i.incident_location || undefined,
          respondentName: i.respondent_name || undefined,
          status: i.status || "open",
          approvalStatus: i.approval_status || "pending",
          submittedByResidentId: i.submitted_by_resident_id || undefined,
          reviewedBy: i.reviewed_by || undefined,
          reviewedAt: i.reviewed_at ? new Date(i.reviewed_at).toLocaleDateString() : undefined,
          rejectionReason: i.rejection_reason || undefined,
          photoEvidenceUrl: i.photo_evidence_url || undefined,
          createdAt: new Date(i.created_at || "").toLocaleDateString(),
        })));
      }
    } catch (error) {
      console.error("Error loading incidents:", error);
      toast.error("Failed to load incident reports");
    }
  }, [statusFilter]);

  const loadCertificates = useCallback(async () => {
    try {
      const filterToSend = statusFilter !== "all" ? statusFilter : undefined;
      const data = await getCertificateRequests(filterToSend);
      
      if (data) {
        setCertificates(data.map((c: any) => ({
          id: c.id,
          controlNumber: c.control_number,
          fullName: c.full_name,
          certificateType: c.certificate_type,
          status: c.status || "pending",
          purpose: c.purpose || undefined,
          contactNumber: c.contact_number || undefined,
          email: c.email || undefined,
          householdNumber: c.household_number || undefined,
          birthDate: c.birth_date || undefined,
          notes: c.notes || undefined,
          rejectionReason: c.rejection_reason || undefined,
          createdAt: c.created_at ? new Date(c.created_at).toLocaleDateString() : "",
        })));
      }
    } catch (error) {
      console.error("Error loading certificates:", error);
      toast.error("Failed to load certificate requests");
    }
  }, [statusFilter]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadIncidents(), loadCertificates()]);
    setIsLoading(false);
  }, [loadIncidents, loadCertificates]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscriptions
  useEffect(() => {
    const incidentChannel = supabase
      .channel('view-reports-incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        loadIncidents();
      })
      .subscribe();

    const certificateChannel = supabase
      .channel('view-reports-certificates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'certificate_requests' }, () => {
        loadCertificates();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(incidentChannel);
      supabase.removeChannel(certificateChannel);
    };
  }, [loadIncidents, loadCertificates]);

  const getApprovalBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
      approved: { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
      processing: { variant: "default", icon: <Clock className="h-3 w-3 mr-1" /> },
      verifying: { variant: "default", icon: <Clock className="h-3 w-3 mr-1" /> },
      released: { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    };
    const { variant, icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="capitalize">
        {icon}
        {status}
      </Badge>
    );
  };

  // Helper to parse date strings for comparison
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Filter by date range
  const isWithinDateRange = (dateStr: string): boolean => {
    if (!startDate && !endDate) return true;
    const date = parseDate(dateStr);
    if (!date) return true;
    
    // Normalize dates to start of day for comparison
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (startDate && endDate) {
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      return normalizedDate >= start && normalizedDate <= end;
    }
    if (startDate) {
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      return normalizedDate >= start;
    }
    if (endDate) {
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      return normalizedDate <= end;
    }
    return true;
  };

  const filteredIncidents = incidents.filter(i => {
    const matchesSearch = 
      i.complainantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.incidentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.incidentType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = isWithinDateRange(i.createdAt);
    return matchesSearch && matchesDate;
  });

  const filteredCertificates = certificates.filter(c => {
    const matchesSearch = 
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.controlNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certificateType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = isWithinDateRange(c.createdAt);
    return matchesSearch && matchesDate;
  });

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const pendingIncidentsCount = incidents.filter(i => i.approvalStatus === "pending").length;
  const pendingCertificatesCount = certificates.filter(c => c.status === "pending").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <FileText className="h-6 w-6" />
          View Reports
        </CardTitle>
        <CardDescription>
          View all submitted incident/blotter and certificate requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="incidents" className="relative">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Incident Reports
              {pendingIncidentsCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingIncidentsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="certificates" className="relative">
              <FileText className="h-4 w-4 mr-2" />
              Certificate Requests
              {pendingCertificatesCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingCertificatesCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <CertificateMonthlyChart certificates={certificates} />
          <CertificateTypePieChart certificates={certificates} />
          <TopCertificateTypes certificates={certificates} />
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === "incidents" ? "Search incidents..." : "Search certificates..."}
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Range Filter */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Date Range:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearDateFilters}
                  className="h-9 w-9"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {(startDate || endDate) && (
              <Badge variant="secondary" className="text-xs">
                Filtering by date
              </Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Incidents Tab */}
            {activeTab === "incidents" && (
              filteredIncidents.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium text-lg mb-2">No Incident Reports</h3>
                  <p className="text-muted-foreground">No resident-submitted incident reports found.</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report No.</TableHead>
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
                          <TableCell>{getApprovalBadge(incident.approvalStatus)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedIncident(incident);
                                setShowIncidentDialog(true);
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
              )
            )}

            {/* Certificates Tab */}
            {activeTab === "certificates" && (
              filteredCertificates.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium text-lg mb-2">No Certificate Requests</h3>
                  <p className="text-muted-foreground">No certificate requests found.</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Control No.</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Requestor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCertificates.map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell className="font-medium">{cert.controlNumber}</TableCell>
                          <TableCell>{cert.createdAt}</TableCell>
                          <TableCell>{cert.certificateType}</TableCell>
                          <TableCell>{cert.fullName}</TableCell>
                          <TableCell>{getApprovalBadge(cert.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCertificate(cert);
                                setShowCertificateDialog(true);
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
              )
            )}
          </>
        )}
      </CardContent>

      {/* View Incident Dialog */}
      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Incident Report Details</DialogTitle>
            <DialogDescription>{selectedIncident?.incidentNumber}</DialogDescription>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {getApprovalBadge(selectedIncident.approvalStatus)}
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
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{selectedIncident.incidentType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{selectedIncident.incidentDate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Complainant</Label>
                  <p className="font-medium">{selectedIncident.complainantName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Respondent</Label>
                  <p className="font-medium">{selectedIncident.respondentName || "N/A"}</p>
                </div>
                {selectedIncident.incidentLocation && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Location</Label>
                    <p className="font-medium">{selectedIncident.incidentLocation}</p>
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
                    alt="Evidence" 
                    className="mt-2 max-h-64 rounded-lg object-contain border"
                  />
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

      {/* View Certificate Dialog */}
      <Dialog open={showCertificateDialog} onOpenChange={setShowCertificateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Certificate Request Details</DialogTitle>
            <DialogDescription>{selectedCertificate?.controlNumber}</DialogDescription>
          </DialogHeader>
          {selectedCertificate && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {getApprovalBadge(selectedCertificate.status)}
              </div>

              {selectedCertificate.status === "rejected" && selectedCertificate.rejectionReason && (
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                  <p className="font-medium text-destructive">Rejection Reason:</p>
                  <p className="text-sm">{selectedCertificate.rejectionReason}</p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Certificate Type</Label>
                  <p className="font-medium">{selectedCertificate.certificateType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date Submitted</Label>
                  <p className="font-medium">{selectedCertificate.createdAt}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Requestor</Label>
                  <p className="font-medium">{selectedCertificate.fullName}</p>
                </div>
                {selectedCertificate.birthDate && (
                  <div>
                    <Label className="text-muted-foreground">Birth Date</Label>
                    <p className="font-medium">{selectedCertificate.birthDate}</p>
                  </div>
                )}
                {selectedCertificate.contactNumber && (
                  <div>
                    <Label className="text-muted-foreground">Contact</Label>
                    <p className="font-medium">{selectedCertificate.contactNumber}</p>
                  </div>
                )}
                {selectedCertificate.email && (
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedCertificate.email}</p>
                  </div>
                )}
                {selectedCertificate.householdNumber && (
                  <div>
                    <Label className="text-muted-foreground">Household No.</Label>
                    <p className="font-medium">{selectedCertificate.householdNumber}</p>
                  </div>
                )}
                {selectedCertificate.purpose && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Purpose</Label>
                    <p className="font-medium">{selectedCertificate.purpose}</p>
                  </div>
                )}
              </div>

              {selectedCertificate.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1 bg-muted p-3 rounded-lg text-sm">{selectedCertificate.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ViewReportsTab;
