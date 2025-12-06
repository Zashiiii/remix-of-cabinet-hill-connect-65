-- 1. Drop and recreate track_certificate_request with more fields
DROP FUNCTION IF EXISTS public.track_certificate_request(text);

CREATE FUNCTION public.track_certificate_request(p_control_number text)
 RETURNS TABLE(
   id uuid, 
   control_number text, 
   full_name text, 
   certificate_type text, 
   status text, 
   purpose text,
   notes text,
   rejection_reason text,
   created_at timestamp with time zone, 
   updated_at timestamp with time zone
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    cr.id,
    cr.control_number,
    cr.full_name,
    cr.certificate_type,
    cr.status,
    cr.purpose,
    cr.notes,
    cr.rejection_reason,
    cr.created_at,
    cr.updated_at
  FROM public.certificate_requests cr
  WHERE cr.control_number = p_control_number;
$function$;

-- 2. Create RPC for staff to retrieve messages (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_staff_messages(p_staff_id text)
RETURNS TABLE(
  id uuid,
  subject text,
  content text,
  sender_type text,
  sender_id text,
  recipient_type text,
  recipient_id text,
  is_read boolean,
  created_at timestamp with time zone,
  parent_message_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    m.id,
    m.subject,
    m.content,
    m.sender_type,
    m.sender_id,
    m.recipient_type,
    m.recipient_id,
    m.is_read,
    m.created_at,
    m.parent_message_id
  FROM public.messages m
  WHERE m.recipient_type = 'staff' AND m.recipient_id = p_staff_id
  ORDER BY m.created_at DESC;
$$;

-- 3. Create RPC for staff to retrieve all residents (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_all_residents_for_staff()
RETURNS TABLE(
  id uuid,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  birth_date date,
  gender text,
  civil_status text,
  contact_number text,
  email text,
  religion text,
  ethnic_group text,
  place_of_origin text,
  dialects_spoken jsonb,
  schooling_status text,
  education_attainment text,
  employment_status text,
  employment_category text,
  occupation text,
  monthly_income_cash text,
  monthly_income_kind text,
  livelihood_training text,
  relation_to_head text,
  is_head_of_household boolean,
  household_id uuid,
  user_id uuid,
  privacy_consent_given_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    r.id,
    r.first_name,
    r.middle_name,
    r.last_name,
    r.suffix,
    r.birth_date,
    r.gender,
    r.civil_status,
    r.contact_number,
    r.email,
    r.religion,
    r.ethnic_group,
    r.place_of_origin,
    r.dialects_spoken,
    r.schooling_status,
    r.education_attainment,
    r.employment_status,
    r.employment_category,
    r.occupation,
    r.monthly_income_cash,
    r.monthly_income_kind,
    r.livelihood_training,
    r.relation_to_head,
    r.is_head_of_household,
    r.household_id,
    r.user_id,
    r.privacy_consent_given_at,
    r.created_at,
    r.updated_at
  FROM public.residents r
  ORDER BY r.last_name ASC;
$$;

-- 4. Create RPC for counting residents (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_resident_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer FROM public.residents;
$$;

-- 5. Create RPC for staff to mark messages as read
CREATE OR REPLACE FUNCTION public.staff_mark_message_read(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.messages
  SET is_read = true
  WHERE id = p_message_id;
END;
$$;

-- 6. Create RPC for staff to send reply
CREATE OR REPLACE FUNCTION public.staff_send_reply(
  p_staff_id text,
  p_recipient_id text,
  p_subject text,
  p_content text,
  p_parent_message_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    content,
    parent_message_id
  ) VALUES (
    'staff',
    p_staff_id,
    'resident',
    p_recipient_id,
    p_subject,
    p_content,
    p_parent_message_id
  )
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$;