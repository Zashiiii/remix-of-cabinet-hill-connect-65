-- Fix certificate_audit_trail RLS policies - restrict to staff/admin only
DROP POLICY IF EXISTS "Audit trail is viewable" ON public.certificate_audit_trail;
DROP POLICY IF EXISTS "Audit trail can be created" ON public.certificate_audit_trail;

-- Only staff/admin can view audit trail entries
CREATE POLICY "Staff can view audit trail" 
ON public.certificate_audit_trail FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

-- Only staff/admin can create audit trail entries
CREATE POLICY "Staff can create audit trail" 
ON public.certificate_audit_trail FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));