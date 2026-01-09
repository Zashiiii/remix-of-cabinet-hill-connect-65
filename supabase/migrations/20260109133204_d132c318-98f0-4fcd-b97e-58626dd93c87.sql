-- Drop the existing functions first
DROP FUNCTION IF EXISTS public.get_all_residents_for_staff();
DROP FUNCTION IF EXISTS public.get_deleted_residents_for_staff();
DROP FUNCTION IF EXISTS public.staff_delete_resident(uuid);
DROP FUNCTION IF EXISTS public.staff_restore_resident(uuid);

-- Recreate get_all_residents_for_staff function with SECURITY DEFINER
CREATE FUNCTION public.get_all_residents_for_staff()
RETURNS TABLE (
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
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
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
    r.created_at,
    r.updated_at
  FROM residents r
  WHERE r.deleted_at IS NULL
    AND r.approval_status = 'approved'
  ORDER BY r.last_name, r.first_name;
END;
$$;

-- Recreate get_deleted_residents_for_staff function
CREATE FUNCTION public.get_deleted_residents_for_staff()
RETURNS TABLE (
  id uuid,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  email text,
  contact_number text,
  deleted_at timestamptz,
  deleted_by text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
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
  FROM residents r
  WHERE r.deleted_at IS NOT NULL
  ORDER BY r.deleted_at DESC;
END;
$$;

-- Recreate staff_delete_resident function
CREATE FUNCTION public.staff_delete_resident(p_resident_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE residents
  SET deleted_at = now(),
      deleted_by = 'staff'
  WHERE id = p_resident_id;
END;
$$;

-- Recreate staff_restore_resident function
CREATE FUNCTION public.staff_restore_resident(p_resident_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE residents
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_resident_id;
END;
$$;