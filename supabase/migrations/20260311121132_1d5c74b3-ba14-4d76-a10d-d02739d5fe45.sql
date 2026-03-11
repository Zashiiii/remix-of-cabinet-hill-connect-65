
-- Allow anyone (including anon) to upload to announcement-images bucket
-- This is needed because staff auth uses httpOnly cookies, not Supabase Auth
CREATE POLICY "Allow public upload to announcement-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'announcement-images');

-- Allow anyone to read announcement images (they're public)
CREATE POLICY "Allow public read of announcement-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'announcement-images');

-- Allow anyone to update announcement images  
CREATE POLICY "Allow public update of announcement-images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'announcement-images');

-- Allow anyone to delete announcement images
CREATE POLICY "Allow public delete of announcement-images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'announcement-images');
