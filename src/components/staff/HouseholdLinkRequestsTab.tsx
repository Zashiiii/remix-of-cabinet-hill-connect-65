import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Eye, Clock, Loader2, Home, User, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { createAuditLog } from "@/utils/auditLog";
import TableSkeleton from "./TableSkeleton";

interface HouseholdLinkRequest {
  id: string;
  resident_id: string;
  resident_name: string;
  resident_email: string | null;
  resident_contact: string | null;
  household_id: string;
  household_number: string;
  household_address: string | null;
  reason: string | null;
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface HouseholdLinkRequestsTabProps {
  staffName: string;
}

const HouseholdLinkRequestsTab = ({ staffName }: HouseholdLinkRequestsTabProps) => {
  const [requests, setRequests] = useState<HouseholdLinkRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedRequest, setSelectedRequest] = useState<HouseholdLinkRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_household_link_requests_for_staff", {
        p_status: statusFilter === "all" ? null : statusFilter,
      });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error("Error loading requests:", error);
      toast.error("Failed to load household link requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request: HouseholdLinkRequest) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("staff_approve_household_link", {
        p_request_id: request.id,
        p_approved_by: staffName,
      });

      if (error) throw error;

      await createAuditLog({
        action: "approve",
        entityType: "household_link_request",
        entityId: request.id,
        performedBy: staffName,
        performedByType: "staff",
        details: {
          resident_name: request.resident_name,
          household_number: request.household_number,
        },
      });

      toast.success(`Approved household link for ${request.resident_name}`);
      loadRequests();
      setShowDetailsDialog(false);
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast.error(error.message || "Failed to approve request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("staff_reject_household_link", {
        p_request_id: selectedRequest.id,
        p_rejected_by: staffName,
        p_rejection_reason: rejectionReason.trim(),
      });

      if (error) throw error;

      await createAuditLog({
        action: "reject",
        entityType: "household_link_request",
        entityId: selectedRequest.id,
        performedBy: staffName,
        performedByType: "staff",
        details: {
          resident_name: selectedRequest.resident_name,
          household_number: selectedRequest.household_number,
          rejection_reason: rejectionReason.trim(),
        },
      });

      toast.success(`Rejected household link request from ${selectedRequest.resident_name}`);
      setShowRejectDialog(false);
      setShowDetailsDialog(false);
      setRejectionReason("");
      setSelectedRequest(null);
      loadRequests();
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast.error(error.message || "Failed to reject request");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openDetails = (request: HouseholdLinkRequest) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const openRejectDialog = (request: HouseholdLinkRequest) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Household Link Requests</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Requests ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columns={5} rows={5} />
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {statusFilter !== "all" ? statusFilter : ""} requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>Household #</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.resident_name}</p>
                        {request.resident_email && (
                          <p className="text-xs text-muted-foreground">{request.resident_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.household_number}</p>
                        {request.household_address && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{request.household_address}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.created_at), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetails(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {request.status === "pending" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(request)}
                              disabled={isProcessing}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openRejectDialog(request)}
                              disabled={isProcessing}
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
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Household Link Request Details</DialogTitle>
            <DialogDescription>
              Review the request information before approving or rejecting.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Resident Name</Label>
                  <p className="font-medium flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {selectedRequest.resident_name}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
                {selectedRequest.resident_email && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="flex items-center gap-1 text-sm">
                      <Mail className="h-4 w-4" />
                      {selectedRequest.resident_email}
                    </p>
                  </div>
                )}
                {selectedRequest.resident_contact && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Contact</Label>
                    <p className="flex items-center gap-1 text-sm">
                      <Phone className="h-4 w-4" />
                      {selectedRequest.resident_contact}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <Label className="text-xs text-muted-foreground">Requested Household</Label>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    {selectedRequest.household_number}
                  </p>
                  {selectedRequest.household_address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-4 w-4" />
                      {selectedRequest.household_address}
                    </p>
                  )}
                </div>
              </div>

              {selectedRequest.reason && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Reason Provided</Label>
                  <p className="text-sm p-3 bg-muted/50 rounded-lg">{selectedRequest.reason}</p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Requested At</Label>
                <p className="text-sm">{format(new Date(selectedRequest.created_at), "MMMM dd, yyyy 'at' HH:mm")}</p>
              </div>

              {selectedRequest.status === "rejected" && selectedRequest.rejection_reason && (
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-xs text-muted-foreground text-red-600">Rejection Reason</Label>
                  <p className="text-sm p-3 bg-red-50 rounded-lg text-red-700">{selectedRequest.rejection_reason}</p>
                </div>
              )}

              {selectedRequest.reviewed_at && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Reviewed</Label>
                  <p className="text-sm">
                    By {selectedRequest.reviewed_by} on {format(new Date(selectedRequest.reviewed_at), "MMM dd, yyyy HH:mm")}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedRequest?.status === "pending" && (
              <div className="flex gap-2 w-full">
                <Button
                  variant="default"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => openRejectDialog(selectedRequest)}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Household Link Request</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this request. This will be visible to the resident.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HouseholdLinkRequestsTab;
