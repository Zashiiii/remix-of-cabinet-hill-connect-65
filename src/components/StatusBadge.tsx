import { Badge } from "@/components/ui/badge";
import { Circle } from "lucide-react";

export type RequestStatus = "pending" | "under_review" | "incomplete_requirements" | "for_review" | "verifying" | "approved" | "ready_for_pickup" | "released" | "rejected";

interface StatusBadgeProps {
  status: RequestStatus;
}

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: "🟡",
  },
  under_review: {
    label: "Under Review",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "🔵",
  },
  for_review: {
    label: "Under Review",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "🔵",
  },
  incomplete_requirements: {
    label: "Incomplete Requirements",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: "⚠️",
  },
  verifying: {
    label: "Under Verification",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: "🟣",
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: "🟢",
  },
  ready_for_pickup: {
    label: "Ready for Pickup",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: "🟠",
  },
  released: {
    label: "Released",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: "⚫",
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: "🔴",
  },
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const normalizedStatus = status?.toLowerCase().replace(/ /g, '_') as RequestStatus;
  const config = statusConfig[normalizedStatus] || {
    label: status || "Unknown",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: "⚪",
  };

  return (
    <Badge variant="outline" className={`${config.color} border font-medium px-3 py-1`}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
