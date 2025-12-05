-- Insert test households
INSERT INTO households (household_number, address, barangay, city, province, street_purok) VALUES
('HH-2024-001', '123 Main Street', 'Salud Mitra', 'Sample City', 'Sample Province', 'Purok 1'),
('HH-2024-002', '456 Secondary Road', 'Salud Mitra', 'Sample City', 'Sample Province', 'Purok 2'),
('HH-2024-003', '789 Third Avenue', 'Salud Mitra', 'Sample City', 'Sample Province', 'Purok 3')
ON CONFLICT DO NOTHING;

-- Insert unregistered test residents (without user_id)
INSERT INTO residents (first_name, middle_name, last_name, birth_date, household_id, gender, civil_status, contact_number) VALUES
('Maria', 'Santos', 'Cruz', '1990-05-15', (SELECT id FROM households WHERE household_number = 'HH-2024-001'), 'Female', 'Married', '09171234567'),
('Pedro', NULL, 'Reyes', '1985-08-22', (SELECT id FROM households WHERE household_number = 'HH-2024-001'), 'Male', 'Married', '09181234567'),
('Ana', 'Garcia', 'Santos', '1995-03-10', (SELECT id FROM households WHERE household_number = 'HH-2024-002'), 'Female', 'Single', '09191234567'),
('Jose', 'Miguel', 'Dela Cruz', '1988-12-01', (SELECT id FROM households WHERE household_number = 'HH-2024-003'), 'Male', 'Single', '09201234567');

-- Create function to verify resident and return their ID
CREATE OR REPLACE FUNCTION public.verify_resident_and_get_id(
  p_full_name text, 
  p_birth_date date, 
  p_household_number text
) RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id
  FROM public.residents r
  JOIN public.households h ON r.household_id = h.id
  WHERE LOWER(TRIM(CONCAT(r.first_name, ' ', COALESCE(r.middle_name || ' ', ''), r.last_name))) = LOWER(TRIM(p_full_name))
    AND r.birth_date = p_birth_date
    AND h.household_number = p_household_number
    AND r.user_id IS NULL
  LIMIT 1;
$$;

-- Update handle_new_user trigger to link existing residents
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_resident_id uuid;
BEGIN
  -- Check if we have a resident_id from signup metadata
  v_resident_id := (NEW.raw_user_meta_data->>'resident_id')::uuid;
  
  IF v_resident_id IS NOT NULL THEN
    -- Link existing resident to new user account
    UPDATE public.residents 
    SET 
      user_id = NEW.id,
      email = NEW.email,
      privacy_consent_given_at = NOW(),
      updated_at = NOW()
    WHERE id = v_resident_id AND user_id IS NULL;
  ELSE
    -- Fallback: Create new resident (for backwards compatibility)
    INSERT INTO public.residents (user_id, email, first_name, last_name, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), ' ', 1)),
      COALESCE(NEW.raw_user_meta_data->>'last_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2)),
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to process new user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;