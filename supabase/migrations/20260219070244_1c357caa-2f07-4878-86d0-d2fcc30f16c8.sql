-- Add custom_certificate_name column for "Others" certificate type
ALTER TABLE public.certificate_requests
ADD COLUMN custom_certificate_name text;