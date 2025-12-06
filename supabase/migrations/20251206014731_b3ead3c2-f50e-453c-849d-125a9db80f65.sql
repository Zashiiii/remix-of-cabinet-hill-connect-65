-- Fix Messages INSERT RLS policy to prevent sender impersonation
DROP POLICY IF EXISTS "Messages can be created" ON public.messages;

-- Create policy that validates sender_id matches the authenticated user
-- Staff/admin can also create messages (for system messages and replies)
CREATE POLICY "Messages can be created by authenticated users" 
ON public.messages FOR INSERT 
WITH CHECK (
  sender_id = auth.uid()::text 
  OR public.has_role(auth.uid(), 'admin'::app_role) 
  OR public.has_role(auth.uid(), 'staff'::app_role)
);