import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle
} from "lucide-react";

type RequestStatus = "pending" | "processing" | "approved" | "rejected" | "verifying" | "released";

interface CertificateRequest {
  id: string;
  dbId?: string;
  residentName: string;
  certificateType: string;
  dateSubmitted: string;
  status: RequestStatus;
  email?: string;
  contactNumber?: string;
  purpose?: string;
  processedBy?: string;
  processedDate?: string;
  priority?: string;
  rejectionReason?: string;
  preferredPickupDate?: string;
}

interface CertificateRequestCardProps {
  request: CertificateRequest;
  isSelected: boolean;
  isProcessing: boolean;
  onSelect: (id: string) => void;
  onView: (request: CertificateRequest) => void;
  onDownload: (request: CertificateRequest) => void;
  onApprove: (request: CertificateRequest) => void;
  onReject: (request: CertificateRequest) => void;
  onVerify: (request: CertificateRequest) => void;
}

const getStatusBadge = (status: RequestStatus) => {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
    pending: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" />, label: "Pending" },
    verifying: { variant: "default", icon: <AlertCircle className="h-3 w-3 mr-1" />, label: "Verifying" },
    processing: { variant: "default", icon: <AlertCircle className="h-3 w-3 mr-1" />, label: "Processing" },
    approved: { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" />, label: "Approved" },
    rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" />, label: "Rejected" },
    released: { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" />, label: "Released" },
  };

  const { variant, icon, label } = config[status] || config.pending;

  return (
    <Badge variant={variant} className="capitalize">
      {icon}
      {label}
    </Badge>
  );
};

export function CertificateRequestCard({
  request,
  isSelected,
  isProcessing,
  onSelect,
  onView,
  onDownload,
  onApprove,
  onReject,
  onVerify,
}: CertificateRequestCardProps) {
  const isApproved = request.status === "approved";
  const isPendingOrVerifying = request.status === "pending" || request.status === "verifying" || request.status === "processing";
  const isPending = request.status === "pending";
  const isRejected = request.status === "rejected";

  return (
    <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Header: Certificate Type + Status */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{request.certificateType}</h3>
            {getStatusBadge(request.status)}
          </div>

          {/* Details as simple text lines */}
          <p className="text-sm text-muted-foreground">
            Control No: {request.id}
          </p>
          <p className="text-sm text-muted-foreground">
            Submitted: {request.dateSubmitted}
          </p>
          <p className="text-sm text-muted-foreground">
            Resident: {request.residentName}
            {request.contactNumber && ` | ${request.contactNumber}`}
          </p>
          {request.email && (
            <p className="text-sm text-muted-foreground">
              Email: {request.email}
            </p>
          )}
          {request.purpose && (
            <p className="text-sm text-muted-foreground mt-1">
              Purpose: {request.purpose}
            </p>
          )}
          {request.processedBy && (
            <p className="text-sm text-muted-foreground">
              Processed by: {request.processedBy}
            </p>
          )}

          {/* Rejection Reason Box */}
          {isRejected && request.rejectionReason && (
            <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">
                Rejection Reason:
              </p>
              <p className="text-sm text-destructive">
                {request.rejectionReason}
              </p>
            </div>
          )}

          {/* Ready for Pickup Box */}
          {isApproved && (
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

        {/* Actions - Right side */}
        <div className="flex flex-col gap-2 items-end">
          {/* Checkbox for bulk selection (approved and pending/verifying) */}
          {(isApproved || isPendingOrVerifying) && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(request.id)}
              aria-label={`Select ${request.residentName}`}
            />
          )}

          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(request)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Details
            </Button>

            {isPendingOrVerifying && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApprove(request)}
                  className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/30"
                  disabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReject(request)}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30"
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                {isPending && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onVerify(request)}
                    className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/30"
                    disabled={isProcessing}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Verify
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CertificateRequestCard;
