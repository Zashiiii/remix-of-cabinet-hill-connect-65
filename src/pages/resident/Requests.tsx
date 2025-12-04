import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, FileText, Loader2, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useResidentAuth } from "@/hooks/useResidentAuth";
import { supabase } from "@/integrations/supabase/client";

interface Request {
  id: string;
  controlNumber: string;
  certificateType: string;
  status: string;
  dateSubmitted: string;
  purpose?: string;
  rejectionReason?: string;
  processedBy?: string;
  processedDate?: string;
  preferredPickupDate?: string;
}

const ResidentRequests = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useResidentAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please login to view your requests");
      navigate("/auth");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadRequests();
    }
  }, [isAuthenticated, user]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("certificate_requests")
        .select("*")
        .eq("email", user?.email)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setRequests(data.map(r => ({
          id: r.id,
          controlNumber: r.control_number,
          certificateType: r.certificate_type,
          status: r.status || "pending",
          dateSubmitted: new Date(r.created_at || "").toLocaleDateString(),
          purpose: r.purpose || undefined,
          rejectionReason: r.rejection_reason || r.notes,
          processedBy: r.processed_by || undefined,
          processedDate: r.updated_at ? new Date(r.updated_at).toLocaleDateString() : undefined,
          preferredPickupDate: r.preferred_pickup_date ? new Date(r.preferred_pickup_date).toLocaleDateString() : undefined,
        })));
      }
    } catch (error) {
      console.error("Error loading requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" />, label: "Pending" },
      verifying: { variant: "default", icon: <AlertCircle className="h-3 w-3 mr-1" />, label: "Verifying" },
      approved: { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" />, label: "Approved" },
      rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" />, label: "Rejected" },
    };

    const { variant, icon, label } = config[status.toLowerCase()] || config.pending;

    return (
      <Badge variant={variant} className="capitalize">
        {icon}
        {label}
      </Badge>
    );
  };

  const handleViewDetails = (request: Request) => {
    setSelectedRequest(request);
    setShowDetails(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/resident/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  My Requests
                </CardTitle>
                <CardDescription>
                  Track the status of your certificate requests
                </CardDescription>
              </div>
              <Button onClick={() => navigate("/request-certificate")}>
                New Request
              </Button>
            </div>
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
                <p className="text-muted-foreground mb-4">
                  You haven't submitted any certificate requests.
                </p>
                <Button onClick={() => navigate("/request-certificate")}>
                  Request a Certificate
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{request.certificateType}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Control No: {request.controlNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Submitted: {request.dateSubmitted}
                        </p>
                        {request.purpose && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Purpose: {request.purpose}
                          </p>
                        )}
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
                              <p className="text-sm text-muted-foreground">
                                Pickup Date: {request.preferredPickupDate}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        {request.status === "approved" && (
                          <Button
                            size="sm"
                            className="bg-accent hover:bg-accent/90"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>
                {selectedRequest?.controlNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Certificate Type</span>
                    <span className="font-medium">{selectedRequest.certificateType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date Submitted</span>
                    <span>{selectedRequest.dateSubmitted}</span>
                  </div>
                  {selectedRequest.purpose && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Purpose</span>
                      <span>{selectedRequest.purpose}</span>
                    </div>
                  )}
                  {selectedRequest.preferredPickupDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pickup Date</span>
                      <span>{selectedRequest.preferredPickupDate}</span>
                    </div>
                  )}
                  {selectedRequest.processedBy && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processed By</span>
                      <span>{selectedRequest.processedBy}</span>
                    </div>
                  )}
                </div>
                {selectedRequest.status === "rejected" && selectedRequest.rejectionReason && (
                  <>
                    <Separator />
                    <div className="p-3 rounded bg-destructive/10 border border-destructive/20">
                      <p className="text-sm font-medium text-destructive mb-1">Rejection Reason</p>
                      <p className="text-sm">{selectedRequest.rejectionReason}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ResidentRequests;
