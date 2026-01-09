-- Add column for incident photo evidence
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS photo_evidence_url text;

-- Create storage bucket for incident photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-photos', 'incident-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own incident photos
CREATE POLICY "Users can upload incident photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'incident-photos');

-- Allow public viewing of incident photos
CREATE POLICY "Incident photos are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'incident-photos');

-- Allow users to update their own uploads
CREATE POLICY "Users can update own incident photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'incident-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own incident photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'incident-photos' AND auth.uid()::text = (storage.foldername(name))[1]);