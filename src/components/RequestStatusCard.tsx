import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import StatusBadge, { RequestStatus } from "./StatusBadge";
import StatusTimeline from "./StatusTimeline";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { useRef } from "react";

export interface RequestData {
  controlNumber: string;
  certificateType: string;
  residentName: string;
  dateRequested: Date;
  status: RequestStatus;
  purpose: string;
  remarks?: string;
}

interface RequestStatusCardProps {
  request: RequestData;
}

const RequestStatusCard = ({ request }: RequestStatusCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;

    try {
      toast.info("Generating image...");
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `certificate-request-${request.controlNumber}.png`;
      link.click();
      
      toast.success("Certificate details downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download image. Please try again.");
    }
  };

  return (
    <Card className="shadow-medium" ref={cardRef}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-xl">Request Details</CardTitle>
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleDownloadImage}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Request Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Control Number</p>
            <p className="font-semibold text-foreground">{request.controlNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Certificate Type</p>
            <p className="font-semibold text-foreground">{request.certificateType}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Resident Name</p>
            <p className="font-semibold text-foreground">{request.residentName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Date Requested</p>
            <p className="font-semibold text-foreground">
              {format(request.dateRequested, "MMMM dd, yyyy")}
            </p>
          </div>
        </div>

        <Separator />

        {/* Purpose */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Purpose</p>
          <p className="text-foreground">{request.purpose}</p>
        </div>

        {/* Remarks */}
        {request.remarks && (
          <>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Remarks</p>
              <p className="text-foreground">{request.remarks}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Timeline */}
        <StatusTimeline currentStatus={request.status} />
      </CardContent>
    </Card>
  );
};

export default RequestStatusCard;
