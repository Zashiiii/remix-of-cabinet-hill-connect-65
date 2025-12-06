-- Function to get pending registration count
CREATE OR REPLACE FUNCTION public.get_pending_registration_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer FROM public.residents WHERE approval_status = 'pending';
$$;

-- Function to check registration status by email
CREATE OR REPLACE FUNCTION public.check_registration_status(p_email text)
RETURNS TABLE(
  status text,
  first_name text,
  last_name text,
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    r.approval_status,
    r.first_name,
    r.last_name,
    r.created_at,
    r.approved_at,
    r.approved_by
  FROM public.residents r
  WHERE LOWER(r.email) = LOWER(p_email)
  ORDER BY r.created_at DESC
  LIMIT 1;
$$;