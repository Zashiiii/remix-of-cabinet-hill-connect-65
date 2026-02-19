
-- Create certificate_types table
CREATE TABLE public.certificate_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificate_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read active certificate types (for forms)
CREATE POLICY "Active certificate types viewable by everyone"
ON public.certificate_types
FOR SELECT
USING (is_active = true);

-- Staff/admin can manage all certificate types
CREATE POLICY "Staff can manage certificate types"
ON public.certificate_types
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Seed default certificate types
INSERT INTO public.certificate_types (name) VALUES
  ('Certificate of Indigency'),
  ('Certificate of Residency'),
  ('Barangay Clearance'),
  ('Business Clearance'),
  ('Solo Parent Certification'),
  ('Good Moral');
