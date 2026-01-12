-- Create function to get pending incidents count (awaiting approval)
CREATE OR REPLACE FUNCTION public.get_pending_incidents_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.incidents
  WHERE approval_status = 'pending';
$$;