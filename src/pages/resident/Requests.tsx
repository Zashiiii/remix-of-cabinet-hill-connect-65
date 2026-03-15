import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Loader2, Plus, CalendarDays, AlertTriangle, MessageSquare, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useResidentAuth } from "@/hooks/useResidentAuth";
import { supabase } from "@/integrations/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { format } from "date-fns";

interface Request {
  id: string;
  controlNumber: string;
  certificateType: string;
  customCertificateName?: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  purpose?: string;
  notes?: string;
  rejectionReason?: string;
  processedBy?: string;
  preferredPickupDate?: string;
  urgencyReason?: string;
}

const ResidentRequests = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useResidentAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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
          certificateType: r.custom_certificate_name
            ? `${r.certificate_type} — ${r.custom_certificate_name}`
            : r.certificate_type,
          customCertificateName: r.custom_certificate_name || undefined,
          status: r.status || "pending",
          priority: r.priority || "normal",
          createdAt: r.created_at || "",
          updatedAt: r.updated_at || "",
          purpose: r.purpose || undefined,
          notes: r.notes || undefined,
          rejectionReason: r.rejection_reason || undefined,
          processedBy: r.processed_by || undefined,
          preferredPickupDate: r.preferred_pickup_date || undefined,
          urgencyReason: r.urgency_reason || undefined,
        })));
      }
    } catch (error) {
      console.error("Error loading requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const getRemarks = (req: Request): string | null => {
    return req.notes || req.rejectionReason || null;
  };

  const getRemarksStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === "rejected") return "bg-destructive/10 border-destructive/20 text-destructive";
    if (s === "incomplete requirements") return "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300";
    return "bg-muted/50 border-border text-muted-foreground";
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
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/resident/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              My Requests
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and manage your certificate requests
            </p>
          </div>
          <Button onClick={() => navigate("/resident/dashboard?tab=certificates")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </div>

        {/* Summary */}
        {!isLoading && requests.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total", count: requests.length },
              { label: "Pending", count: requests.filter(r => ["pending", "under review"].includes(r.status.toLowerCase())).length },
              { label: "Completed", count: requests.filter(r => ["released", "approved", "ready for pickup"].includes(r.status.toLowerCase())).length },
              { label: "Action Needed", count: requests.filter(r => ["incomplete requirements", "rejected"].includes(r.status.toLowerCase())).length },
            ].map(s => (
              <Card key={s.label} className="p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.count}</p>
              </Card>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="font-semibold text-lg mb-2">No Requests Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                You haven't submitted any certificate requests. Start by requesting your first certificate.
              </p>
              <Button onClick={() => navigate("/request-certificate")} className="gap-2">
                <Plus className="h-4 w-4" />
                Request a Certificate
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const remarks = getRemarks(request);
              return (
                <Card
                  key={request.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => { setSelectedRequest(request); setShowDetails(true); }}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Row 1: Type + Status */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-sm sm:text-base truncate">
                            {request.certificateType}
                          </h3>
                          <StatusBadge status={request.status as any} />
                          {request.priority === "urgent" && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="h-3 w-3" />
                              Urgent
                            </span>
                          )}
                        </div>

                        {/* Row 2: Meta info */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="font-mono">{request.controlNumber}</span>
                          <span>Submitted {formatDate(request.createdAt)}</span>
                          {request.preferredPickupDate && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              Pickup: {formatDate(request.preferredPickupDate)}
                            </span>
                          )}
                        </div>

                        {/* Row 3: Remarks */}
                        {remarks && (
                          <div className={`flex items-start gap-2 p-2 rounded-md border text-xs ${getRemarksStyle(request.status)}`}>
                            <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <p className="line-clamp-2">{remarks}</p>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-foreground shrink-0 mt-1 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription className="font-mono">
                {selectedRequest?.controlNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={selectedRequest.status as any} />
                </div>
                <Separator />

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Certificate Type</p>
                    <p className="font-medium">{selectedRequest.certificateType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Priority</p>
                    <p className="font-medium capitalize">{selectedRequest.priority}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Date Submitted</p>
                    <p className="font-medium">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Last Updated</p>
                    <p className="font-medium">{formatDate(selectedRequest.updatedAt)}</p>
                  </div>
                  {selectedRequest.preferredPickupDate && (
                    <div>
                      <p className="text-muted-foreground text-xs">Preferred Pickup Date</p>
                      <p className="font-medium">{formatDate(selectedRequest.preferredPickupDate)}</p>
                    </div>
                  )}
                  {selectedRequest.processedBy && (
                    <div>
                      <p className="text-muted-foreground text-xs">Processed By</p>
                      <p className="font-medium">{selectedRequest.processedBy}</p>
                    </div>
                  )}
                </div>

                {selectedRequest.purpose && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Purpose</p>
                      <p className="text-sm">{selectedRequest.purpose}</p>
                    </div>
                  </>
                )}

                {selectedRequest.urgencyReason && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Reason for Urgency</p>
                    <p className="text-sm">{selectedRequest.urgencyReason}</p>
                  </div>
                )}

                {getRemarks(selectedRequest) && (
                  <>
                    <Separator />
                    <div className={`p-3 rounded-md border text-sm ${getRemarksStyle(selectedRequest.status)}`}>
                      <p className="font-medium text-xs mb-1">
                        {selectedRequest.status.toLowerCase() === "rejected" ? "Rejection Reason" :
                         selectedRequest.status.toLowerCase() === "incomplete requirements" ? "Missing / Incomplete" :
                         "Admin Remarks"}
                      </p>
                      <p>{getRemarks(selectedRequest)}</p>
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