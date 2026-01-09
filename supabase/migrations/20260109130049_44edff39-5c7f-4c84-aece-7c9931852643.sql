-- Create RPC function for staff to create incidents
CREATE OR REPLACE FUNCTION staff_create_incident(
  p_incident_type text,
  p_incident_date timestamp with time zone,
  p_complainant_name text,
  p_complainant_address text DEFAULT NULL,
  p_complainant_contact text DEFAULT NULL,
  p_respondent_name text DEFAULT NULL,
  p_respondent_address text DEFAULT NULL,
  p_incident_location text DEFAULT NULL,
  p_incident_description text DEFAULT '',
  p_action_taken text DEFAULT NULL,
  p_reported_by text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_id uuid;
  v_incident_number text;
BEGIN
  -- Generate incident number
  v_incident_number := 'INC-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
  
  INSERT INTO incidents (
    incident_number,
    incident_date,
    incident_type,
    complainant_name,
    complainant_address,
    complainant_contact,
    respondent_name,
    respondent_address,
    incident_location,
    incident_description,
    action_taken,
    status,
    reported_by,
    approval_status,
    reviewed_by,
    reviewed_at
  ) VALUES (
    v_incident_number,
    p_incident_date,
    p_incident_type,
    p_complainant_name,
    p_complainant_address,
    p_complainant_contact,
    p_respondent_name,
    p_respondent_address,
    p_incident_location,
    p_incident_description,
    p_action_taken,
    'open',
    p_reported_by,
    'approved',
    p_reported_by,
    NOW()
  )
  RETURNING id INTO v_incident_id;
  
  RETURN v_incident_id;
END;
$$;

-- Create RPC function to update incident status (open/investigating/resolved/closed)
CREATE OR REPLACE FUNCTION staff_update_incident_status(
  p_incident_id uuid,
  p_status text,
  p_handled_by text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE incidents
  SET 
    status = p_status,
    handled_by = p_handled_by,
    resolution_date = CASE WHEN p_status = 'resolved' THEN NOW() ELSE resolution_date END,
    updated_at = NOW()
  WHERE id = p_incident_id;
END;
$$;