-- Create function for residents to link themselves to a household by household number
CREATE OR REPLACE FUNCTION public.resident_link_to_household(p_user_id UUID, p_household_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id UUID;
  v_household_id UUID;
  v_household_address TEXT;
BEGIN
  -- Get the resident ID for this user
  SELECT id INTO v_resident_id
  FROM residents
  WHERE user_id = p_user_id
    AND deleted_at IS NULL
    AND approval_status = 'approved';
  
  IF v_resident_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resident not found or not approved');
  END IF;
  
  -- Check if resident is already linked to a household
  IF EXISTS (SELECT 1 FROM residents WHERE id = v_resident_id AND household_id IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already linked to a household');
  END IF;
  
  -- Find the household by number
  SELECT id, address INTO v_household_id, v_household_address
  FROM households
  WHERE household_number = p_household_number;
  
  IF v_household_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Household not found. Please check the household number or contact the Barangay office.');
  END IF;
  
  -- Link the resident to the household
  UPDATE residents
  SET household_id = v_household_id, updated_at = now()
  WHERE id = v_resident_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'household_id', v_household_id,
    'household_number', p_household_number,
    'household_address', v_household_address
  );
END;
$$;