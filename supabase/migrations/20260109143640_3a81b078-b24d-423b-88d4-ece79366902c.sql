-- Drop existing functions
DROP FUNCTION IF EXISTS public.staff_send_new_message(text, text, text, text);
DROP FUNCTION IF EXISTS public.staff_send_reply(text, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.staff_mark_message_read(uuid);

-- Recreate staff_send_new_message with proper staff validation
CREATE OR REPLACE FUNCTION public.staff_send_new_message(
  p_staff_id uuid,
  p_recipient_user_id uuid,
  p_subject text,
  p_content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_message_id uuid;
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
  
  INSERT INTO messages (sender_type, sender_id, recipient_type, recipient_id, subject, content)
  VALUES ('staff', p_staff_id::text, 'resident', p_recipient_user_id::text, p_subject, p_content)
  RETURNING id INTO new_message_id;
  
  RETURN new_message_id;
END;
$$;

-- Recreate staff_send_reply with proper staff validation
CREATE OR REPLACE FUNCTION public.staff_send_reply(
  p_staff_id uuid,
  p_recipient_id uuid,
  p_subject text,
  p_content text,
  p_parent_message_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_message_id uuid;
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
  
  INSERT INTO messages (sender_type, sender_id, recipient_type, recipient_id, subject, content, parent_message_id)
  VALUES ('staff', p_staff_id::text, 'resident', p_recipient_id::text, p_subject, p_content, p_parent_message_id)
  RETURNING id INTO new_message_id;
  
  RETURN new_message_id;
END;
$$;

-- Recreate staff_mark_message_read with proper staff validation
CREATE OR REPLACE FUNCTION public.staff_mark_message_read(
  p_staff_id uuid,
  p_message_id uuid
)
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
  
  UPDATE messages SET is_read = true WHERE id = p_message_id;
END;
$$;