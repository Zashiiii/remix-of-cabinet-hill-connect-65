-- Create function for staff to get ecological submission by household number
CREATE OR REPLACE FUNCTION public.get_ecological_submission_by_household(p_household_number TEXT)
RETURNS SETOF ecological_profile_submissions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM ecological_profile_submissions
  WHERE household_number = p_household_number
    AND status = 'approved'
  ORDER BY reviewed_at DESC NULLS LAST, created_at DESC
  LIMIT 1;
$$;