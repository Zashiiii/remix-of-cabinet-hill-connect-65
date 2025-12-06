-- Fix messages table RLS - currently allows any authenticated user to read all messages

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Messages viewable by participants" ON public.messages;

-- Create proper SELECT policy that only allows participants to view their messages
-- For residents: can see messages where they are sender or recipient
-- For staff: can see messages involving them or have staff/admin role
CREATE POLICY "Messages viewable by participants" 
ON public.messages FOR SELECT USING (
  -- Resident can see their own messages (user_id matches sender_id or recipient_id)
  sender_id = auth.uid()::text OR 
  recipient_id = auth.uid()::text OR
  -- Staff/admin can see all messages for management purposes
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
);

-- Also fix the UPDATE policy to be more restrictive
DROP POLICY IF EXISTS "Messages can be updated" ON public.messages;

-- Only allow updating messages you're involved in (e.g., marking as read)
CREATE POLICY "Messages can be updated by participants" 
ON public.messages FOR UPDATE USING (
  recipient_id = auth.uid()::text OR
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'staff'::app_role)
);