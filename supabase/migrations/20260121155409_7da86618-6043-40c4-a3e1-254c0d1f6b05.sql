-- Drop existing function and recreate
DROP FUNCTION IF EXISTS public.staff_delete_household(UUID);

CREATE OR REPLACE FUNCTION public.staff_delete_household(
  p_household_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household households%ROWTYPE;
  v_residents_deleted INTEGER;
  v_submissions_deleted INTEGER;
BEGIN
  -- Get the household
  SELECT * INTO v_household FROM households WHERE id = p_household_id;
  
  IF v_household IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Household not found');
  END IF;
  
  -- Delete residents linked to this household that don't have user accounts
  DELETE FROM residents 
  WHERE household_id = p_household_id 
  AND user_id IS NULL;
  GET DIAGNOSTICS v_residents_deleted = ROW_COUNT;
  
  -- Delete ecological submissions linked to this household
  DELETE FROM ecological_profile_submissions 
  WHERE household_id = p_household_id;
  GET DIAGNOSTICS v_submissions_deleted = ROW_COUNT;
  
  -- Unlink residents that have user accounts (don't delete them, just remove household link)
  UPDATE residents 
  SET household_id = NULL 
  WHERE household_id = p_household_id 
  AND user_id IS NOT NULL;
  
  -- Delete household link requests for this household
  DELETE FROM household_link_requests WHERE household_id = p_household_id;
  
  -- Delete the household
  DELETE FROM households WHERE id = p_household_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'household_number', v_household.household_number,
    'residents_deleted', v_residents_deleted,
    'submissions_deleted', v_submissions_deleted
  );
END;
$$;