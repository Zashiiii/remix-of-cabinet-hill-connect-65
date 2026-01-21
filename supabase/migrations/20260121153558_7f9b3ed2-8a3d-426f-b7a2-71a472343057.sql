-- Drop existing function overloads and create a unified one
DROP FUNCTION IF EXISTS public.get_all_ecological_submissions_for_staff(boolean);
DROP FUNCTION IF EXISTS public.get_all_ecological_submissions_for_staff(text);

-- Create unified function with both parameters
CREATE OR REPLACE FUNCTION public.get_all_ecological_submissions_for_staff(
  p_status text DEFAULT NULL,
  p_include_deleted boolean DEFAULT false
)
RETURNS SETOF ecological_profile_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.ecological_profile_submissions
  WHERE (p_status IS NULL OR status = p_status)
    AND (p_include_deleted = TRUE OR deleted_at IS NULL)
  ORDER BY created_at DESC;
END;
$$;