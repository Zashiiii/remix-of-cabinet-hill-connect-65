-- Fix get_staff_for_messaging to require authentication
-- This prevents unauthenticated users from enumerating staff members

DROP FUNCTION IF EXISTS public.get_staff_for_messaging();

CREATE OR REPLACE FUNCTION public.get_staff_for_messaging()
RETURNS TABLE(id text, full_name text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication - either a logged-in resident user or staff member
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view staff list';
  END IF;
  
  -- Optionally verify the caller is an approved resident or staff
  -- For now, any authenticated user can view staff for messaging purposes
  
  RETURN QUERY 
  SELECT s.id::text, s.full_name, s.role
  FROM staff_users s
  WHERE s.is_active = true;
END;
$$;