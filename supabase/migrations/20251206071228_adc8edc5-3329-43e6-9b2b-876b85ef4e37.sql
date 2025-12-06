-- Drop and recreate the SELECT policy to allow residents to view their own requests by email OR resident_id
DROP POLICY IF EXISTS "Certificate requests viewable by owner or admin" ON public.certificate_requests;

CREATE POLICY "Certificate requests viewable by owner or admin" 
ON public.certificate_requests 
FOR SELECT 
USING (
  -- Allow if email matches the authenticated user's email
  (email IS NOT NULL AND email = auth.jwt()->>'email')
  OR
  -- Allow if resident_id matches
  (resident_id IS NOT NULL AND resident_id IN (
    SELECT id FROM residents WHERE user_id = auth.uid()
  ))
  OR
  -- Allow admin/staff access
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  has_role(auth.uid(), 'staff'::app_role)
);