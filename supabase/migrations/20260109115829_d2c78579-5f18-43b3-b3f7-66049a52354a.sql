-- Add columns for resident-submitted incidents
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS submitted_by_resident_id uuid REFERENCES public.residents(id),
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS reviewed_by text,
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_incidents_approval_status ON public.incidents(approval_status);
CREATE INDEX IF NOT EXISTS idx_incidents_submitted_by_resident ON public.incidents(submitted_by_resident_id);

-- Enable realtime for incidents table
ALTER TABLE public.incidents REPLICA IDENTITY FULL;

-- Drop existing RLS policy to recreate with resident access
DROP POLICY IF EXISTS "Incidents accessible by verified staff" ON public.incidents;

-- Create new RLS policies

-- Staff/Admin can do everything
CREATE POLICY "Staff can manage all incidents"
ON public.incidents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Residents can create incidents (as pending)
CREATE POLICY "Residents can create incidents"
ON public.incidents
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND submitted_by_resident_id IN (
    SELECT id FROM public.residents WHERE user_id = auth.uid()
  )
);

-- Residents can view their own incidents
CREATE POLICY "Residents can view own incidents"
ON public.incidents
FOR SELECT
USING (
  submitted_by_resident_id IN (
    SELECT id FROM public.residents WHERE user_id = auth.uid()
  )
);

-- Add incidents to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;