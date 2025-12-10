-- Create a function for staff to delete a resident and their associated auth user
CREATE OR REPLACE FUNCTION public.staff_delete_resident(p_resident_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user_id if linked
  SELECT user_id INTO v_user_id FROM public.residents WHERE id = p_resident_id;
  
  -- Delete the resident record (this will cascade to related records)
  DELETE FROM public.residents WHERE id = p_resident_id;
  
  -- If there was a linked auth user, delete them too
  IF v_user_id IS NOT NULL THEN
    -- Delete from auth.users (requires service role, but we're in security definer)
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
END;
$$;