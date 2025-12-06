-- Create login_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address text NOT NULL,
    username text,
    attempted_at timestamp with time zone NOT NULL DEFAULT now(),
    success boolean NOT NULL DEFAULT false
);

-- Create index for efficient querying by IP and time
CREATE INDEX idx_login_attempts_ip_time ON public.login_attempts (ip_address, attempted_at DESC);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow inserts (no select/update/delete from client)
CREATE POLICY "Login attempts can be inserted" 
ON public.login_attempts 
FOR INSERT 
WITH CHECK (true);

-- Create function to check rate limit (returns remaining attempts, -1 if blocked)
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(p_ip_address text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    failed_count integer;
    last_attempt timestamp with time zone;
    block_duration interval := '15 minutes';
    max_attempts integer := 5;
BEGIN
    -- Count failed attempts in the last 15 minutes
    SELECT COUNT(*), MAX(attempted_at)
    INTO failed_count, last_attempt
    FROM public.login_attempts
    WHERE ip_address = p_ip_address
      AND success = false
      AND attempted_at > now() - block_duration;
    
    -- If blocked (5+ failed attempts), return -1
    IF failed_count >= max_attempts THEN
        RETURN -1;
    END IF;
    
    -- Return remaining attempts
    RETURN max_attempts - failed_count;
END;
$$;

-- Create function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_ip_address text, p_username text, p_success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.login_attempts (ip_address, username, success, attempted_at)
    VALUES (p_ip_address, p_username, p_success, now());
    
    -- Clean up old attempts (older than 24 hours)
    DELETE FROM public.login_attempts
    WHERE attempted_at < now() - interval '24 hours';
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, text, boolean) TO anon, authenticated;