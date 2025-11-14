import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import StatusBadge, { RequestStatus } from "./StatusBadge";
import StatusTimeline from "./StatusTimeline";
import { format } from "date-fns";

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
  return (
    <Card className="shadow-medium">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-xl">Request Details</CardTitle>
          <StatusBadge status={request.status} />
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
