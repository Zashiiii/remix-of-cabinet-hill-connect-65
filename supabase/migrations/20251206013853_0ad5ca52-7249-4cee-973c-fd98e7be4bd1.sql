-- Fix announcements management policy - currently allows any authenticated user

-- Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "Announcements can be managed" ON public.announcements;

-- Create proper policy that only allows staff/admin to manage announcements
CREATE POLICY "Announcements can be managed by staff" 
ON public.announcements FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));