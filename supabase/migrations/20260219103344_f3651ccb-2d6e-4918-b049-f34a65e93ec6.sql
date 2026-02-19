
-- Create monitoring_reports table for RBI Form C
CREATE TABLE public.monitoring_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic Information
  region TEXT,
  province TEXT,
  city_municipality TEXT,
  barangay TEXT,
  total_inhabitants INTEGER DEFAULT 0,
  total_registered_voters INTEGER DEFAULT 0,
  total_households INTEGER DEFAULT 0,
  total_families INTEGER DEFAULT 0,
  average_household_size NUMERIC(5,2) DEFAULT 0,
  semester TEXT CHECK (semester IN ('1st', '2nd')),
  calendar_year INTEGER,
  
  -- Population by Age Bracket (stored as JSONB array)
  age_bracket_data JSONB DEFAULT '[]'::jsonb,
  
  -- Population by Sector (stored as JSONB)
  sector_data JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monitoring_reports ENABLE ROW LEVEL SECURITY;

-- Only admin can manage monitoring reports
CREATE POLICY "Admin can manage monitoring reports"
  ON public.monitoring_reports
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_monitoring_reports_updated_at
  BEFORE UPDATE ON public.monitoring_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
