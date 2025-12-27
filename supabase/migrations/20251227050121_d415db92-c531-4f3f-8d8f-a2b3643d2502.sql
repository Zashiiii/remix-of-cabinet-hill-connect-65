-- Create certificate_rate_limits table for persistent rate limiting
CREATE TABLE IF NOT EXISTS public.certificate_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for IP lookups
CREATE INDEX IF NOT EXISTS idx_certificate_rate_limits_ip ON public.certificate_rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_certificate_rate_limits_window ON public.certificate_rate_limits(window_start);

-- Enable RLS
ALTER TABLE public.certificate_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access (no public policies)
CREATE POLICY "Rate limits service role only" ON public.certificate_rate_limits
FOR ALL USING (false);

-- Function to check and update certificate submission rate limits
CREATE OR REPLACE FUNCTION public.check_certificate_rate_limit(p_ip_address text)
RETURNS TABLE(allowed boolean, remaining_requests integer, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window_minutes integer := 60;
  v_max_requests integer := 5;
  v_window_start timestamp with time zone;
  v_current_count integer;
  v_retry_seconds integer;
BEGIN
  -- Clean old records (older than window)
  DELETE FROM certificate_rate_limits 
  WHERE window_start < now() - (v_window_minutes * interval '1 minute');
  
  -- Check current rate limit record
  SELECT window_start, request_count INTO v_window_start, v_current_count
  FROM certificate_rate_limits
  WHERE ip_address = p_ip_address
    AND window_start > now() - (v_window_minutes * interval '1 minute')
  ORDER BY window_start DESC
  LIMIT 1;
  
  IF v_window_start IS NULL THEN
    -- No existing record, create new one
    INSERT INTO certificate_rate_limits (ip_address, request_count, window_start)
    VALUES (p_ip_address, 1, now());
    
    RETURN QUERY SELECT true, v_max_requests - 1, 0;
  ELSIF v_current_count >= v_max_requests THEN
    -- Rate limit exceeded
    v_retry_seconds := EXTRACT(EPOCH FROM (v_window_start + (v_window_minutes * interval '1 minute') - now()))::integer;
    RETURN QUERY SELECT false, 0, GREATEST(v_retry_seconds, 1);
  ELSE
    -- Update count
    UPDATE certificate_rate_limits 
    SET request_count = request_count + 1
    WHERE ip_address = p_ip_address 
      AND window_start = v_window_start;
    
    RETURN QUERY SELECT true, v_max_requests - v_current_count - 1, 0;
  END IF;
END;
$$;

-- Function to check tracking rate limits (prevents enumeration)
CREATE OR REPLACE FUNCTION public.check_tracking_rate_limit(p_ip_address text)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window_minutes integer := 5; -- 5 minute window
  v_max_requests integer := 10; -- 10 requests per 5 minutes
  v_recent_count integer;
BEGIN
  -- Count recent login attempts from this IP
  SELECT COUNT(*) INTO v_recent_count
  FROM login_attempts
  WHERE ip_address = p_ip_address
    AND attempted_at > now() - (v_window_minutes * interval '1 minute');
  
  IF v_recent_count >= v_max_requests THEN
    RETURN QUERY SELECT false, v_window_minutes * 60;
  ELSE
    -- Record this tracking attempt
    INSERT INTO login_attempts (ip_address, username, success, attempted_at)
    VALUES (p_ip_address, 'tracking_request', true, now());
    
    RETURN QUERY SELECT true, 0;
  END IF;
END;
$$;

-- Update get_pending_registration_count to require staff role
DROP FUNCTION IF EXISTS public.get_pending_registration_count();
CREATE OR REPLACE FUNCTION public.get_pending_registration_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;
  
  RETURN (SELECT COUNT(*)::integer FROM residents WHERE approval_status = 'pending' AND deleted_at IS NULL);
END;
$$;