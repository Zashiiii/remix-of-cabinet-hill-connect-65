-- Fix health_records RLS - currently allows any authenticated user full access

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Health records manageable by staff" ON public.health_records;

-- Allow residents to view their own health records
CREATE POLICY "Health records viewable by owner" 
ON public.health_records FOR SELECT USING (
  resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid())
);

-- Staff/admin can manage all health records
CREATE POLICY "Staff can manage health records" 
ON public.health_records FOR ALL USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
);