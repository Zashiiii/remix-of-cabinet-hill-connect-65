-- Fix certificate_templates management policy - currently allows any authenticated user

-- Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "Templates managed by admin" ON public.certificate_templates;

-- Create proper policy that only allows admin to manage templates
CREATE POLICY "Templates managed by admin" 
ON public.certificate_templates FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));