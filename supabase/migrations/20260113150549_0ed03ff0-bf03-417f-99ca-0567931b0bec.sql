-- Update staff_mark_message_read to also mark all replies in the conversation as read
CREATE OR REPLACE FUNCTION staff_mark_message_read(p_staff_id uuid, p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_exists boolean;
BEGIN
  -- Validate staff user exists and is active
  SELECT EXISTS (
    SELECT 1 FROM staff_users 
    WHERE id = p_staff_id AND is_active = true
  ) INTO v_staff_exists;
  
  IF NOT v_staff_exists THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  -- Mark the parent message as read
  UPDATE messages SET is_read = true WHERE id = p_message_id;
  
  -- Also mark all replies in this conversation as read
  UPDATE messages SET is_read = true WHERE parent_message_id = p_message_id;
END;
$$;