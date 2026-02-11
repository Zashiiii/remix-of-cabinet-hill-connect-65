
-- Fix 1: Add role checks to incident functions

CREATE OR REPLACE FUNCTION public.get_all_incidents_for_staff(
  p_approval_status text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS SETOF incidents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;

  RETURN QUERY
  SELECT * FROM incidents
  WHERE
    (p_approval_status IS NULL OR approval_status = p_approval_status)
    AND (p_status IS NULL OR status = p_status)
  ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_incidents_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;

  RETURN (SELECT COUNT(*)::integer FROM incidents WHERE approval_status = 'pending');
END;
$$;

-- Fix 2: Replace permissive audit log INSERT policy with restricted one

DROP POLICY IF EXISTS "Audit logs can be created" ON public.audit_logs;

CREATE POLICY "Audit logs can be created by authenticated users"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create server-side audit log function for secure logging
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO audit_logs (
    action, entity_type, entity_id,
    performed_by, performed_by_type, details
  ) VALUES (
    p_action, p_entity_type, p_entity_id,
    auth.uid()::text, 
    CASE 
      WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'admin'
      WHEN has_role(auth.uid(), 'staff'::app_role) THEN 'staff'
      ELSE 'resident'
    END,
    p_details
  );
END;
$$;
