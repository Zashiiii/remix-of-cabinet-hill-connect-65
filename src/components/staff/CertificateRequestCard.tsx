import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const getStatusBorderColor = (status: RequestStatus) => {
  switch (status) {
    case "pending":
      return "border-l-yellow-500";
    case "verifying":
    case "processing":
      return "border-l-purple-500";
    case "approved":
      return "border-l-green-500";
    case "rejected":
      return "border-l-red-500";
    case "released":
      return "border-l-emerald-600";
    default:
      return "border-l-muted";
  }
};

const getStatusBadge = (status: RequestStatus) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case "verifying":
    case "processing":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700"><AlertCircle className="h-3 w-3 mr-1" />Verifying</Badge>;
    case "approved":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    case "released":
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700"><CheckCircle className="h-3 w-3 mr-1" />Released</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
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

  return (
    <Card 
      className={cn(
        "border-l-4 transition-all duration-200 hover:shadow-md",
        getStatusBorderColor(request.status),
        isSelected && "ring-2 ring-primary/50 bg-muted/30"
      )}
    >
      <CardContent className="p-4">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(request.id)}
              disabled={!isApproved}
              aria-label={`Select ${request.residentName}`}
              className="mt-1"
            />
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">{request.certificateType}</h3>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">{request.id}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge(request.status)}
            {request.processedBy && (
              <span className="text-xs text-muted-foreground">
                by {request.processedBy}
              </span>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate text-foreground">{request.residentName}</span>
          </div>
          {request.contactNumber && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate text-foreground">{request.contactNumber}</span>
            </div>
          )}
          {request.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate text-foreground">{request.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-foreground">{request.dateSubmitted}</span>
          </div>
          {request.purpose && (
            <div className="col-span-2 flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">Purpose:</span>
              <span className="text-foreground">{request.purpose}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(request)}
            className="text-xs"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View Details
          </Button>
          
          {isApproved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(request)}
              className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/30"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
          )}
          
          {isPendingOrVerifying && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApprove(request)}
                className="text-xs text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/30"
                disabled={isProcessing}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject(request)}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30"
                disabled={isProcessing}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
              {isPending && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onVerify(request)}
                  className="text-xs text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/30"
                  disabled={isProcessing}
                >
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  Mark Verifying
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default CertificateRequestCard;
