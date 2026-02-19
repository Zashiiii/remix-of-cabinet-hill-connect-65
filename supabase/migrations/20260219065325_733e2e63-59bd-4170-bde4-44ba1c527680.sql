
-- Add image_url column to announcements
ALTER TABLE public.announcements ADD COLUMN image_url text;

-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public) VALUES ('announcement-images', 'announcement-images', true);

-- Allow anyone to view announcement images (public bucket)
CREATE POLICY "Announcement images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcement-images');

-- Allow authenticated users with staff/admin role to upload
CREATE POLICY "Staff can upload announcement images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'announcement-images'
  AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Allow staff to delete announcement images
CREATE POLICY "Staff can delete announcement images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'announcement-images'
  AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);
