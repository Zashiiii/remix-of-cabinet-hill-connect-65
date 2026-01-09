-- Create RPC function to get all incidents for staff management (includes staff-created and resident-submitted)
CREATE OR REPLACE FUNCTION get_all_incidents_for_staff(p_approval_status text DEFAULT NULL, p_status text DEFAULT NULL)
RETURNS SETOF incidents
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM incidents 
  WHERE 
    (p_approval_status IS NULL OR approval_status = p_approval_status)
    AND (p_status IS NULL OR status = p_status)
  ORDER BY created_at DESC;
$$;