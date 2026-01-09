-- Create RPC function for staff to get resident-submitted incidents
CREATE OR REPLACE FUNCTION get_incidents_for_staff(p_status_filter text DEFAULT NULL)
RETURNS SETOF incidents
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM incidents 
  WHERE submitted_by_resident_id IS NOT NULL
  AND (p_status_filter IS NULL OR approval_status = p_status_filter)
  ORDER BY created_at DESC;
$$;