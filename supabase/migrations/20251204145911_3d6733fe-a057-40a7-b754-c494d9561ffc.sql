-- Phase 1: Database Schema Expansion for Census Form Mapping

-- =====================================================
-- 1.1 Expand households table with census fields
-- =====================================================
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS house_number text;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS street_purok text;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS years_staying integer;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS place_of_origin text;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS ethnic_group text;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS house_ownership text; -- Owned, Rented, Caretaker, Others
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS lot_ownership text;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS dwelling_type text; -- Permanent concrete, Semi Permanent, Temporary, Others
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS lighting_source text; -- Electricity, Kerosene, Solar, Others
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS water_supply_level text; -- Level I, II, III
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS water_storage jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS food_service jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS household_storage jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS food_storage_type jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS toilet_facilities jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS drainage_facilities jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS garbage_disposal jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS communication_services jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS means_of_transport jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS info_sources jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS interview_date date;

-- =====================================================
-- 1.2 Expand residents table with census fields
-- =====================================================
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS relation_to_head text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS religion text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS schooling_status text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS education_attainment text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS employment_status text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS employment_category text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS monthly_income_cash text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS monthly_income_kind text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS livelihood_training text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS dialects_spoken jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS ethnic_group text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS place_of_origin text;

-- Create index for user_id lookup
CREATE INDEX IF NOT EXISTS idx_residents_user_id ON public.residents(user_id);

-- =====================================================
-- 1.3 Create incidents/blotters table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number text NOT NULL UNIQUE,
  incident_date timestamptz NOT NULL,
  incident_type text NOT NULL,
  complainant_name text NOT NULL,
  complainant_address text,
  complainant_contact text,
  respondent_name text,
  respondent_address text,
  incident_location text,
  incident_description text NOT NULL,
  action_taken text,
  status text DEFAULT 'open',
  reported_by text,
  handled_by text,
  resolution_date timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Incidents viewable by staff" ON public.incidents
  FOR SELECT USING (true);

CREATE POLICY "Incidents can be created by staff" ON public.incidents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Incidents can be updated by staff" ON public.incidents
  FOR UPDATE USING (true);

