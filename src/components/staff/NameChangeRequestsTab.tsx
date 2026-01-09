import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCog,
  Loader2,
  Check,
  X,
  Eye,
  ArrowRight,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStaffAuthContext } from "@/context/StaffAuthContext";

interface NameChangeRequest {
  id: string;
  resident_id: string;
  current_first_name: string;
  current_middle_name: string | null;
  current_last_name: string;
  current_suffix: string | null;
  requested_first_name: string;
  requested_middle_name: string | null;
  requested_last_name: string;
  requested_suffix: string | null;
  reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  resident_email: string | null;
  resident_contact: string | null;
}

const NameChangeRequestsTab = () => {
  const { user: staffUser } = useStaffAuthContext();
  const [requests, setRequests] = useState<NameChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  
  // View dialog
  const [selectedRequest, setSelectedRequest] = useState<NameChangeRequest | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  
  // Action states
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_name_change_requests_for_staff", {
        p_status: statusFilter === "all" ? null : statusFilter,
      });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error loading name change requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const formatFullName = (
    firstName: string,
    middleName: string | null,
    lastName: string,
    suffix: string | null
  ) => {
    return [firstName, middleName, lastName, suffix].filter(Boolean).join(" ");
  };

  const sendNotificationEmail = async (
    request: NameChangeRequest,
    status: "approved" | "rejected",
    rejectionReason?: string
  ) => {
    if (!request.resident_email) {
      console.log("No email address for resident, skipping notification");
      return;
    }

    try {
      const staffToken = localStorage.getItem("staff_session_token");
      if (!staffToken) return;

      const currentName = formatFullName(
        request.current_first_name,
        request.current_middle_name,
        request.current_last_name,
        request.current_suffix
      );
      const requestedName = formatFullName(
        request.requested_first_name,
        request.requested_middle_name,
        request.requested_last_name,
        request.requested_suffix
      );

      const response = await supabase.functions.invoke("send-name-change-notification", {
        body: {
          recipientEmail: request.resident_email,
          currentName,
          requestedName,
          status,
          rejectionReason,
        },
        headers: {
          Authorization: `Bearer ${staffToken}`,
        },
      });

      if (response.error) {
        console.error("Failed to send notification email:", response.error);
      } else {
        console.log("Notification email sent successfully");
      }
    } catch (error) {
      console.error("Error sending notification email:", error);
    }
  };

  const handleApprove = async (request: NameChangeRequest) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("staff_approve_name_change", {
        p_request_id: request.id,
        p_reviewed_by: staffUser?.fullName || "Staff",
      });

      if (error) throw error;

      // Send email notification
      await sendNotificationEmail(request, "approved");

      toast.success("Name change approved successfully!");
      setShowViewDialog(false);
      loadRequests();
    } catch (error: any) {
      console.error("Error approving name change:", error);
      toast.error(error.message || "Failed to approve request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("staff_reject_name_change", {
        p_request_id: selectedRequest.id,
        p_reviewed_by: staffUser?.fullName || "Staff",
        p_rejection_reason: rejectionReason.trim(),
      });

      if (error) throw error;

      // Send email notification
      await sendNotificationEmail(selectedRequest, "rejected", rejectionReason.trim());

      toast.success("Name change request rejected");
      setShowRejectDialog(false);
      setShowViewDialog(false);
      setRejectionReason("");
      loadRequests();
    } catch (error: any) {
      console.error("Error rejecting name change:", error);
      toast.error(error.message || "Failed to reject request");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const currentName = formatFullName(r.current_first_name, r.current_middle_name, r.current_last_name, r.current_suffix).toLowerCase();
    const requestedName = formatFullName(r.requested_first_name, r.requested_middle_name, r.requested_last_name, r.requested_suffix).toLowerCase();
    return currentName.includes(query) || requestedName.includes(query);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          Name Change Requests
        </CardTitle>
        <CardDescription>
          Review and process resident name change requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <UserCog className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium text-lg mb-2">No Requests Found</h3>
            <p className="text-muted-foreground">
              {statusFilter === "pending"
                ? "No pending name change requests."
                : "No name change requests match your criteria."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Current Name</TableHead>
                  <TableHead>Requested Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {formatFullName(
                        request.current_first_name,
                        request.current_middle_name,
                        request.current_last_name,
                        request.current_suffix
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        {formatFullName(
                          request.requested_first_name,
                          request.requested_middle_name,
                          request.requested_last_name,
                          request.requested_suffix
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowViewDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* View Details Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Name Change Request Details</DialogTitle>
              <DialogDescription>
                Review the name change request details
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Current Name</p>
                    <p className="font-medium">
                      {formatFullName(
                        selectedRequest.current_first_name,
                        selectedRequest.current_middle_name,
                        selectedRequest.current_last_name,
                        selectedRequest.current_suffix
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Requested Name</p>
                    <p className="font-medium text-primary">
                      {formatFullName(
                        selectedRequest.requested_first_name,
                        selectedRequest.requested_middle_name,
                        selectedRequest.requested_last_name,
                        selectedRequest.requested_suffix
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reason for Change</Label>
                  <p className="text-sm p-3 bg-muted rounded-lg">{selectedRequest.reason}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Contact</p>
                    <p>{selectedRequest.resident_contact || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p>{selectedRequest.resident_email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p>{new Date(selectedRequest.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>

                {selectedRequest.status === "rejected" && selectedRequest.rejection_reason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-700 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-600">{selectedRequest.rejection_reason}</p>
                  </div>
                )}

                {selectedRequest.reviewed_by && (
                  <div className="text-sm text-muted-foreground">
                    Reviewed by {selectedRequest.reviewed_by} on{" "}
                    {selectedRequest.reviewed_at
                      ? new Date(selectedRequest.reviewed_at).toLocaleString()
                      : "N/A"}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              {selectedRequest?.status === "pending" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => selectedRequest && handleApprove(selectedRequest)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Approve
                  </Button>
                </>
              )}
              {selectedRequest?.status !== "pending" && (
                <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Name Change Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this request.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why the name change request is being rejected..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason("");
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-1" />
                )}
                Reject Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default NameChangeRequestsTab;
