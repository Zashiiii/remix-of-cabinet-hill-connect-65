-- Create RPC function for staff to approve/reject incidents
CREATE OR REPLACE FUNCTION staff_approve_incident(p_incident_id uuid, p_reviewed_by text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE incidents
  SET 
    approval_status = 'approved',
    reviewed_by = p_reviewed_by,
    reviewed_at = now()
  WHERE id = p_incident_id;
END;
$$;

CREATE OR REPLACE FUNCTION staff_reject_incident(p_incident_id uuid, p_reviewed_by text, p_rejection_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE incidents
  SET 
    approval_status = 'rejected',
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    rejection_reason = p_rejection_reason
  WHERE id = p_incident_id;
END;
$$;