-- =====================================================
-- 1.4 Create messages table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_type text NOT NULL CHECK (sender_type IN ('resident', 'staff')),
  sender_id text NOT NULL,
  recipient_type text NOT NULL CHECK (recipient_type IN ('resident', 'staff', 'admin')),
  recipient_id text NOT NULL,
  subject text,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  parent_message_id uuid REFERENCES public.messages(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages viewable by participants" ON public.messages
  FOR SELECT USING (true);

CREATE POLICY "Messages can be created" ON public.messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Messages can be updated" ON public.messages
  FOR UPDATE USING (true);

-- =====================================================
-- 1.5 Create certificate_templates table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  certificate_type text NOT NULL,
  template_content text NOT NULL,
  placeholders jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates viewable by all" ON public.certificate_templates
  FOR SELECT USING (true);

CREATE POLICY "Templates managed by admin" ON public.certificate_templates
  FOR ALL USING (true);

-- =====================================================
-- 1.6 Create audit_logs table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  performed_by text NOT NULL,
  performed_by_type text NOT NULL CHECK (performed_by_type IN ('staff', 'admin', 'resident', 'system')),
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs viewable by admin" ON public.audit_logs
  FOR SELECT USING (true);

CREATE POLICY "Audit logs can be created" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 1.7 Add rejection_reason to certificate_requests
-- =====================================================
ALTER TABLE public.certificate_requests ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.certificate_requests ADD COLUMN IF NOT EXISTS uploaded_id_url text;
ALTER TABLE public.certificate_requests ADD COLUMN IF NOT EXISTS resident_id uuid REFERENCES public.residents(id);

-- =====================================================
-- 1.8 Create storage bucket for ID uploads
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-documents', 'id-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for id-documents bucket
CREATE POLICY "Anyone can upload ID documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'id-documents');

CREATE POLICY "Staff can view ID documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'id-documents');

-- =====================================================
-- 1.9 Insert default certificate templates
-- =====================================================
INSERT INTO public.certificate_templates (name, certificate_type, template_content, placeholders, created_by)
VALUES 
  ('Barangay Clearance', 'barangay-clearance', 
   '<div style="text-align: center; font-family: Arial;">
    <h2>REPUBLIC OF THE PHILIPPINES</h2>
    <h3>BARANGAY {{barangay_name}}</h3>
    <h3>{{city}}, {{province}}</h3>
    <hr/>
    <h1>BARANGAY CLEARANCE</h1>
    <p>TO WHOM IT MAY CONCERN:</p>
    <p>This is to certify that <strong>{{full_name}}</strong>, of legal age, {{civil_status}}, Filipino citizen, and a resident of {{address}} is known to me to be a person of good moral character and a law-abiding citizen of the community.</p>
    <p>This certification is issued upon the request of the above-named person for {{purpose}} purposes.</p>
    <p>Issued this {{date_issued}} at Barangay {{barangay_name}}, {{city}}, {{province}}.</p>
    <br/><br/>
    <p><strong>{{punong_barangay}}</strong></p>
    <p>Punong Barangay</p>
    <p>Control No: {{control_number}}</p>
    </div>',
   '["full_name", "civil_status", "address", "purpose", "date_issued", "barangay_name", "city", "province", "punong_barangay", "control_number"]'::jsonb,
   'system'),
  ('Certificate of Indigency', 'certificate-of-indigency',
   '<div style="text-align: center; font-family: Arial;">
    <h2>REPUBLIC OF THE PHILIPPINES</h2>
    <h3>BARANGAY {{barangay_name}}</h3>
    <h3>{{city}}, {{province}}</h3>
    <hr/>
    <h1>CERTIFICATE OF INDIGENCY</h1>
    <p>TO WHOM IT MAY CONCERN:</p>
    <p>This is to certify that <strong>{{full_name}}</strong>, {{age}} years old, {{civil_status}}, Filipino citizen, and a resident of {{address}} belongs to an indigent family in this Barangay.</p>
    <p>This certification is issued upon the request of the above-named person for {{purpose}} purposes.</p>
    <p>Issued this {{date_issued}} at Barangay {{barangay_name}}, {{city}}, {{province}}.</p>
    <br/><br/>
    <p><strong>{{punong_barangay}}</strong></p>
    <p>Punong Barangay</p>
    <p>Control No: {{control_number}}</p>
    </div>',
   '["full_name", "age", "civil_status", "address", "purpose", "date_issued", "barangay_name", "city", "province", "punong_barangay", "control_number"]'::jsonb,
   'system'),
  ('Certificate of Residency', 'certificate-of-residency',
   '<div style="text-align: center; font-family: Arial;">
    <h2>REPUBLIC OF THE PHILIPPINES</h2>
    <h3>BARANGAY {{barangay_name}}</h3>
    <h3>{{city}}, {{province}}</h3>
    <hr/>
    <h1>CERTIFICATE OF RESIDENCY</h1>
    <p>TO WHOM IT MAY CONCERN:</p>
    <p>This is to certify that <strong>{{full_name}}</strong>, {{age}} years old, {{civil_status}}, Filipino citizen, is a bonafide resident of {{address}} for {{years_of_residency}} years.</p>
    <p>This certification is issued upon the request of the above-named person for {{purpose}} purposes.</p>
    <p>Issued this {{date_issued}} at Barangay {{barangay_name}}, {{city}}, {{province}}.</p>
    <br/><br/>
    <p><strong>{{punong_barangay}}</strong></p>
    <p>Punong Barangay</p>
    <p>Control No: {{control_number}}</p>
    </div>',
   '["full_name", "age", "civil_status", "address", "years_of_residency", "purpose", "date_issued", "barangay_name", "city", "province", "punong_barangay", "control_number"]'::jsonb,
   'system')
ON CONFLICT DO NOTHING;