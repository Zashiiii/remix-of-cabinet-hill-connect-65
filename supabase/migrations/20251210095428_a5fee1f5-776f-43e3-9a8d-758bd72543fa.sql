-- Create RPC function to get residents for staff messaging (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_residents_for_messaging()
RETURNS TABLE(user_id uuid, full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.user_id,
    CONCAT(r.first_name, ' ', r.last_name) as full_name,
    r.email
  FROM public.residents r
  WHERE r.user_id IS NOT NULL
  ORDER BY r.last_name, r.first_name;
$$;

-- Create RPC function for staff to send new messages to residents
CREATE OR REPLACE FUNCTION public.staff_send_new_message(
  p_staff_id text,
  p_recipient_user_id text,
  p_subject text,
  p_content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id uuid;
BEGIN
  INSERT INTO public.messages (
    sender_type,
    sender_id,
    recipient_type,
    recipient_id,
    subject,
    content
  ) VALUES (
    'staff',
    p_staff_id,
    'resident',
    p_recipient_user_id,
    p_subject,
    p_content
  )
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$;