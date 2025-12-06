-- Fix get_pending_requests to be case-insensitive
CREATE OR REPLACE FUNCTION public.get_pending_requests()
RETURNS SETOF certificate_requests
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT * FROM public.certificate_requests 
    WHERE LOWER(status) = 'pending' 
    ORDER BY created_at ASC;
$$;

-- Create RPC for fetching all certificate requests (for staff)
CREATE OR REPLACE FUNCTION public.get_all_certificate_requests_for_staff(p_status_filter text DEFAULT NULL)
RETURNS SETOF certificate_requests
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.certificate_requests
  WHERE p_status_filter IS NULL 
     OR p_status_filter = 'All' 
     OR LOWER(status) = LOWER(p_status_filter)
  ORDER BY created_at DESC;
$$;

-- Create RPC for updating request status (for staff)
CREATE OR REPLACE FUNCTION public.staff_update_request_status(
  p_request_id uuid,
  p_status text,
  p_processed_by text,
  p_notes text DEFAULT NULL
)
RETURNS certificate_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request certificate_requests;
BEGIN
  UPDATE public.certificate_requests
  SET 
    status = p_status, 
    processed_by = p_processed_by, 
    notes = COALESCE(p_notes, notes), 
    updated_at = now()
  WHERE id = p_request_id
  RETURNING * INTO v_request;
  
  RETURN v_request;
END;
$$;

-- Create RPC for staff to create announcements
CREATE OR REPLACE FUNCTION public.staff_create_announcement(
  p_title text,
  p_content text,
  p_title_tl text DEFAULT NULL,
  p_content_tl text DEFAULT NULL,
  p_type text DEFAULT 'info',
  p_created_by text DEFAULT NULL
)
RETURNS announcements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_announcement announcements;
BEGIN
  INSERT INTO public.announcements (title, content, title_tl, content_tl, type, created_by, is_active)
  VALUES (p_title, p_content, p_title_tl, p_content_tl, p_type, p_created_by, true)
  RETURNING * INTO v_announcement;
  
  RETURN v_announcement;
END;
$$;

-- Create RPC for staff to update announcements
CREATE OR REPLACE FUNCTION public.staff_update_announcement(
  p_id uuid,
  p_title text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_title_tl text DEFAULT NULL,
  p_content_tl text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.announcements
  SET 
    title = COALESCE(p_title, title),
    content = COALESCE(p_content, content),
    title_tl = COALESCE(p_title_tl, title_tl),
    content_tl = COALESCE(p_content_tl, content_tl),
    type = COALESCE(p_type, type),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_id;
END;
$$;

-- Create RPC for staff to delete announcements (soft delete)
CREATE OR REPLACE FUNCTION public.staff_delete_announcement(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.announcements
  SET is_active = false, updated_at = now()
  WHERE id = p_id;
END;
$$;

-- Create RPC for fetching all announcements (for staff dashboard)
CREATE OR REPLACE FUNCTION public.get_all_announcements_for_staff()
RETURNS SETOF announcements
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.announcements
  WHERE is_active = true
  ORDER BY created_at DESC;
$$;