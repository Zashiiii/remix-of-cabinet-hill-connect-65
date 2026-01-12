-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create ecological profile submissions table for resident-submitted census data
CREATE TABLE public.ecological_profile_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  submitted_by_resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  
  -- Submission metadata
  submission_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  
  -- Review fields
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  staff_notes TEXT,
  
  -- Basic household information (editable by resident)
  household_number TEXT,
  address TEXT,
  house_number TEXT,
  street_purok TEXT,
  district TEXT,
  barangay TEXT DEFAULT 'Sample Barangay',
  city TEXT DEFAULT 'Sample City',
  province TEXT DEFAULT 'Sample Province',
  
  -- Housing and ownership
  years_staying INTEGER,
  place_of_origin TEXT,
  ethnic_group TEXT,
  house_ownership TEXT,
  lot_ownership TEXT,
  dwelling_type TEXT,
  lighting_source TEXT,
  water_supply_level TEXT,
  
  -- Multiple choice arrays
  water_storage JSONB DEFAULT '[]'::jsonb,
  food_storage_type JSONB DEFAULT '[]'::jsonb,
  toilet_facilities JSONB DEFAULT '[]'::jsonb,
  drainage_facilities JSONB DEFAULT '[]'::jsonb,
  garbage_disposal JSONB DEFAULT '[]'::jsonb,
  communication_services JSONB DEFAULT '[]'::jsonb,
  means_of_transport JSONB DEFAULT '[]'::jsonb,
  info_sources JSONB DEFAULT '[]'::jsonb,
  
  -- Household members data (JSONB array of member objects)
  household_members JSONB DEFAULT '[]'::jsonb,
  
  -- Health and census specific data
  health_data JSONB DEFAULT '{}'::jsonb,
  immunization_data JSONB DEFAULT '{}'::jsonb,
  education_data JSONB DEFAULT '{}'::jsonb,
  family_planning JSONB DEFAULT '{}'::jsonb,
  pregnant_data JSONB DEFAULT '{}'::jsonb,
  disability_data JSONB DEFAULT '{}'::jsonb,
  senior_data JSONB DEFAULT '{}'::jsonb,
  solo_parent_count INTEGER DEFAULT 0,
  pwd_count INTEGER DEFAULT 0,
  is_4ps_beneficiary BOOLEAN DEFAULT false,
  death_data JSONB DEFAULT '{}'::jsonb,
  food_production JSONB DEFAULT '{}'::jsonb,
  animals JSONB DEFAULT '{}'::jsonb,
  
  -- Additional information
  additional_notes TEXT,
  interview_date DATE,
  respondent_name TEXT,
  respondent_relation TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ecological_profile_submissions ENABLE ROW LEVEL SECURITY;

-- Residents can create submissions
CREATE POLICY "Residents can create ecological submissions"
ON public.ecological_profile_submissions
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  submitted_by_resident_id IN (
    SELECT id FROM public.residents WHERE user_id = auth.uid()
  )
);

-- Residents can view their own submissions
CREATE POLICY "Residents can view own ecological submissions"
ON public.ecological_profile_submissions
FOR SELECT
USING (
  submitted_by_resident_id IN (
    SELECT id FROM public.residents WHERE user_id = auth.uid()
  )
);

-- Residents can update their pending submissions
CREATE POLICY "Residents can update pending submissions"
ON public.ecological_profile_submissions
FOR UPDATE
USING (
  status = 'pending' AND
  submitted_by_resident_id IN (
    SELECT id FROM public.residents WHERE user_id = auth.uid()
  )
);

-- Staff and admin can manage all submissions
CREATE POLICY "Staff can manage all ecological submissions"
ON public.ecological_profile_submissions
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
);

-- Create updated_at trigger
CREATE TRIGGER update_ecological_submissions_updated_at
BEFORE UPDATE ON public.ecological_profile_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.ecological_profile_submissions;

-- Create RPC function to generate submission number
CREATE OR REPLACE FUNCTION public.generate_ecological_submission_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO current_count FROM public.ecological_profile_submissions;
  new_number := 'ECO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(current_count::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- Create RPC function for staff to get all ecological submissions
CREATE OR REPLACE FUNCTION public.get_all_ecological_submissions_for_staff(
  p_status TEXT DEFAULT NULL
)
RETURNS SETOF public.ecological_profile_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.ecological_profile_submissions
  WHERE (p_status IS NULL OR status = p_status)
  ORDER BY created_at DESC;
END;
$$;

-- Create RPC function for staff to approve/reject submissions
CREATE OR REPLACE FUNCTION public.review_ecological_submission(
  p_submission_id UUID,
  p_status TEXT,
  p_reviewed_by TEXT,
  p_rejection_reason TEXT DEFAULT NULL,
  p_staff_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ecological_profile_submissions
  SET 
    status = p_status,
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    rejection_reason = p_rejection_reason,
    staff_notes = p_staff_notes,
    updated_at = now()
  WHERE id = p_submission_id;
  
  RETURN FOUND;
END;
$$;

-- Create RPC function to apply approved submission to households table
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
  
  RETURN v_household_id;
END;
$$;

-- Create RPC to get pending ecological submissions count
CREATE OR REPLACE FUNCTION public.get_pending_ecological_submissions_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.ecological_profile_submissions WHERE status = 'pending';
$$;