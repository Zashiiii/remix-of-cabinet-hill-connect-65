-- Fix certificate_requests UPDATE policy - currently allows any authenticated user to update

-- Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Staff can update certificate requests" ON public.certificate_requests;

-- Create proper UPDATE policy that only allows staff/admin to update
CREATE POLICY "Staff can update certificate requests" 
ON public.certificate_requests FOR UPDATE 
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
);