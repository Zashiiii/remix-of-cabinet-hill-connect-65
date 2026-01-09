-- Drop old function if exists
DROP FUNCTION IF EXISTS public.get_residents_for_messaging();

-- Create new function that validates staff session
CREATE OR REPLACE FUNCTION public.get_residents_for_messaging_staff(p_staff_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_exists boolean;
BEGIN
  -- Validate staff user exists and is active
  SELECT EXISTS (
    SELECT 1 FROM staff_users 
    WHERE id = p_staff_id AND is_active = true
  ) INTO v_staff_exists;
  
  IF NOT v_staff_exists THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  -- Return approved residents with user accounts
  RETURN QUERY
  SELECT 
    r.user_id,
    CONCAT(r.first_name, ' ', COALESCE(r.middle_name || ' ', ''), r.last_name, COALESCE(' ' || r.suffix, ''))::text AS full_name,
    r.email
  FROM residents r
  WHERE r.user_id IS NOT NULL 
    AND r.approval_status = 'approved'
    AND r.deleted_at IS NULL
  ORDER BY r.last_name, r.first_name;
END;
$$;