-- Fix certificate_requests RLS policies to protect PII
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view certificate requests" ON public.certificate_requests;

-- Create RPC function for public certificate tracking (by control number only)
-- This allows tracking without exposing all data
CREATE OR REPLACE FUNCTION public.track_certificate_request(p_control_number text)
RETURNS TABLE (
  id uuid,
  control_number text,
  full_name text,
  certificate_type text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    control_number,
    full_name,
    certificate_type,
    status,
    created_at,
    updated_at
  FROM public.certificate_requests
  WHERE control_number = p_control_number;
$$;

-- Create proper SELECT policy for certificate requests
-- Only owners (via resident_id) or admins can view full records
CREATE POLICY "Certificate requests viewable by owner or admin" 
ON public.certificate_requests
FOR SELECT USING (
  -- Allow if resident_id matches authenticated user
  (resident_id IS NOT NULL AND resident_id IN (
    SELECT id FROM public.residents WHERE user_id = auth.uid()
  ))
  OR
  -- Allow if user has admin role
  public.has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Allow staff role as well
  public.has_role(auth.uid(), 'staff'::app_role)
);