-- Add privacy consent timestamp to residents table
ALTER TABLE public.residents 
ADD COLUMN IF NOT EXISTS privacy_consent_given_at TIMESTAMPTZ DEFAULT NULL;