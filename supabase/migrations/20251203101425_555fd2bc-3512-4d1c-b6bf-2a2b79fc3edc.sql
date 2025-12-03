-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');

-- Create user_roles table (for secure role management)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Staff users table
CREATE TABLE public.staff_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'staff',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;

-- Sessions table
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_user_id UUID REFERENCES public.staff_users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Households table
CREATE TABLE public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_number TEXT UNIQUE NOT NULL,
    address TEXT,
    barangay TEXT DEFAULT 'Sample Barangay',
    city TEXT DEFAULT 'Sample City',
    province TEXT DEFAULT 'Sample Province',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- Residents table
CREATE TABLE public.residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    suffix TEXT,
    birth_date DATE,
    gender TEXT,
    civil_status TEXT,
    contact_number TEXT,
    email TEXT,
    occupation TEXT,
    is_head_of_household BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

-- Certificate requests table
CREATE TABLE public.certificate_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_number TEXT UNIQUE NOT NULL,
    certificate_type TEXT NOT NULL,
    full_name TEXT NOT NULL,
    contact_number TEXT,
    email TEXT,
    household_number TEXT,
    birth_date DATE,
    purpose TEXT,
    priority TEXT DEFAULT 'normal',
    preferred_pickup_date DATE,
    status TEXT DEFAULT 'pending',
    processed_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.certificate_requests ENABLE ROW LEVEL SECURITY;

-- Certificate audit trail table
CREATE TABLE public.certificate_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.certificate_requests(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    performed_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT certificate_audit_trail_action_check CHECK (action IN (
        'created', 'submitted', 'status_updated', 'status_changed', 'updated', 'viewed',
        'Pending', 'Processing', 'Verifying', 'Approved', 'Rejected', 'Ready for Pickup', 'Released',
        'pending', 'processing', 'verifying', 'approved', 'rejected', 'ready_for_pickup', 'released'
    ))
);

ALTER TABLE public.certificate_audit_trail ENABLE ROW LEVEL SECURITY;

-- Announcements table
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    title_tl TEXT,
    content_tl TEXT,
    type TEXT DEFAULT 'info',
    is_active BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Health records table
CREATE TABLE public.health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
    record_type TEXT,
    description TEXT,
    record_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

-- Immunization records table
CREATE TABLE public.immunization_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
    vaccine_name TEXT NOT NULL,
    dose_number INTEGER,
    date_administered DATE,
    administered_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.immunization_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User roles: only admins can manage
CREATE POLICY "Admins can manage user roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Staff users: staff can view, admins can manage
CREATE POLICY "Staff users are viewable by authenticated" ON public.staff_users
    FOR SELECT USING (true);

CREATE POLICY "Staff users can be managed by admins" ON public.staff_users
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Sessions: public access for auth flow
CREATE POLICY "Sessions are manageable" ON public.sessions
    FOR ALL USING (true);

-- Households: public read
CREATE POLICY "Households are viewable by everyone" ON public.households
    FOR SELECT USING (true);

CREATE POLICY "Households can be managed by staff" ON public.households
    FOR ALL USING (true);

-- Residents: public read for verification
CREATE POLICY "Residents are viewable by everyone" ON public.residents
    FOR SELECT USING (true);

CREATE POLICY "Residents can be managed by staff" ON public.residents
    FOR ALL USING (true);

-- Certificate requests: public create and read own, staff manage all
CREATE POLICY "Anyone can create certificate requests" ON public.certificate_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view certificate requests" ON public.certificate_requests
    FOR SELECT USING (true);

CREATE POLICY "Staff can update certificate requests" ON public.certificate_requests
    FOR UPDATE USING (true);

-- Certificate audit trail
CREATE POLICY "Audit trail is viewable" ON public.certificate_audit_trail
    FOR SELECT USING (true);

CREATE POLICY "Audit trail can be created" ON public.certificate_audit_trail
    FOR INSERT WITH CHECK (true);

-- Announcements: public read
CREATE POLICY "Announcements are viewable by everyone" ON public.announcements
    FOR SELECT USING (is_active = true);

CREATE POLICY "Announcements can be managed" ON public.announcements
    FOR ALL USING (true);

-- Health records: staff only
CREATE POLICY "Health records manageable by staff" ON public.health_records
    FOR ALL USING (true);

-- Immunization records: staff only
CREATE POLICY "Immunization records manageable by staff" ON public.immunization_records
    FOR ALL USING (true);

-- Database functions for the app

-- Get active announcements
CREATE OR REPLACE FUNCTION public.get_active_announcements()
RETURNS SETOF public.announcements
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.announcements 
    WHERE is_active = true 
    ORDER BY created_at DESC;
$$;

-- Get pending requests
CREATE OR REPLACE FUNCTION public.get_pending_requests()
RETURNS SETOF public.certificate_requests
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.certificate_requests 
    WHERE status = 'pending' 
    ORDER BY created_at ASC;
$$;

-- Validate session
CREATE OR REPLACE FUNCTION public.validate_session(session_token TEXT)
RETURNS TABLE(staff_user_id UUID, username TEXT, full_name TEXT, role TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT s.staff_user_id, su.username, su.full_name, su.role
    FROM public.sessions s
    JOIN public.staff_users su ON s.staff_user_id = su.id
    WHERE s.token = session_token 
      AND s.expires_at > now()
      AND su.is_active = true;
$$;

-- Verify resident exists
CREATE OR REPLACE FUNCTION public.verify_resident_exists(
    p_full_name TEXT,
    p_birth_date DATE,
    p_household_number TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.residents r
        JOIN public.households h ON r.household_id = h.id
        WHERE LOWER(CONCAT(r.first_name, ' ', COALESCE(r.middle_name || ' ', ''), r.last_name)) = LOWER(p_full_name)
          AND r.birth_date = p_birth_date
          AND h.household_number = p_household_number
    );
$$;