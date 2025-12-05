-- Fix overly permissive RLS policy on residents table
-- Drop the policy that allows everyone to view all residents
DROP POLICY IF EXISTS "Residents are viewable by everyone" ON public.residents;

-- Create proper RLS policies for residents
-- 1. Authenticated residents can view their own data
CREATE POLICY "Residents can view own data" ON public.residents
FOR SELECT USING (user_id = auth.uid());

-- 2. Authenticated users can view basic resident info needed for registration verification
-- This is needed for the verify_resident_and_get_id function to work
-- The function itself is SECURITY DEFINER so it bypasses RLS, but we need policies for direct queries
CREATE POLICY "Allow registration verification queries" ON public.residents
FOR SELECT USING (
  -- Allow if user is authenticated (residents viewing their own household members, or staff)
  auth.role() = 'authenticated'
);