-- Fix announcements RLS policies to allow staff to manage announcements
DROP POLICY IF EXISTS "Service role can manage announcements" ON announcements;

-- Allow anyone to insert announcements (staff auth handled at app level)
CREATE POLICY "Allow authenticated insert announcements" 
ON announcements FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update announcements
CREATE POLICY "Allow authenticated update announcements" 
ON announcements FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Allow anyone to delete announcements (soft delete by setting is_active=false)
CREATE POLICY "Allow authenticated delete announcements" 
ON announcements FOR DELETE 
USING (true);

-- Add index for better query performance on certificate requests
CREATE INDEX IF NOT EXISTS idx_certificate_requests_status ON certificate_requests(status);
CREATE INDEX IF NOT EXISTS idx_certificate_requests_processed_date ON certificate_requests(processed_date DESC);

-- Add comment to clarify status values
COMMENT ON COLUMN certificate_requests.status IS 'Possible values: Pending, Verifying, Approved, Rejected';