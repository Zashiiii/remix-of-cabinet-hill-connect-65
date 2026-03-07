
CREATE OR REPLACE FUNCTION public.search_residents_for_certificate(p_query text)
RETURNS TABLE(
  id uuid,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  email text,
  contact_number text,
  household_id uuid,
  household_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.first_name,
    r.middle_name,
    r.last_name,
    r.suffix,
    r.email,
    r.contact_number,
    r.household_id,
    h.household_number
  FROM residents r
  LEFT JOIN households h ON h.id = r.household_id
  WHERE r.approval_status = 'approved'
    AND r.deleted_at IS NULL
    AND (
      r.first_name ILIKE '%' || p_query || '%'
      OR r.last_name ILIKE '%' || p_query || '%'
      OR r.email ILIKE '%' || p_query || '%'
    )
  ORDER BY r.last_name, r.first_name
  LIMIT 10;
END;
$$;
