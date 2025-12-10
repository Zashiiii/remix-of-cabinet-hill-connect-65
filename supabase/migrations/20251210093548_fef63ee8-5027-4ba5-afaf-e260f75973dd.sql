-- Create a function to get staff users for messaging (public-facing)
CREATE OR REPLACE FUNCTION public.get_staff_for_messaging()
RETURNS TABLE (
  id uuid,
  full_name text,
  role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, role
  FROM public.staff_users
  WHERE is_active = true
    AND role IN ('admin', 'secretary', 'staff')
  ORDER BY 
    CASE WHEN role = 'admin' THEN 1 
         WHEN role = 'secretary' THEN 2 
         ELSE 3 END;
$$;