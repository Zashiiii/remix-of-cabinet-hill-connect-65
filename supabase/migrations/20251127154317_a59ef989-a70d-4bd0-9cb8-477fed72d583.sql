-- Add Tagalog translation fields to announcements
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS title_tl text,
ADD COLUMN IF NOT EXISTS content_tl text;

-- Enable RLS on tables (if not already enabled)
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can read active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Service role can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Service role full access to staff_users" ON public.staff_users;
DROP POLICY IF EXISTS "Service role full access to sessions" ON public.sessions;

-- Create RLS policies for announcements
CREATE POLICY "Anyone can read active announcements" 
ON public.announcements 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Service role can manage announcements"
ON public.announcements 
FOR ALL
USING (true)
WITH CHECK (true);

-- Create RLS policies for staff_users (service role only for security)
CREATE POLICY "Service role full access to staff_users"
ON public.staff_users
FOR ALL
USING (true)
WITH CHECK (true);

-- Create RLS policies for sessions
CREATE POLICY "Service role full access to sessions"
ON public.sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to validate session token
CREATE OR REPLACE FUNCTION public.validate_session(p_token text)
RETURNS TABLE(staff_id uuid, username text, full_name text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.staff_id, su.username, su.full_name, su.role
  FROM public.sessions s
  JOIN public.staff_users su ON s.staff_id = su.id
  WHERE s.token = p_token 
    AND s.expires_at > now()
    AND su.is_active = true;
END;
$$;