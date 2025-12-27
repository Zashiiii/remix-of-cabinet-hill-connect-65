-- First drop functions that have incompatible return types, then recreate with authorization checks

-- Drop functions with incompatible return types
DROP FUNCTION IF EXISTS public.get_all_residents_for_staff();
DROP FUNCTION IF EXISTS public.get_resident_count();
DROP FUNCTION IF EXISTS public.get_staff_messages(text);
DROP FUNCTION IF EXISTS public.staff_mark_message_read(uuid);
DROP FUNCTION IF EXISTS public.staff_send_reply(text, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.staff_approve_resident(uuid, text);
DROP FUNCTION IF EXISTS public.staff_reject_resident(uuid, text, text);
DROP FUNCTION IF EXISTS public.staff_update_request_status(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.staff_create_announcement(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.staff_update_announcement(uuid, text, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.staff_delete_announcement(uuid);
DROP FUNCTION IF EXISTS public.staff_send_new_message(text, text, text, text);
DROP FUNCTION IF EXISTS public.staff_delete_resident(uuid);
DROP FUNCTION IF EXISTS public.staff_restore_resident(uuid);
DROP FUNCTION IF EXISTS public.get_deleted_residents_for_staff();
DROP FUNCTION IF EXISTS public.get_pending_registrations();
DROP FUNCTION IF EXISTS public.get_all_announcements_for_staff();
DROP FUNCTION IF EXISTS public.get_staff_for_messaging();
DROP FUNCTION IF EXISTS public.get_residents_for_messaging();
DROP FUNCTION IF EXISTS public.get_pending_registration_count();
DROP FUNCTION IF EXISTS public.get_all_certificate_requests_for_staff(text);
DROP FUNCTION IF EXISTS public.get_pending_requests();

-- 1. get_all_residents_for_staff
CREATE FUNCTION public.get_all_residents_for_staff()
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
  occupation text,
  place_of_origin text,
  household_id uuid,
  is_head_of_household boolean,
  relation_to_head text,
  religion text,
  ethnic_group text,
  education_attainment text,
  schooling_status text,
  employment_status text,
  employment_category text,
  monthly_income_cash text,
  monthly_income_kind text,
  livelihood_training text,
  dialects_spoken jsonb,
  privacy_consent_given_at timestamp with time zone,
  user_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  RETURN QUERY 
  SELECT r.id, r.first_name, r.middle_name, r.last_name, r.suffix, r.birth_date,
         r.gender, r.civil_status, r.contact_number, r.email, r.occupation,
         r.place_of_origin, r.household_id, r.is_head_of_household, r.relation_to_head,
         r.religion, r.ethnic_group, r.education_attainment, r.schooling_status,
         r.employment_status, r.employment_category, r.monthly_income_cash,
         r.monthly_income_kind, r.livelihood_training, r.dialects_spoken,
         r.privacy_consent_given_at, r.user_id, r.created_at, r.updated_at
  FROM residents r
  WHERE r.deleted_at IS NULL AND r.approval_status = 'approved';
END;
$$;

-- 2. get_resident_count
CREATE FUNCTION public.get_resident_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  RETURN (SELECT COUNT(*)::integer FROM residents WHERE deleted_at IS NULL AND approval_status = 'approved');
END;
$$;

-- 3. get_staff_messages
CREATE FUNCTION public.get_staff_messages(p_staff_id text)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  RETURN QUERY 
  SELECT m.id, m.sender_type, m.sender_id, m.recipient_type, m.recipient_id,
         m.subject, m.content, m.is_read, m.parent_message_id, m.created_at
  FROM messages m
  WHERE (m.sender_type = 'staff' AND m.sender_id = p_staff_id)
     OR (m.recipient_type = 'staff' AND m.recipient_id = p_staff_id)
  ORDER BY m.created_at DESC;
END;
$$;

-- 4. staff_mark_message_read
CREATE FUNCTION public.staff_mark_message_read(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  UPDATE messages SET is_read = true WHERE id = p_message_id;
END;
$$;

-- 5. staff_send_reply
CREATE FUNCTION public.staff_send_reply(
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
  new_message_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  INSERT INTO messages (sender_type, sender_id, recipient_type, recipient_id, subject, content, parent_message_id)
  VALUES ('staff', p_staff_id, 'resident', p_recipient_id, p_subject, p_content, p_parent_message_id)
  RETURNING id INTO new_message_id;
  
  RETURN new_message_id;
END;
$$;

-- 6. staff_approve_resident
CREATE FUNCTION public.staff_approve_resident(p_resident_id uuid, p_approved_by text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  UPDATE residents 
  SET approval_status = 'approved', approved_at = now(), approved_by = p_approved_by
  WHERE id = p_resident_id;
END;
$$;

-- 7. staff_reject_resident
CREATE FUNCTION public.staff_reject_resident(p_resident_id uuid, p_rejected_by text, p_rejection_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  UPDATE residents 
  SET approval_status = 'rejected', approved_by = p_rejected_by
  WHERE id = p_resident_id;
END;
$$;

-- 8. staff_update_request_status
CREATE FUNCTION public.staff_update_request_status(
  p_request_id uuid,
  p_status text,
  p_processed_by text,
  p_notes text DEFAULT NULL
)
RETURNS SETOF certificate_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  UPDATE certificate_requests 
  SET status = p_status, processed_by = p_processed_by, notes = p_notes, updated_at = now()
  WHERE id = p_request_id;
  
  RETURN QUERY SELECT * FROM certificate_requests WHERE id = p_request_id;
END;
$$;

-- 9. staff_create_announcement
CREATE FUNCTION public.staff_create_announcement(
  p_title text,
  p_content text,
  p_title_tl text DEFAULT NULL,
  p_content_tl text DEFAULT NULL,
  p_type text DEFAULT 'info',
  p_created_by text DEFAULT NULL
)
RETURNS SETOF announcements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  INSERT INTO announcements (title, content, title_tl, content_tl, type, created_by)
  VALUES (p_title, p_content, p_title_tl, p_content_tl, p_type, p_created_by)
  RETURNING id INTO new_id;
  
  RETURN QUERY SELECT * FROM announcements WHERE id = new_id;
END;
$$;

-- 10. staff_update_announcement
CREATE FUNCTION public.staff_update_announcement(
  p_id uuid,
  p_title text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_title_tl text DEFAULT NULL,
  p_content_tl text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  UPDATE announcements SET
    title = COALESCE(p_title, title),
    content = COALESCE(p_content, content),
    title_tl = COALESCE(p_title_tl, title_tl),
    content_tl = COALESCE(p_content_tl, content_tl),
    type = COALESCE(p_type, type),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_id;
END;
$$;

-- 11. staff_delete_announcement
CREATE FUNCTION public.staff_delete_announcement(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  DELETE FROM announcements WHERE id = p_id;
END;
$$;

-- 12. staff_send_new_message
CREATE FUNCTION public.staff_send_new_message(
  p_staff_id text,
  p_recipient_user_id text,
  p_subject text,
  p_content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_message_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  INSERT INTO messages (sender_type, sender_id, recipient_type, recipient_id, subject, content)
  VALUES ('staff', p_staff_id, 'resident', p_recipient_user_id, p_subject, p_content)
  RETURNING id INTO new_message_id;
  
  RETURN new_message_id;
END;
$$;

-- 13. staff_delete_resident
CREATE FUNCTION public.staff_delete_resident(p_resident_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  UPDATE residents SET deleted_at = now() WHERE id = p_resident_id;
END;
$$;

-- 14. staff_restore_resident
CREATE FUNCTION public.staff_restore_resident(p_resident_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  UPDATE residents SET deleted_at = NULL, deleted_by = NULL WHERE id = p_resident_id;
END;
$$;

-- 15. get_deleted_residents_for_staff
CREATE FUNCTION public.get_deleted_residents_for_staff()
RETURNS TABLE(
  id uuid,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  email text,
  contact_number text,
  deleted_at timestamp with time zone,
  deleted_by text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  RETURN QUERY 
  SELECT r.id, r.first_name, r.middle_name, r.last_name, r.suffix, r.email, 
         r.contact_number, r.deleted_at, r.deleted_by
  FROM residents r
  WHERE r.deleted_at IS NOT NULL;
END;
$$;

-- 16. get_pending_registrations
CREATE FUNCTION public.get_pending_registrations()
RETURNS TABLE(
  id uuid,
  first_name text,
  middle_name text,
  last_name text,
  email text,
  contact_number text,
  birth_date date,
  place_of_origin text,
  approval_status text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  RETURN QUERY 
  SELECT r.id, r.first_name, r.middle_name, r.last_name, r.email, 
         r.contact_number, r.birth_date, r.place_of_origin, r.approval_status, r.created_at
  FROM residents r
  WHERE r.approval_status = 'pending' AND r.deleted_at IS NULL;
END;
$$;

-- 17. get_all_announcements_for_staff
CREATE FUNCTION public.get_all_announcements_for_staff()
RETURNS SETOF announcements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  RETURN QUERY SELECT * FROM announcements ORDER BY created_at DESC;
END;
$$;

-- 18. get_staff_for_messaging
CREATE FUNCTION public.get_staff_for_messaging()
RETURNS TABLE(
  id text,
  full_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  RETURN QUERY 
  SELECT s.id::text, s.full_name, s.role
  FROM staff_users s
  WHERE s.is_active = true;
END;
$$;

-- 19. get_residents_for_messaging
CREATE FUNCTION public.get_residents_for_messaging()
RETURNS TABLE(
  user_id text,
  full_name text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  RETURN QUERY 
  SELECT r.user_id::text, CONCAT(r.first_name, ' ', r.last_name)::text AS full_name, r.email
  FROM residents r
  WHERE r.user_id IS NOT NULL AND r.deleted_at IS NULL AND r.approval_status = 'approved';
END;
$$;

-- 20. get_pending_registration_count
CREATE FUNCTION public.get_pending_registration_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  RETURN (SELECT COUNT(*)::integer FROM residents WHERE approval_status = 'pending' AND deleted_at IS NULL);
END;
$$;

-- 21. get_all_certificate_requests_for_staff
CREATE FUNCTION public.get_all_certificate_requests_for_staff(p_status_filter text DEFAULT NULL)
RETURNS SETOF certificate_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  IF p_status_filter IS NULL OR p_status_filter = '' THEN
    RETURN QUERY SELECT * FROM certificate_requests ORDER BY created_at DESC;
  ELSE
    RETURN QUERY SELECT * FROM certificate_requests WHERE status = p_status_filter ORDER BY created_at DESC;
  END IF;
END;
$$;

-- 22. get_pending_requests
CREATE FUNCTION public.get_pending_requests()
RETURNS SETOF certificate_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  RETURN QUERY SELECT * FROM certificate_requests WHERE status = 'pending' ORDER BY created_at DESC;
END;
$$;