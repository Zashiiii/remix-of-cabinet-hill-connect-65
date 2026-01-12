-- Create function to get pending certificate requests count
CREATE OR REPLACE FUNCTION public.get_pending_certificate_requests_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.certificate_requests
  WHERE status = 'pending';
$$;