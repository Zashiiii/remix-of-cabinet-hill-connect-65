-- Create RPC functions for staff to manage households (bypassing RLS since staff use custom auth)

-- Function to create a household
CREATE OR REPLACE FUNCTION public.staff_create_household(
  p_household_number text,
  p_house_number text DEFAULT NULL,
  p_street_purok text DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_barangay text DEFAULT 'Sample Barangay',
  p_city text DEFAULT 'Sample City',
  p_province text DEFAULT 'Sample Province',
  p_place_of_origin text DEFAULT NULL,
  p_ethnic_group text DEFAULT NULL,
  p_years_staying integer DEFAULT NULL,
  p_house_ownership text DEFAULT NULL,
  p_lot_ownership text DEFAULT NULL,
  p_dwelling_type text DEFAULT NULL,
  p_lighting_source text DEFAULT NULL,
  p_water_supply_level text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_id uuid;
BEGIN
  INSERT INTO public.households (
    household_number,
    house_number,
    street_purok,
    district,
    address,
    barangay,
    city,
    province,
    place_of_origin,
    ethnic_group,
    years_staying,
    house_ownership,
    lot_ownership,
    dwelling_type,
    lighting_source,
    water_supply_level
  ) VALUES (
    p_household_number,
    p_house_number,
    p_street_purok,
    p_district,
    p_address,
    p_barangay,
    p_city,
    p_province,
    p_place_of_origin,
    p_ethnic_group,
    p_years_staying,
    p_house_ownership,
    p_lot_ownership,
    p_dwelling_type,
    p_lighting_source,
    p_water_supply_level
  )
  RETURNING id INTO v_household_id;
  
  RETURN v_household_id;
END;
$$;

-- Function to update a household
CREATE OR REPLACE FUNCTION public.staff_update_household(
  p_household_id uuid,
  p_household_number text DEFAULT NULL,
  p_house_number text DEFAULT NULL,
  p_street_purok text DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_barangay text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_province text DEFAULT NULL,
  p_place_of_origin text DEFAULT NULL,
  p_ethnic_group text DEFAULT NULL,
  p_years_staying integer DEFAULT NULL,
  p_house_ownership text DEFAULT NULL,
  p_lot_ownership text DEFAULT NULL,
  p_dwelling_type text DEFAULT NULL,
  p_lighting_source text DEFAULT NULL,
  p_water_supply_level text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.households SET
    household_number = COALESCE(p_household_number, household_number),
    house_number = p_house_number,
    street_purok = p_street_purok,
    district = p_district,
    address = p_address,
    barangay = COALESCE(p_barangay, barangay),
    city = COALESCE(p_city, city),
    province = COALESCE(p_province, province),
    place_of_origin = p_place_of_origin,
    ethnic_group = p_ethnic_group,
    years_staying = p_years_staying,
    house_ownership = p_house_ownership,
    lot_ownership = p_lot_ownership,
    dwelling_type = p_dwelling_type,
    lighting_source = p_lighting_source,
    water_supply_level = p_water_supply_level,
    updated_at = now()
  WHERE id = p_household_id;
END;
$$;

-- Function to delete a household
CREATE OR REPLACE FUNCTION public.staff_delete_household(p_household_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First, unassign all residents from this household
  UPDATE public.residents SET
    household_id = NULL,
    is_head_of_household = false
  WHERE household_id = p_household_id;
  
  -- Then delete the household
  DELETE FROM public.households WHERE id = p_household_id;
END;
$$;

-- Function to get all households for staff (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_all_households_for_staff()
RETURNS SETOF public.households
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.households ORDER BY household_number;
END;
$$;

-- Function to get households with pagination and filtering for staff
CREATE OR REPLACE FUNCTION public.get_households_paginated_for_staff(
  p_search text DEFAULT NULL,
  p_purok_filter text DEFAULT NULL,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  household_number text,
  address text,
  barangay text,
  city text,
  province text,
  house_number text,
  street_purok text,
  district text,
  place_of_origin text,
  ethnic_group text,
  house_ownership text,
  lot_ownership text,
  dwelling_type text,
  lighting_source text,
  water_supply_level text,
  years_staying integer,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_count bigint;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO v_total_count
  FROM public.households h
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
      h.household_number ILIKE '%' || p_search || '%' OR
      h.address ILIKE '%' || p_search || '%' OR
      h.street_purok ILIKE '%' || p_search || '%')
    AND (p_purok_filter IS NULL OR p_purok_filter = '' OR p_purok_filter = 'all' OR 
      h.street_purok ILIKE '%' || p_purok_filter || '%');
  
  RETURN QUERY
  SELECT 
    h.id,
    h.household_number,
    h.address,
    h.barangay,
    h.city,
    h.province,
    h.house_number,
    h.street_purok,
    h.district,
    h.place_of_origin,
    h.ethnic_group,
    h.house_ownership,
    h.lot_ownership,
    h.dwelling_type,
    h.lighting_source,
    h.water_supply_level,
    h.years_staying,
    h.created_at,
    h.updated_at,
    v_total_count
  FROM public.households h
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
      h.household_number ILIKE '%' || p_search || '%' OR
      h.address ILIKE '%' || p_search || '%' OR
      h.street_purok ILIKE '%' || p_search || '%')
    AND (p_purok_filter IS NULL OR p_purok_filter = '' OR p_purok_filter = 'all' OR 
      h.street_purok ILIKE '%' || p_purok_filter || '%')
  ORDER BY h.household_number
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;