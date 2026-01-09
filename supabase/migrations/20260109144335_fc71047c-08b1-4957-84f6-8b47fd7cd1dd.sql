-- Drop all versions of get_staff_messages to fix overloading issue
DROP FUNCTION IF EXISTS public.get_staff_messages(text);
DROP FUNCTION IF EXISTS public.get_staff_messages(uuid);

-- Recreate with UUID parameter only
CREATE OR REPLACE FUNCTION public.get_staff_messages(p_staff_id uuid)
RETURNS TABLE (
  id uuid,
  sender_type text,
  sender_id text,
  recipient_type text,
  recipient_id text,
  subject text,
  content text,
  is_read boolean,
  parent_message_id uuid,
  created_at timestamp with time zone
)
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
    WHERE staff_users.id = p_staff_id AND is_active = true
  ) INTO v_staff_exists;
  
  IF NOT v_staff_exists THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  -- Return messages where staff is recipient OR where it's a message from resident to staff
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_type,
    m.sender_id,
    m.recipient_type,
    m.recipient_id,
    m.subject,
    m.content,
    m.is_read,
    m.parent_message_id,
    m.created_at
  FROM messages m
  WHERE (m.recipient_type = 'staff')
     OR (m.sender_type = 'staff' AND m.sender_id = p_staff_id::text)
  ORDER BY m.created_at DESC;
END;
$$;