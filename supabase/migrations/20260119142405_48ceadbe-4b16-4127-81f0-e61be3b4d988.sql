-- Create household_link_requests table for approval workflow
CREATE TABLE public.household_link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  household_number TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique constraint to prevent duplicate pending requests
CREATE UNIQUE INDEX idx_unique_pending_household_request 
ON public.household_link_requests (resident_id, household_id) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.household_link_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Residents can view their own requests
CREATE POLICY "Residents can view own household link requests"
ON public.household_link_requests
FOR SELECT
USING (resident_id IN (
  SELECT id FROM residents WHERE user_id = auth.uid()
));

-- Residents can create requests for themselves
CREATE POLICY "Residents can create household link requests"
ON public.household_link_requests
FOR INSERT
WITH CHECK (resident_id IN (
  SELECT id FROM residents WHERE user_id = auth.uid()
));

-- Staff can manage all requests
CREATE POLICY "Staff can manage household link requests"
ON public.household_link_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Function: Resident requests household link
CREATE OR REPLACE FUNCTION public.resident_request_household_link(
  p_user_id UUID,
  p_household_number TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id UUID;
  v_household_id UUID;
  v_existing_link UUID;
  v_pending_request UUID;
  v_request_id UUID;
BEGIN
  -- Get resident ID from user
  SELECT id INTO v_resident_id
  FROM residents
  WHERE user_id = p_user_id AND deleted_at IS NULL;
  
  IF v_resident_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Resident profile not found');
  END IF;
  
  -- Check if resident already linked to a household
  SELECT household_id INTO v_existing_link
  FROM residents
  WHERE id = v_resident_id AND household_id IS NOT NULL;
  
  IF v_existing_link IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You are already linked to a household');
  END IF;
  
  -- Find the household by number
  SELECT id INTO v_household_id
  FROM households
  WHERE household_number = p_household_number;
  
  IF v_household_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Household number not found');
  END IF;
  
  -- Check for existing pending request for same household
  SELECT id INTO v_pending_request
  FROM household_link_requests
  WHERE resident_id = v_resident_id 
    AND household_id = v_household_id 
    AND status = 'pending';
  
  IF v_pending_request IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You already have a pending request for this household');
  END IF;
  
  -- Create the request
  INSERT INTO household_link_requests (
    resident_id, household_id, household_number, reason, status
  ) VALUES (
    v_resident_id, v_household_id, p_household_number, p_reason, 'pending'
  ) RETURNING id INTO v_request_id;
  
  RETURN json_build_object(
    'success', true,
    'request_id', v_request_id,
    'message', 'Request submitted successfully. Waiting for staff approval.'
  );
END;
$$;

-- Function: Get household link requests for staff
CREATE OR REPLACE FUNCTION public.get_household_link_requests_for_staff(
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  resident_id UUID,
  resident_name TEXT,
  resident_email TEXT,
  resident_contact TEXT,
  household_id UUID,
  household_number TEXT,
  household_address TEXT,
  reason TEXT,
  status TEXT,
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hlr.id,
    hlr.resident_id,
    CONCAT(r.first_name, ' ', COALESCE(r.middle_name || ' ', ''), r.last_name) AS resident_name,
    r.email AS resident_email,
    r.contact_number AS resident_contact,
    hlr.household_id,
    hlr.household_number,
    h.address AS household_address,
    hlr.reason,
    hlr.status,
    hlr.rejection_reason,
    hlr.reviewed_by,
    hlr.reviewed_at,
    hlr.created_at
  FROM household_link_requests hlr
  JOIN residents r ON r.id = hlr.resident_id
  JOIN households h ON h.id = hlr.household_id
  WHERE (p_status IS NULL OR hlr.status = p_status)
  ORDER BY 
    CASE WHEN hlr.status = 'pending' THEN 0 ELSE 1 END,
    hlr.created_at DESC;
END;
$$;

-- Function: Staff approve household link request
CREATE OR REPLACE FUNCTION public.staff_approve_household_link(
  p_request_id UUID,
  p_approved_by TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id UUID;
  v_household_id UUID;
BEGIN
  -- Get request details
  SELECT resident_id, household_id INTO v_resident_id, v_household_id
  FROM household_link_requests
  WHERE id = p_request_id AND status = 'pending';
  
  IF v_resident_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
  
  -- Update resident with household link
  UPDATE residents
  SET household_id = v_household_id, updated_at = now()
  WHERE id = v_resident_id;
  
  -- Update request status
  UPDATE household_link_requests
  SET status = 'approved',
      reviewed_by = p_approved_by,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;
END;
$$;

-- Function: Staff reject household link request
CREATE OR REPLACE FUNCTION public.staff_reject_household_link(
  p_request_id UUID,
  p_rejected_by TEXT,
  p_rejection_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE household_link_requests
  SET status = 'rejected',
      rejection_reason = p_rejection_reason,
      reviewed_by = p_rejected_by,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
END;
$$;

-- Function: Get pending household link request count
CREATE OR REPLACE FUNCTION public.get_pending_household_link_requests_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM household_link_requests
  WHERE status = 'pending';
$$;

-- Function: Get resident's household link requests
CREATE OR REPLACE FUNCTION public.get_resident_household_link_requests(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  household_number TEXT,
  household_address TEXT,
  reason TEXT,
  status TEXT,
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id UUID;
BEGIN
  SELECT id INTO v_resident_id
  FROM residents
  WHERE user_id = p_user_id AND deleted_at IS NULL;
  
  RETURN QUERY
  SELECT 
    hlr.id,
    hlr.household_number,
    h.address AS household_address,
    hlr.reason,
    hlr.status,
    hlr.rejection_reason,
    hlr.reviewed_at,
    hlr.created_at
  FROM household_link_requests hlr
  JOIN households h ON h.id = hlr.household_id
  WHERE hlr.resident_id = v_resident_id
  ORDER BY hlr.created_at DESC;
END;
$$;