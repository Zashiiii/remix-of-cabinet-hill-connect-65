-- Create RPC function to get resident names for messaging (bypasses RLS for staff)
CREATE OR REPLACE FUNCTION public.get_resident_names_by_user_ids(p_user_ids text[])
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.user_id,
    CONCAT(r.first_name, ' ', r.last_name) as full_name
  FROM public.residents r
  WHERE r.user_id::text = ANY(p_user_ids);
$$;