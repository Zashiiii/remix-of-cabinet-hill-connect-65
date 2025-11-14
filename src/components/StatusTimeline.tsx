import { Check, Clock, X } from "lucide-react";
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
  { label: "Submitted", statuses: ["pending", "for_review", "approved", "ready_for_pickup", "released", "rejected"] },
  { label: "Under Review", statuses: ["for_review", "approved", "ready_for_pickup", "released", "rejected"] },
  { label: "Approved", statuses: ["approved", "ready_for_pickup", "released"] },
  { label: "Ready for Pickup", statuses: ["ready_for_pickup", "released"] },
  { label: "Released", statuses: ["released"] },
];

const rejectedTimeline: TimelineStep[] = [
  { label: "Submitted", statuses: ["pending", "for_review", "rejected"] },
  { label: "Under Review", statuses: ["for_review", "rejected"] },
  { label: "Rejected", statuses: ["rejected"] },
];

const StatusTimeline = ({ currentStatus }: StatusTimelineProps) => {
  const isRejected = currentStatus === "rejected";
  const steps = isRejected ? rejectedTimeline : timelineSteps;

  const getStepState = (step: TimelineStep): "completed" | "current" | "upcoming" => {
    if (step.statuses.includes(currentStatus)) {
      // Check if this is the most recent step for current status
      const currentStepIndex = steps.findIndex(s => s.statuses.includes(currentStatus) && !steps.slice(0, steps.indexOf(s)).some(prev => prev.statuses.includes(currentStatus)));
      const thisStepIndex = steps.indexOf(step);
      
      if (thisStepIndex < currentStepIndex || (isRejected && step.label === "Rejected")) {
        return "completed";
      }
      return "current";
    }
    
    // Check if step comes before current status
    const stepIndex = steps.indexOf(step);
    const currentIndex = steps.findIndex(s => s.label === (
      currentStatus === "pending" ? "Submitted" :
      currentStatus === "for_review" ? "Under Review" :
      currentStatus === "approved" ? "Approved" :
      currentStatus === "ready_for_pickup" ? "Ready for Pickup" :
      currentStatus === "released" ? "Released" :
      "Rejected"
    ));
    
    if (stepIndex < currentIndex) {
      return "completed";
    }
    
    return "upcoming";
  };

  return (
    <div className="py-6">
      <h3 className="text-lg font-semibold mb-6">Request Timeline</h3>
      <div className="space-y-4">
        {steps.map((step, index) => {
          const state = getStepState(step);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.label} className="relative">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                      state === "completed" && !isRejected && "bg-accent border-accent text-white",
                      state === "completed" && isRejected && step.label === "Rejected" && "bg-red-500 border-red-500 text-white",
                      state === "current" && "bg-primary border-primary text-white animate-pulse",
                      state === "upcoming" && "bg-background border-border text-muted-foreground"
                    )}
                  >
                    {state === "completed" && (isRejected && step.label === "Rejected" ? <X className="h-5 w-5" /> : <Check className="h-5 w-5" />)}
                    {state === "current" && <Clock className="h-5 w-5" />}
                    {state === "upcoming" && <div className="w-2 h-2 rounded-full bg-muted-foreground" />}
                  </div>
                </div>

                {/* Label */}
                <div className="flex-1 pt-2">
                  <p
                    className={cn(
                      "font-medium transition-colors",
                      state === "completed" && "text-foreground",
                      state === "current" && "text-primary font-semibold",
                      state === "upcoming" && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-5 top-10 w-0.5 h-8 -translate-x-1/2 transition-colors",
                    state === "completed" && !isRejected && "bg-accent",
                    state === "completed" && isRejected && "bg-red-500",
                    state === "current" && "bg-primary",
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
