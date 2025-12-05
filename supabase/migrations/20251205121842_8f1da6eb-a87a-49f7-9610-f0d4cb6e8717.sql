-- Fix audit_logs RLS policy to actually check for admin role
DROP POLICY IF EXISTS "Audit logs viewable by admin" ON public.audit_logs;

-- Create proper admin-only policy using has_role function
CREATE POLICY "Audit logs viewable by admin only" ON public.audit_logs
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);