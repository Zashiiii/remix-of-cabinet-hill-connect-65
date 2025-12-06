-- =============================================
-- COMPREHENSIVE RLS SECURITY FIX
-- =============================================

-- 1. LOCK DOWN staff_users TABLE
-- Prevent credential exposure - only accessible via service role (edge functions)
DROP POLICY IF EXISTS "Staff users are viewable by authenticated" ON public.staff_users;
DROP POLICY IF EXISTS "Staff users can be managed" ON public.staff_users;

-- Block all direct client access - edge functions use service role which bypasses RLS
CREATE POLICY "Staff users service role only" 
ON public.staff_users FOR ALL USING (false);

-- 2. LOCK DOWN sessions TABLE
-- Prevent session hijacking - only accessible via service role (edge functions)
DROP POLICY IF EXISTS "Sessions are manageable" ON public.sessions;

-- Block all direct client access
CREATE POLICY "Sessions service role only" 
ON public.sessions FOR ALL USING (false);

-- 3. FIX residents TABLE RLS
-- Remove overly permissive policies, add proper role checks
DROP POLICY IF EXISTS "Allow registration verification queries" ON public.residents;
DROP POLICY IF EXISTS "Residents can be managed by staff" ON public.residents;
-- Note: "Residents can view own data" policy is kept - it's correct

-- Add proper staff management policy with role verification
CREATE POLICY "Staff can manage residents" 
ON public.residents FOR ALL USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
);

-- 4. FIX households TABLE RLS
-- Remove public access, add proper restrictions
DROP POLICY IF EXISTS "Households are viewable by everyone" ON public.households;
DROP POLICY IF EXISTS "Households can be managed by staff" ON public.households;

-- Household members can view their own household
CREATE POLICY "Households viewable by members" 
ON public.households FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.residents
    WHERE residents.household_id = households.id
    AND residents.user_id = auth.uid()
  )
);

-- Staff can manage all households
CREATE POLICY "Staff can manage households" 
ON public.households FOR ALL USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
);

-- 5. FIX incidents TABLE RLS
-- Remove permissive policies, add proper role checks
DROP POLICY IF EXISTS "Incidents viewable by staff" ON public.incidents;
DROP POLICY IF EXISTS "Incidents can be created by staff" ON public.incidents;
DROP POLICY IF EXISTS "Incidents can be updated by staff" ON public.incidents;

-- Only verified staff/admin can access incidents
CREATE POLICY "Incidents accessible by verified staff" 
ON public.incidents FOR ALL USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
) WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
);