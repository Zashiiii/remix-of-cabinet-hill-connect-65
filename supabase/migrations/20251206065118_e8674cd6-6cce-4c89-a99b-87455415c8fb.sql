-- Add approval_status column to residents table
ALTER TABLE public.residents 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';

-- Add approved_by and approved_at columns
ALTER TABLE public.residents 
ADD COLUMN IF NOT EXISTS approved_by text,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Create function for resident self-registration (bypasses RLS)
CREATE OR REPLACE FUNCTION public.register_new_resident(
  p_first_name text,
  p_last_name text,
  p_middle_name text,
  p_email text,
  p_birth_date date,
  p_contact_number text,
  p_address text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_resident_id uuid;
BEGIN
  INSERT INTO public.residents (
    first_name,
    last_name,
    middle_name,
    email,
    birth_date,
    contact_number,
    place_of_origin,
    approval_status,
    privacy_consent_given_at,
    created_at,
    updated_at
  ) VALUES (
    p_first_name,
    p_last_name,
    p_middle_name,
    p_email,
    p_birth_date,
    p_contact_number,
    p_address,
    'pending',
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_resident_id;
  
  RETURN v_resident_id;
END;
$$;

-- Create function to approve resident registration
CREATE OR REPLACE FUNCTION public.staff_approve_resident(
  p_resident_id uuid,
  p_approved_by text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.residents
  SET 
    approval_status = 'approved',
    approved_by = p_approved_by,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_resident_id;
END;
$$;

-- Create function to reject resident registration
CREATE OR REPLACE FUNCTION public.staff_reject_resident(
  p_resident_id uuid,
  p_rejected_by text,
  p_rejection_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.residents
  SET 
    approval_status = 'rejected',
    approved_by = p_rejected_by,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_resident_id;
END;
$$;

-- Create function to get pending resident registrations
CREATE OR REPLACE FUNCTION public.get_pending_registrations()
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  middle_name text,
  email text,
  birth_date date,
  contact_number text,
  place_of_origin text,
  approval_status text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    r.id,
    r.first_name,
    r.last_name,
    r.middle_name,
    r.email,
    r.birth_date,
    r.contact_number,
    r.place_of_origin,
    r.approval_status,
    r.created_at
  FROM public.residents r
  WHERE r.approval_status = 'pending'
  ORDER BY r.created_at ASC;
$$;

-- Update handle_new_user to NOT require existing resident
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_resident_id uuid;
BEGIN
  -- Check if we have a resident_id from signup metadata
  v_resident_id := (NEW.raw_user_meta_data->>'resident_id')::uuid;
  
  IF v_resident_id IS NOT NULL THEN
    -- Link existing resident to new user account
    UPDATE public.residents 
    SET 
      user_id = NEW.id,
      email = NEW.email,
      updated_at = NOW()
    WHERE id = v_resident_id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to process new user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;