-- Enhanced apply_ecological_submission_to_household function
-- Now processes household_members JSON and creates/updates residents

CREATE OR REPLACE FUNCTION public.apply_ecological_submission_to_household(
  p_submission_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission public.ecological_profile_submissions%ROWTYPE;
  v_household_id UUID;
  v_member JSONB;
  v_member_birth_date DATE;
  v_existing_resident_id UUID;
  v_member_first_name TEXT;
  v_member_middle_name TEXT;
  v_member_last_name TEXT;
BEGIN
  -- Get the submission
  SELECT * INTO v_submission FROM public.ecological_profile_submissions WHERE id = p_submission_id;
  
  IF v_submission IS NULL THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;
  
  IF v_submission.status != 'approved' THEN
    RAISE EXCEPTION 'Only approved submissions can be applied';
  END IF;
  
  -- Check if household exists
  IF v_submission.household_id IS NOT NULL THEN
    -- Update existing household
    UPDATE public.households SET
      household_number = COALESCE(v_submission.household_number, household_number),
      address = COALESCE(v_submission.address, address),
      house_number = COALESCE(v_submission.house_number, house_number),
      street_purok = COALESCE(v_submission.street_purok, street_purok),
      district = COALESCE(v_submission.district, district),
      years_staying = COALESCE(v_submission.years_staying, years_staying),
      place_of_origin = COALESCE(v_submission.place_of_origin, place_of_origin),
      ethnic_group = COALESCE(v_submission.ethnic_group, ethnic_group),
      house_ownership = COALESCE(v_submission.house_ownership, house_ownership),
      lot_ownership = COALESCE(v_submission.lot_ownership, lot_ownership),
      dwelling_type = COALESCE(v_submission.dwelling_type, dwelling_type),
      lighting_source = COALESCE(v_submission.lighting_source, lighting_source),
      water_supply_level = COALESCE(v_submission.water_supply_level, water_supply_level),
      water_storage = COALESCE(v_submission.water_storage, water_storage),
      food_storage_type = COALESCE(v_submission.food_storage_type, food_storage_type),
      toilet_facilities = COALESCE(v_submission.toilet_facilities, toilet_facilities),
      drainage_facilities = COALESCE(v_submission.drainage_facilities, drainage_facilities),
      garbage_disposal = COALESCE(v_submission.garbage_disposal, garbage_disposal),
      communication_services = COALESCE(v_submission.communication_services, communication_services),
      means_of_transport = COALESCE(v_submission.means_of_transport, means_of_transport),
      info_sources = COALESCE(v_submission.info_sources, info_sources),
      interview_date = COALESCE(v_submission.interview_date, interview_date),
      updated_at = now()
    WHERE id = v_submission.household_id;
    
    v_household_id := v_submission.household_id;
  ELSE
    -- Create new household
    INSERT INTO public.households (
      household_number, address, house_number, street_purok, district,
      barangay, city, province, years_staying, place_of_origin, ethnic_group,
      house_ownership, lot_ownership, dwelling_type, lighting_source, water_supply_level,
      water_storage, food_storage_type, toilet_facilities, drainage_facilities,
      garbage_disposal, communication_services, means_of_transport, info_sources,
      interview_date
    ) VALUES (
      v_submission.household_number, v_submission.address, v_submission.house_number,
      v_submission.street_purok, v_submission.district, v_submission.barangay,
      v_submission.city, v_submission.province, v_submission.years_staying,
      v_submission.place_of_origin, v_submission.ethnic_group, v_submission.house_ownership,
      v_submission.lot_ownership, v_submission.dwelling_type, v_submission.lighting_source,
      v_submission.water_supply_level, v_submission.water_storage, v_submission.food_storage_type,
      v_submission.toilet_facilities, v_submission.drainage_facilities, v_submission.garbage_disposal,
      v_submission.communication_services, v_submission.means_of_transport, v_submission.info_sources,
      v_submission.interview_date
    )
    RETURNING id INTO v_household_id;
    
    -- Update submission with new household_id
    UPDATE public.ecological_profile_submissions SET household_id = v_household_id WHERE id = p_submission_id;
  END IF;
  
  -- Process household members from JSON array
  IF v_submission.household_members IS NOT NULL AND jsonb_array_length(v_submission.household_members) > 0 THEN
    FOR v_member IN SELECT * FROM jsonb_array_elements(v_submission.household_members)
    LOOP
      -- Parse the full_name field into first, middle, last names
      -- Format expected: "First Middle Last" or "First Last"
      v_member_first_name := COALESCE(
        NULLIF(TRIM(split_part(v_member->>'full_name', ' ', 1)), ''),
        'Unknown'
      );
      
      -- Check if there are 3+ parts (first middle last) or 2 parts (first last)
      IF array_length(string_to_array(v_member->>'full_name', ' '), 1) >= 3 THEN
        v_member_middle_name := TRIM(split_part(v_member->>'full_name', ' ', 2));
        v_member_last_name := COALESCE(
          NULLIF(TRIM(array_to_string(
            (string_to_array(v_member->>'full_name', ' '))[3:],
            ' '
          )), ''),
          'Unknown'
        );
      ELSE
        v_member_middle_name := NULL;
        v_member_last_name := COALESCE(
          NULLIF(TRIM(split_part(v_member->>'full_name', ' ', 2)), ''),
          'Unknown'
        );
      END IF;
      
      -- Parse birth_date safely
      BEGIN
        v_member_birth_date := (v_member->>'birth_date')::DATE;
      EXCEPTION WHEN OTHERS THEN
        v_member_birth_date := NULL;
      END;
      
      -- Check if a resident with matching name and household already exists
      SELECT id INTO v_existing_resident_id
      FROM public.residents
      WHERE household_id = v_household_id
        AND LOWER(first_name) = LOWER(v_member_first_name)
        AND LOWER(last_name) = LOWER(v_member_last_name)
        AND deleted_at IS NULL
      LIMIT 1;
      
      IF v_existing_resident_id IS NOT NULL THEN
        -- Update existing resident
        UPDATE public.residents SET
          middle_name = COALESCE(v_member_middle_name, middle_name),
          gender = COALESCE(NULLIF(v_member->>'gender', ''), gender),
          birth_date = COALESCE(v_member_birth_date, birth_date),
          civil_status = COALESCE(NULLIF(v_member->>'civil_status', ''), civil_status),
          religion = COALESCE(NULLIF(v_member->>'religion', ''), religion),
          relation_to_head = COALESCE(NULLIF(v_member->>'relationship_to_head', ''), relation_to_head),
          is_head_of_household = COALESCE((v_member->>'relationship_to_head') = 'Head', is_head_of_household),
          schooling_status = COALESCE(NULLIF(v_member->>'schooling_status', ''), schooling_status),
          education_attainment = COALESCE(NULLIF(v_member->>'education_level', ''), education_attainment),
          employment_status = COALESCE(NULLIF(v_member->>'employment_status', ''), employment_status),
          occupation = COALESCE(NULLIF(v_member->>'occupation', ''), occupation),
          monthly_income_cash = COALESCE(NULLIF(v_member->>'monthly_income', ''), monthly_income_cash),
          updated_at = now()
        WHERE id = v_existing_resident_id;
      ELSE
        -- Insert new resident (without user_id - census only, not a system user)
        INSERT INTO public.residents (
          household_id,
          first_name,
          middle_name,
          last_name,
          gender,
          birth_date,
          civil_status,
          religion,
          relation_to_head,
          is_head_of_household,
          schooling_status,
          education_attainment,
          employment_status,
          occupation,
          monthly_income_cash,
          approval_status
        ) VALUES (
          v_household_id,
          v_member_first_name,
          v_member_middle_name,
          v_member_last_name,
          NULLIF(v_member->>'gender', ''),
          v_member_birth_date,
          NULLIF(v_member->>'civil_status', ''),
          NULLIF(v_member->>'religion', ''),
          NULLIF(v_member->>'relationship_to_head', ''),
          (v_member->>'relationship_to_head') = 'Head',
          NULLIF(v_member->>'schooling_status', ''),
          NULLIF(v_member->>'education_level', ''),
          NULLIF(v_member->>'employment_status', ''),
          NULLIF(v_member->>'occupation', ''),
          NULLIF(v_member->>'monthly_income', ''),
          'approved' -- Auto-approve since staff approved the submission
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN v_household_id;
END;
$$;