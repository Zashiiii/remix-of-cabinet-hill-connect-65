-- Create function to get pending name change requests count
CREATE OR REPLACE FUNCTION public.get_pending_name_change_requests_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.name_change_requests
  WHERE status = 'pending';
$$;