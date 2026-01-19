-- Add soft delete columns to ecological_profile_submissions
ALTER TABLE ecological_profile_submissions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by TEXT DEFAULT NULL;

-- Create function to soft delete an ecological submission
CREATE OR REPLACE FUNCTION public.soft_delete_ecological_submission(
  p_submission_id UUID,
  p_deleted_by TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ecological_profile_submissions
  SET 
    deleted_at = NOW(),
    deleted_by = p_deleted_by
  WHERE id = p_submission_id
    AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Create function to recover a soft-deleted ecological submission
CREATE OR REPLACE FUNCTION public.recover_ecological_submission(
  p_submission_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ecological_profile_submissions
  SET 
    deleted_at = NULL,
    deleted_by = NULL
  WHERE id = p_submission_id
    AND deleted_at IS NOT NULL;
  
  RETURN FOUND;
END;
$$;

-- Drop and recreate get_all_ecological_submissions_for_staff with include_deleted parameter
DROP FUNCTION IF EXISTS public.get_all_ecological_submissions_for_staff(BOOLEAN);
DROP FUNCTION IF EXISTS public.get_all_ecological_submissions_for_staff();

CREATE OR REPLACE FUNCTION public.get_all_ecological_submissions_for_staff(
  p_include_deleted BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  household_id UUID,
  household_number TEXT,
  respondent_name TEXT,
  address TEXT,
  purok TEXT,
  status TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  water_sources JSONB,
  water_storage JSONB,
  toilet_facilities JSONB,
  garbage_disposal JSONB,
  housing_type TEXT,
  housing_ownership TEXT,
  housing_materials JSONB,
  lighting_source TEXT,
  cooking_fuel TEXT,
  household_members JSONB,
  health_data JSONB,
  solo_parent_count INTEGER,
  pwd_count INTEGER,
  senior_citizen_count INTEGER,
  pregnant_count INTEGER,
  lactating_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.user_id,
    e.household_id,
    e.household_number,
    e.respondent_name,
    e.address,
    e.purok,
    e.status,
    e.reviewed_by,
    e.reviewed_at,
    e.rejection_reason,
    e.notes,
    e.water_sources,
    e.water_storage,
    e.toilet_facilities,
    e.garbage_disposal,
    e.housing_type,
    e.housing_ownership,
    e.housing_materials,
    e.lighting_source,
    e.cooking_fuel,
    e.household_members,
    e.health_data,
    e.solo_parent_count,
    e.pwd_count,
    e.senior_citizen_count,
    e.pregnant_count,
    e.lactating_count,
    e.created_at,
    e.updated_at,
    e.deleted_at,
    e.deleted_by
  FROM ecological_profile_submissions e
  WHERE (p_include_deleted = TRUE OR e.deleted_at IS NULL)
  ORDER BY e.created_at DESC;
END;
$$;