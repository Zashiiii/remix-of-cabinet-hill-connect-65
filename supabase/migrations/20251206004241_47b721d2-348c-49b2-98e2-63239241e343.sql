-- Fix immunization_records RLS - currently allows any authenticated user full access

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Immunization records manageable by staff" ON public.immunization_records;

-- Allow residents to view their own immunization records
CREATE POLICY "Immunization viewable by owner" 
ON public.immunization_records FOR SELECT USING (
  resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid())
);

-- Staff/admin can manage all immunization records
CREATE POLICY "Staff can manage immunization" 
ON public.immunization_records FOR ALL USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
);