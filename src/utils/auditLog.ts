import { supabase } from "@/integrations/supabase/client";

type AuditAction = 
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "login"
  | "logout"
  | "generate_certificate"
  | "view";

type EntityType =
  | "certificate_request"
  | "resident"
  | "household"
  | "incident"
  | "announcement"
  | "staff_user"
  | "template"
  | "message";

type PerformedByType = "staff" | "admin" | "resident" | "system";

interface AuditLogData {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  performedBy: string;
  performedByType: PerformedByType;
  details?: Record<string, any>;
}

export const createAuditLog = async (data: AuditLogData): Promise<boolean> => {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId || null,
      performed_by: data.performedBy,
      performed_by_type: data.performedByType,
      details: data.details || null,
    });

    if (error) {
      console.error("Error creating audit log:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error creating audit log:", error);
    return false;
  }
};

// Convenience functions for common audit actions
export const logRequestApproval = async (
  controlNumber: string,
  staffName: string,
  residentName: string
) => {
  return createAuditLog({
    action: "approve",
    entityType: "certificate_request",
    entityId: controlNumber,
    performedBy: staffName,
    performedByType: "staff",
    details: { resident_name: residentName },
  });
};

export const logRequestRejection = async (
  controlNumber: string,
  staffName: string,
  residentName: string,
  reason: string
) => {
  return createAuditLog({
    action: "reject",
    entityType: "certificate_request",
    entityId: controlNumber,
    performedBy: staffName,
    performedByType: "staff",
    details: { resident_name: residentName, rejection_reason: reason },
  });
};

export const logStaffLogin = async (staffName: string, staffId: string) => {
  return createAuditLog({
    action: "login",
    entityType: "staff_user",
    entityId: staffId,
    performedBy: staffName,
    performedByType: "staff",
  });
};

export const logStaffLogout = async (staffName: string, staffId: string) => {
  return createAuditLog({
    action: "logout",
    entityType: "staff_user",
    entityId: staffId,
    performedBy: staffName,
    performedByType: "staff",
  });
};

export const logIncidentCreation = async (
  incidentNumber: string,
  staffName: string,
  incidentType: string
) => {
  return createAuditLog({
    action: "create",
    entityType: "incident",
    entityId: incidentNumber,
    performedBy: staffName,
    performedByType: "staff",
    details: { incident_type: incidentType },
  });
};

export const logAnnouncementCreation = async (
  announcementId: string,
  staffName: string,
  title: string
) => {
  return createAuditLog({
    action: "create",
    entityType: "announcement",
    entityId: announcementId,
    performedBy: staffName,
    performedByType: "staff",
    details: { title },
  });
};
