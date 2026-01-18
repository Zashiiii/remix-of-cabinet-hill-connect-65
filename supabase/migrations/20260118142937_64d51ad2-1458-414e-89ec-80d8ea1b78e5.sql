-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Residents can update pending submissions" ON public.ecological_profile_submissions;

-- Create a new policy that allows residents to update their own submissions regardless of status
CREATE POLICY "Residents can update own submissions" 
ON public.ecological_profile_submissions 
FOR UPDATE 
USING (
  submitted_by_resident_id IN (
    SELECT residents.id
    FROM residents
    WHERE residents.user_id = auth.uid()
  )
);