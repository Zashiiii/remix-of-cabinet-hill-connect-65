-- Create function to get unread message count for staff
CREATE OR REPLACE FUNCTION public.get_staff_unread_message_count(p_staff_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_staff_exists boolean;
BEGIN
  -- Validate staff user exists and is active
  SELECT EXISTS (
    SELECT 1 FROM staff_users 
    WHERE id = p_staff_id AND is_active = true
  ) INTO v_staff_exists;
  
  IF NOT v_staff_exists THEN
    RETURN 0;
  END IF;
  
  -- Count unread messages where recipient is staff or sender type is resident
  SELECT COUNT(*)::integer INTO v_count
  FROM messages
  WHERE recipient_type = 'staff'
    AND is_read = false
    AND parent_message_id IS NULL;
  
  RETURN v_count;
END;
$$;

-- Create function to get unread message count for resident
CREATE OR REPLACE FUNCTION public.get_resident_unread_message_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Count unread messages for this resident
  SELECT COUNT(*)::integer INTO v_count
  FROM messages
  WHERE recipient_type = 'resident'
    AND recipient_id = p_user_id::text
    AND is_read = false
    AND parent_message_id IS NULL;
  
  RETURN v_count;
END;
$$;