-- Add deleted_at column for soft delete
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS deleted_by text DEFAULT NULL;

-- Update the staff_delete_resident function to soft delete
CREATE OR REPLACE FUNCTION public.staff_delete_resident(p_resident_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Soft delete by setting deleted_at timestamp
  UPDATE public.residents 
  SET 
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_resident_id;
END;
$$;

-- Create function to restore a deleted resident
CREATE OR REPLACE FUNCTION public.staff_restore_resident(p_resident_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.residents 
  SET 
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = NOW()
  WHERE id = p_resident_id;
END;
$$;

-- Create function to get deleted residents
CREATE OR REPLACE FUNCTION public.get_deleted_residents_for_staff()
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    r.id,
    r.first_name,
    r.middle_name,
    r.last_name,
    r.suffix,
    r.email,
    r.contact_number,
    r.deleted_at,
    r.deleted_by
  FROM public.residents r
  WHERE r.deleted_at IS NOT NULL
  ORDER BY r.deleted_at DESC;
$$;

-- Update get_all_residents_for_staff to exclude deleted residents
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
STABLE
SECURITY DEFINER
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
  WHERE r.deleted_at IS NULL
  ORDER BY r.last_name ASC;
$$;