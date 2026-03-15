import { Check, Clock, X, AlertTriangle } from "lucide-react";
import { RequestStatus } from "./StatusBadge";
import { cn } from "@/lib/utils";

interface StatusTimelineProps {
  currentStatus: RequestStatus;
}

interface TimelineStep {
  label: string;
  statuses: RequestStatus[];
}

const timelineSteps: TimelineStep[] = [
  { label: "Submitted", statuses: ["pending", "under_review", "for_review", "incomplete_requirements", "verifying", "approved", "ready_for_pickup", "released", "rejected"] },
  { label: "Under Review", statuses: ["under_review", "for_review", "incomplete_requirements", "verifying", "approved", "ready_for_pickup", "released"] },
  { label: "Approved", statuses: ["approved", "ready_for_pickup", "released"] },
  { label: "Ready for Pickup", statuses: ["ready_for_pickup", "released"] },
  { label: "Released", statuses: ["released"] },
];

const incompleteTimeline: TimelineStep[] = [
  { label: "Submitted", statuses: ["pending", "under_review", "for_review", "incomplete_requirements", "verifying", "approved", "ready_for_pickup", "released", "rejected"] },
  { label: "Under Review", statuses: ["under_review", "for_review", "incomplete_requirements", "verifying", "approved", "ready_for_pickup", "released"] },
  { label: "Incomplete Requirements", statuses: ["incomplete_requirements"] },
];

const rejectedTimeline: TimelineStep[] = [
  { label: "Submitted", statuses: ["pending", "under_review", "for_review", "verifying", "rejected"] },
  { label: "Under Review", statuses: ["under_review", "for_review", "verifying", "rejected"] },
  { label: "Rejected", statuses: ["rejected"] },
];

const statusToStepLabel: Record<string, string> = {
  pending: "Submitted",
  under_review: "Under Review",
  for_review: "Under Review",
  incomplete_requirements: "Incomplete Requirements",
  verifying: "Under Review",
  approved: "Approved",
  ready_for_pickup: "Ready for Pickup",
  released: "Released",
  rejected: "Rejected",
};

const StatusTimeline = ({ currentStatus }: StatusTimelineProps) => {
  const isRejected = currentStatus === "rejected";
  const isIncomplete = currentStatus === "incomplete_requirements";
  const steps = isRejected ? rejectedTimeline : isIncomplete ? incompleteTimeline : timelineSteps;

  const getStepState = (step: TimelineStep, index: number): "completed" | "current" | "upcoming" | "warning" => {
    const currentLabel = statusToStepLabel[currentStatus] || "Submitted";
    const currentStepIndex = steps.findIndex(s => s.label === currentLabel);

    if (isIncomplete && step.label === "Incomplete Requirements") return "warning";
    if (isRejected && step.label === "Rejected") return "completed";
    
    if (index < currentStepIndex) return "completed";
    if (index === currentStepIndex) return "current";
    return "upcoming";
  };

  return (
    <div className="py-6">
      <h3 className="text-lg font-semibold mb-6">Request Timeline</h3>
      <div className="space-y-4">
        {steps.map((step, index) => {
          const state = getStepState(step, index);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.label} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                      state === "completed" && !isRejected && "bg-accent border-accent text-white",
                      state === "completed" && isRejected && step.label === "Rejected" && "bg-red-500 border-red-500 text-white",
                      state === "current" && "bg-primary border-primary text-white animate-pulse",
                      state === "warning" && "bg-amber-500 border-amber-500 text-white",
                      state === "upcoming" && "bg-background border-border text-muted-foreground"
                    )}
                  >
                    {state === "completed" && (isRejected && step.label === "Rejected" ? <X className="h-5 w-5" /> : <Check className="h-5 w-5" />)}
                    {state === "current" && <Clock className="h-5 w-5" />}
                    {state === "warning" && <AlertTriangle className="h-5 w-5" />}
                    {state === "upcoming" && <div className="w-2 h-2 rounded-full bg-muted-foreground" />}
                  </div>
                </div>

                <div className="flex-1 pt-2">
                  <p
                    className={cn(
                      "font-medium transition-colors",
                      state === "completed" && "text-foreground",
                      state === "current" && "text-primary font-semibold",
                      state === "warning" && "text-amber-600 font-semibold",
                      state === "upcoming" && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                </div>
              </div>

              {!isLast && (
                <div
                  className={cn(
                    "absolute left-5 top-10 w-0.5 h-8 -translate-x-1/2 transition-colors",
                    state === "completed" && !isRejected && "bg-accent",
                    state === "completed" && isRejected && "bg-red-500",
                    state === "current" && "bg-primary",
                    state === "warning" && "bg-amber-500",
                    state === "upcoming" && "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusTimeline;
