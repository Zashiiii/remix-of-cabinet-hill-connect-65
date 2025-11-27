-- Fix function search paths for existing functions
CREATE OR REPLACE FUNCTION public.get_pending_requests()
RETURNS TABLE(id uuid, resident_name text, resident_email text, resident_contact text, certificate_type text, purpose text, requested_date timestamp with time zone, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.resident_name,
    cr.resident_email,
    cr.resident_contact,
    cr.certificate_type,
    cr.purpose,
    cr.requested_date::timestamp with time zone,
    cr.status
  FROM public.certificate_requests cr
  WHERE cr.status = 'Pending'
  ORDER BY cr.resident_name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_announcements()
RETURNS TABLE(id uuid, title text, content text, announcement_type text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.content,
    a.announcement_type,
    a.created_at
  FROM public.announcements a
  WHERE a.is_active = true
  ORDER BY a.created_at DESC
  LIMIT 5;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_resident_exists(p_resident_id uuid)
RETURNS TABLE(resident_found boolean, resident_name text, residency_months integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    true as resident_found,
    (r.first_name || ' ' || r.last_name)::text as resident_name,
    EXTRACT(MONTH FROM AGE(now(), r.date_registered))::INTEGER as residency_months
  FROM public.residents r
  WHERE r.id = p_resident_id;
END;
$$;