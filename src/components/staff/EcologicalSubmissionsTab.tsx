import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  Home,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useStaffAuthContext } from "@/context/StaffAuthContext";
import { createAuditLog } from "@/utils/auditLog";

interface Submission {
  id: string;
  submission_number: string;
  status: string;
  household_number: string | null;
  address: string | null;
  street_purok: string | null;
  respondent_name: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  staff_notes: string | null;
  submitted_by_resident_id: string | null;
  // Housing data
  house_ownership: string | null;
  lot_ownership: string | null;
  dwelling_type: string | null;
  lighting_source: string | null;
  water_supply_level: string | null;
  years_staying: number | null;
  place_of_origin: string | null;
  ethnic_group: string | null;
  // Array fields
  water_storage: string[] | null;
  toilet_facilities: string[] | null;
  garbage_disposal: string[] | null;
  communication_services: string[] | null;
  means_of_transport: string[] | null;
  info_sources: string[] | null;
  // Additional
  is_4ps_beneficiary: boolean | null;
  solo_parent_count: number | null;
  pwd_count: number | null;
  additional_notes: string | null;
}

const EcologicalSubmissionsTab = () => {
  const { user: staffUser } = useStaffAuthContext();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_all_ecological_submissions_for_staff", {
        p_status: statusFilter === "all" ? null : statusFilter
      });

      if (error) throw error;
      setSubmissions((data || []) as Submission[]);
    } catch (error) {
      console.error("Error loading submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("ecological-submissions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ecological_profile_submissions",
        },
        () => {
          loadSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSubmissions]);

  const filteredSubmissions = submissions.filter((sub) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      sub.submission_number?.toLowerCase().includes(searchLower) ||
      sub.household_number?.toLowerCase().includes(searchLower) ||
      sub.respondent_name?.toLowerCase().includes(searchLower) ||
      sub.address?.toLowerCase().includes(searchLower)
    );
  });

  const handleViewDetails = (submission: Submission) => {
    setSelectedSubmission(submission);
    setShowDetailsDialog(true);
  };

  const handleReview = (submission: Submission, action: "approve" | "reject") => {
    setSelectedSubmission(submission);
    setReviewAction(action);
    setRejectionReason("");
    setStaffNotes("");
    setShowReviewDialog(true);
  };

  const processReview = async () => {
    if (!selectedSubmission || !staffUser) return;

    if (reviewAction === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setIsProcessing(true);
    try {
      const newStatus = reviewAction === "approve" ? "approved" : "rejected";

      const { error } = await supabase.rpc("review_ecological_submission", {
        p_submission_id: selectedSubmission.id,
        p_status: newStatus,
        p_reviewed_by: staffUser.fullName,
        p_rejection_reason: reviewAction === "reject" ? rejectionReason : null,
        p_staff_notes: staffNotes || null
      });

      if (error) throw error;

      // If approved, apply to households table
      if (reviewAction === "approve") {
        const { error: applyError } = await supabase.rpc("apply_ecological_submission_to_household", {
          p_submission_id: selectedSubmission.id
        });

        if (applyError) {
          console.error("Error applying to household:", applyError);
          toast.warning("Submission approved but failed to update household data");
        }
      }

      // Log audit
      await createAuditLog({
        action: reviewAction === "approve" ? "approve" : "reject",
        entityType: "ecological_submission",
        entityId: selectedSubmission.submission_number,
        performedBy: staffUser.fullName,
        performedByType: "staff",
        details: {
          household_number: selectedSubmission.household_number,
          respondent: selectedSubmission.respondent_name,
          reason: reviewAction === "reject" ? rejectionReason : undefined
        }
      });

      toast.success(
        reviewAction === "approve" 
          ? "Submission approved and applied to household records" 
          : "Submission rejected"
      );

      setShowReviewDialog(false);
      loadSubmissions();
    } catch (error: any) {
      console.error("Error processing review:", error);
      toast.error("Failed to process review", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
      under_review: { variant: "default", icon: <AlertCircle className="h-3 w-3 mr-1" /> },
      approved: { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
    };

    const { variant, icon } = config[status] || config.pending;

    return (
      <Badge variant={variant} className="capitalize">
        {icon}
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const pendingCount = submissions.filter(s => s.status === "pending").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ecological Profile Submissions
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">{pendingCount} pending</Badge>
                )}
              </CardTitle>
              <CardDescription>Review and approve resident-submitted ecological profile census data</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadSubmissions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by submission number, household, or respondent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No submissions found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submission #</TableHead>
                    <TableHead>Household #</TableHead>
                    <TableHead>Respondent</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.submission_number}</TableCell>
                      <TableCell>{sub.household_number || "—"}</TableCell>
                      <TableCell>{sub.respondent_name || "—"}</TableCell>
                      <TableCell>{format(new Date(sub.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(sub)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {sub.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleReview(sub, "approve")}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleReview(sub, "reject")}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Submission Details - {selectedSubmission?.submission_number}
            </DialogTitle>
            <DialogDescription>
              Review the ecological profile data submitted by the resident
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="housing">Housing</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="additional">Additional</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Household Number</Label>
                    <p className="font-medium">{selectedSubmission.household_number || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Respondent</Label>
                    <p className="font-medium">{selectedSubmission.respondent_name || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Address</Label>
                    <p className="font-medium">{selectedSubmission.address || selectedSubmission.street_purok || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Years Staying</Label>
                    <p className="font-medium">{selectedSubmission.years_staying || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Place of Origin</Label>
                    <p className="font-medium">{selectedSubmission.place_of_origin || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Ethnic Group</Label>
                    <p className="font-medium">{selectedSubmission.ethnic_group || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Submitted</Label>
                    <p className="font-medium">{format(new Date(selectedSubmission.created_at), "MMM dd, yyyy HH:mm")}</p>
                  </div>
                </div>

                {selectedSubmission.reviewed_by && (
                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Reviewed By</Label>
                        <p className="font-medium">{selectedSubmission.reviewed_by}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Reviewed At</Label>
                        <p className="font-medium">
                          {selectedSubmission.reviewed_at 
                            ? format(new Date(selectedSubmission.reviewed_at), "MMM dd, yyyy HH:mm")
                            : "—"}
                        </p>
                      </div>
                    </div>
                    {selectedSubmission.rejection_reason && (
                      <div className="mt-4">
                        <Label className="text-muted-foreground">Rejection Reason</Label>
                        <p className="font-medium text-destructive">{selectedSubmission.rejection_reason}</p>
                      </div>
                    )}
                    {selectedSubmission.staff_notes && (
                      <div className="mt-4">
                        <Label className="text-muted-foreground">Staff Notes</Label>
                        <p className="font-medium">{selectedSubmission.staff_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="housing" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">House Ownership</Label>
                    <p className="font-medium">{selectedSubmission.house_ownership || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Lot Ownership</Label>
                    <p className="font-medium">{selectedSubmission.lot_ownership || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Dwelling Type</Label>
                    <p className="font-medium">{selectedSubmission.dwelling_type || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Lighting Source</Label>
                    <p className="font-medium">{selectedSubmission.lighting_source || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Water Supply</Label>
                    <p className="font-medium">{selectedSubmission.water_supply_level || "—"}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="services" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Water Storage</Label>
                    <p className="font-medium">
                      {selectedSubmission.water_storage?.length 
                        ? selectedSubmission.water_storage.join(", ") 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Toilet Facilities</Label>
                    <p className="font-medium">
                      {selectedSubmission.toilet_facilities?.length 
                        ? selectedSubmission.toilet_facilities.join(", ") 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Garbage Disposal</Label>
                    <p className="font-medium">
                      {selectedSubmission.garbage_disposal?.length 
                        ? selectedSubmission.garbage_disposal.join(", ") 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Communication</Label>
                    <p className="font-medium">
                      {selectedSubmission.communication_services?.length 
                        ? selectedSubmission.communication_services.join(", ") 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Transport</Label>
                    <p className="font-medium">
                      {selectedSubmission.means_of_transport?.length 
                        ? selectedSubmission.means_of_transport.join(", ") 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Info Sources</Label>
                    <p className="font-medium">
                      {selectedSubmission.info_sources?.length 
                        ? selectedSubmission.info_sources.join(", ") 
                        : "—"}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="additional" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">4Ps Beneficiary</Label>
                    <p className="font-medium">{selectedSubmission.is_4ps_beneficiary ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Solo Parent Count</Label>
                    <p className="font-medium">{selectedSubmission.solo_parent_count || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">PWD Count</Label>
                    <p className="font-medium">{selectedSubmission.pwd_count || 0}</p>
                  </div>
                </div>
                {selectedSubmission.additional_notes && (
                  <div className="pt-4">
                    <Label className="text-muted-foreground">Additional Notes</Label>
                    <p className="font-medium mt-1">{selectedSubmission.additional_notes}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            {selectedSubmission?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    handleReview(selectedSubmission, "reject");
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailsDialog(false);
                    handleReview(selectedSubmission, "approve");
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve" : "Reject"} Submission
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve" 
                ? "This will approve the submission and update the household records."
                : "Please provide a reason for rejecting this submission."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm"><strong>Submission:</strong> {selectedSubmission?.submission_number}</p>
              <p className="text-sm"><strong>Household:</strong> {selectedSubmission?.household_number || "New Household"}</p>
              <p className="text-sm"><strong>Respondent:</strong> {selectedSubmission?.respondent_name}</p>
            </div>

            {reviewAction === "reject" && (
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please explain why this submission is being rejected..."
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Staff Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={processReview}
              disabled={isProcessing}
              variant={reviewAction === "reject" ? "destructive" : "default"}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : reviewAction === "approve" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EcologicalSubmissionsTab;
