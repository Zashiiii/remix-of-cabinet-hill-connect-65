-- Create table for name change requests
CREATE TABLE public.name_change_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  current_first_name text NOT NULL,
  current_middle_name text,
  current_last_name text NOT NULL,
  current_suffix text,
  requested_first_name text NOT NULL,
  requested_middle_name text,
  requested_last_name text NOT NULL,
  requested_suffix text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.name_change_requests ENABLE ROW LEVEL SECURITY;

-- Residents can view their own requests
CREATE POLICY "Residents can view own name change requests"
ON public.name_change_requests
FOR SELECT
USING (
  resident_id IN (
    SELECT id FROM residents WHERE user_id = auth.uid()
  )
);

-- Residents can create their own requests
CREATE POLICY "Residents can create name change requests"
ON public.name_change_requests
FOR INSERT
WITH CHECK (
  resident_id IN (
    SELECT id FROM residents WHERE user_id = auth.uid()
  )
);

-- Create SECURITY DEFINER function for staff to view all requests
CREATE FUNCTION public.get_name_change_requests_for_staff(p_status text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  resident_id uuid,
  current_first_name text,
  current_middle_name text,
  current_last_name text,
  current_suffix text,
  requested_first_name text,
  requested_middle_name text,
  requested_last_name text,
  requested_suffix text,
  reason text,
  status text,
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz,
  resident_email text,
  resident_contact text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ncr.id,
    ncr.resident_id,
    ncr.current_first_name,
    ncr.current_middle_name,
    ncr.current_last_name,
    ncr.current_suffix,
    ncr.requested_first_name,
    ncr.requested_middle_name,
    ncr.requested_last_name,
    ncr.requested_suffix,
    ncr.reason,
    ncr.status,
    ncr.reviewed_by,
    ncr.reviewed_at,
    ncr.rejection_reason,
    ncr.created_at,
    r.email as resident_email,
    r.contact_number as resident_contact
  FROM name_change_requests ncr
  JOIN residents r ON r.id = ncr.resident_id
  WHERE (p_status IS NULL OR ncr.status = p_status)
  ORDER BY ncr.created_at DESC;
END;
$$;

-- Function for staff to approve name change
CREATE FUNCTION public.staff_approve_name_change(
  p_request_id uuid,
  p_reviewed_by text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request name_change_requests%ROWTYPE;
BEGIN
  -- Get the request
  SELECT * INTO v_request FROM name_change_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request has already been processed';
  END IF;
  
  -- Update the resident's name
  UPDATE residents
  SET 
    first_name = v_request.requested_first_name,
    middle_name = v_request.requested_middle_name,
    last_name = v_request.requested_last_name,
    suffix = v_request.requested_suffix,
    updated_at = now()
  WHERE id = v_request.resident_id;
  
  -- Update the request status
  UPDATE name_change_requests
  SET 
    status = 'approved',
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;
END;
$$;

-- Function for staff to reject name change
CREATE FUNCTION public.staff_reject_name_change(
  p_request_id uuid,
  p_reviewed_by text,
  p_rejection_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE name_change_requests
  SET 
    status = 'rejected',
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    rejection_reason = p_rejection_reason,
    updated_at = now()
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
END;
$$;