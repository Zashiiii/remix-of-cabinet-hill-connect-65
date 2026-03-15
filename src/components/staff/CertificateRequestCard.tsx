import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Pencil,
  CalendarDays,
  AlertTriangle,
  MessageSquare,
  Phone,
} from "lucide-react";

type RequestStatus = "pending" | "processing" | "approved" | "rejected" | "verifying" | "released" | "under review" | "incomplete requirements" | "ready for pickup";

interface CertificateRequest {
  id: string;
  dbId?: string;
  residentName: string;
  certificateType: string;
  customCertificateName?: string;
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
  notes?: string;
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
  onUpdateStatus?: (request: CertificateRequest) => void;
}

const getStatusBadge = (status: RequestStatus) => {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
    pending: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" />, label: "Pending" },
    "under review": { variant: "default", icon: <AlertCircle className="h-3 w-3 mr-1" />, label: "Under Review" },
    verifying: { variant: "default", icon: <AlertCircle className="h-3 w-3 mr-1" />, label: "Verifying" },
    processing: { variant: "default", icon: <AlertCircle className="h-3 w-3 mr-1" />, label: "Processing" },
    "incomplete requirements": { variant: "secondary", icon: <AlertTriangle className="h-3 w-3 mr-1" />, label: "Incomplete" },
    approved: { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" />, label: "Approved" },
    "ready for pickup": { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" />, label: "Ready for Pickup" },
    rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" />, label: "Rejected" },
    released: { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" />, label: "Released" },
  };

  const { variant, icon, label } = config[status] || config.pending;

  return (
    <Badge variant={variant} className="capitalize text-xs">
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
  onApprove,
  onReject,
  onUpdateStatus,
}: CertificateRequestCardProps) {
  const isPendingOrVerifying = ["pending", "verifying", "processing", "under review", "incomplete requirements"].includes(request.status);
  const isReleased = request.status === "released";
  const isSelectable = !isReleased;

  const remarks = request.notes || request.rejectionReason;

  const getRemarksStyle = () => {
    const s = request.status;
    if (s === "rejected") return "bg-destructive/10 border-destructive/20 text-destructive";
    if (s === "incomplete requirements") return "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300";
    return "bg-muted/50 border-border text-muted-foreground";
  };

  return (
    <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {isSelectable && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(request.id)}
            aria-label={`Select ${request.residentName}`}
            className="mt-1"
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Row 1: Type + Status + Priority */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-sm truncate">
              {request.certificateType}
              {request.certificateType === "Others" && request.customCertificateName && (
                <span className="text-muted-foreground font-normal"> — {request.customCertificateName}</span>
              )}
            </h3>
            {getStatusBadge(request.status)}
            {request.priority?.toLowerCase() === "urgent" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" />
                Urgent
              </span>
            )}
          </div>

          {/* Row 2: Key meta */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">{request.id}</span>
            <span className="font-medium text-foreground">{request.residentName}</span>
            {request.contactNumber && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {request.contactNumber}
              </span>
            )}
            <span>{request.dateSubmitted}</span>
            {request.preferredPickupDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Pickup: {request.preferredPickupDate}
              </span>
            )}
          </div>

          {/* Row 3: Purpose preview */}
          {request.purpose && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              <span className="font-medium text-foreground/80">Purpose:</span> {request.purpose}
            </p>
          )}

          {/* Row 3: Remarks if any */}
          {remarks && (
            <div className={`flex items-start gap-2 p-2 rounded-md border text-xs ${getRemarksStyle()}`}>
              <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p className="line-clamp-2">{remarks}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onView(request)} className="text-xs h-8">
            <Eye className="h-3.5 w-3.5 mr-1" />
            View
          </Button>

          {!isReleased && onUpdateStatus && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateStatus(request)}
              className="text-xs h-8 text-primary border-primary/30 hover:bg-primary/10"
              disabled={isProcessing}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Update
            </Button>
          )}

          {isPendingOrVerifying && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApprove(request)}
                className="text-xs h-8 text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/30"
                disabled={isProcessing}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject(request)}
                className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30"
                disabled={isProcessing}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CertificateRequestCard;