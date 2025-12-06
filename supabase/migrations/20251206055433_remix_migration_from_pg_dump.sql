CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'staff',
    'user'
);


SET default_table_access_method = heap;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    title_tl text,
    content_tl text,
    type text DEFAULT 'info'::text,
    is_active boolean DEFAULT true,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: get_active_announcements(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_announcements() RETURNS SETOF public.announcements
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT * FROM public.announcements 
    WHERE is_active = true 
    ORDER BY created_at DESC;
$$;


--
-- Name: certificate_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificate_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    control_number text NOT NULL,
    certificate_type text NOT NULL,
    full_name text NOT NULL,
    contact_number text,
    email text,
    household_number text,
    birth_date date,
    purpose text,
    priority text DEFAULT 'normal'::text,
    preferred_pickup_date date,
    status text DEFAULT 'pending'::text,
    processed_by text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    rejection_reason text,
    uploaded_id_url text,
    resident_id uuid
);


--
-- Name: get_pending_requests(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pending_requests() RETURNS SETOF public.certificate_requests
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT * FROM public.certificate_requests 
    WHERE status = 'pending' 
    ORDER BY created_at ASC;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: track_certificate_request(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_certificate_request(p_control_number text) RETURNS TABLE(id uuid, control_number text, full_name text, certificate_type text, status text, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    id,
    control_number,
    full_name,
    certificate_type,
    status,
    created_at,
    updated_at
  FROM public.certificate_requests
  WHERE control_number = p_control_number;
$$;


--
-- Name: validate_session(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_session(session_token text) RETURNS TABLE(staff_user_id uuid, username text, full_name text, role text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT s.staff_user_id, su.username, su.full_name, su.role
    FROM public.sessions s
    JOIN public.staff_users su ON s.staff_user_id = su.id
    WHERE s.token = session_token 
      AND s.expires_at > now()
      AND su.is_active = true;
$$;


--
-- Name: verify_resident_and_get_id(text, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_resident_and_get_id(p_full_name text, p_birth_date date, p_household_number text) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: verify_resident_exists(text, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_resident_exists(p_full_name text, p_birth_date date, p_household_number text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    performed_by text NOT NULL,
    performed_by_type text NOT NULL,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_logs_performed_by_type_check CHECK ((performed_by_type = ANY (ARRAY['staff'::text, 'admin'::text, 'resident'::text, 'system'::text])))
);


--
-- Name: certificate_audit_trail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificate_audit_trail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid,
    action text NOT NULL,
    performed_by text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT certificate_audit_trail_action_check CHECK ((action = ANY (ARRAY['created'::text, 'submitted'::text, 'status_updated'::text, 'status_changed'::text, 'updated'::text, 'viewed'::text, 'Pending'::text, 'Processing'::text, 'Verifying'::text, 'Approved'::text, 'Rejected'::text, 'Ready for Pickup'::text, 'Released'::text, 'pending'::text, 'processing'::text, 'verifying'::text, 'approved'::text, 'rejected'::text, 'ready_for_pickup'::text, 'released'::text])))
);


--
-- Name: certificate_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificate_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    certificate_type text NOT NULL,
    template_content text NOT NULL,
    placeholders jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: health_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid,
    record_type text,
    description text,
    record_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: households; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.households (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_number text NOT NULL,
    address text,
    barangay text DEFAULT 'Sample Barangay'::text,
    city text DEFAULT 'Sample City'::text,
    province text DEFAULT 'Sample Province'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    house_number text,
    street_purok text,
    district text,
    years_staying integer,
    place_of_origin text,
    ethnic_group text,
    house_ownership text,
    lot_ownership text,
    dwelling_type text,
    lighting_source text,
    water_supply_level text,
    water_storage jsonb DEFAULT '[]'::jsonb,
    food_service jsonb DEFAULT '[]'::jsonb,
    household_storage jsonb DEFAULT '[]'::jsonb,
    food_storage_type jsonb DEFAULT '[]'::jsonb,
    toilet_facilities jsonb DEFAULT '[]'::jsonb,
    drainage_facilities jsonb DEFAULT '[]'::jsonb,
    garbage_disposal jsonb DEFAULT '[]'::jsonb,
    communication_services jsonb DEFAULT '[]'::jsonb,
    means_of_transport jsonb DEFAULT '[]'::jsonb,
    info_sources jsonb DEFAULT '[]'::jsonb,
    interview_date date
);


--
-- Name: immunization_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.immunization_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid,
    vaccine_name text NOT NULL,
    dose_number integer,
    date_administered date,
    administered_by text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_number text NOT NULL,
    incident_date timestamp with time zone NOT NULL,
    incident_type text NOT NULL,
    complainant_name text NOT NULL,
    complainant_address text,
    complainant_contact text,
    respondent_name text,
    respondent_address text,
    incident_location text,
    incident_description text NOT NULL,
    action_taken text,
    status text DEFAULT 'open'::text,
    reported_by text,
    handled_by text,
    resolution_date timestamp with time zone,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_type text NOT NULL,
    sender_id text NOT NULL,
    recipient_type text NOT NULL,
    recipient_id text NOT NULL,
    subject text,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    parent_message_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT messages_recipient_type_check CHECK ((recipient_type = ANY (ARRAY['resident'::text, 'staff'::text, 'admin'::text]))),
    CONSTRAINT messages_sender_type_check CHECK ((sender_type = ANY (ARRAY['resident'::text, 'staff'::text])))
);


--
-- Name: residents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.residents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    first_name text NOT NULL,
    middle_name text,
    last_name text NOT NULL,
    suffix text,
    birth_date date,
    gender text,
    civil_status text,
    contact_number text,
    email text,
    occupation text,
    is_head_of_household boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    relation_to_head text,
    religion text,
    schooling_status text,
    education_attainment text,
    employment_status text,
    employment_category text,
    monthly_income_cash text,
    monthly_income_kind text,
    livelihood_training text,
    dialects_spoken jsonb DEFAULT '[]'::jsonb,
    ethnic_group text,
    place_of_origin text,
    privacy_consent_given_at timestamp with time zone
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_user_id uuid,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    role text DEFAULT 'staff'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: certificate_audit_trail certificate_audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_audit_trail
    ADD CONSTRAINT certificate_audit_trail_pkey PRIMARY KEY (id);


--
-- Name: certificate_requests certificate_requests_control_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_requests
    ADD CONSTRAINT certificate_requests_control_number_key UNIQUE (control_number);


--
-- Name: certificate_requests certificate_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_requests
    ADD CONSTRAINT certificate_requests_pkey PRIMARY KEY (id);


--
-- Name: certificate_templates certificate_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_templates
    ADD CONSTRAINT certificate_templates_pkey PRIMARY KEY (id);


--
-- Name: health_records health_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_pkey PRIMARY KEY (id);


--
-- Name: households households_household_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_household_number_key UNIQUE (household_number);


--
-- Name: households households_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_pkey PRIMARY KEY (id);


--
-- Name: immunization_records immunization_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immunization_records
    ADD CONSTRAINT immunization_records_pkey PRIMARY KEY (id);


--
-- Name: incidents incidents_incident_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_incident_number_key UNIQUE (incident_number);


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: residents residents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residents
    ADD CONSTRAINT residents_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_key UNIQUE (token);


--
-- Name: staff_users staff_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_users
    ADD CONSTRAINT staff_users_pkey PRIMARY KEY (id);


--
-- Name: staff_users staff_users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_users
    ADD CONSTRAINT staff_users_username_key UNIQUE (username);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_residents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_residents_user_id ON public.residents USING btree (user_id);


--
-- Name: certificate_audit_trail certificate_audit_trail_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_audit_trail
    ADD CONSTRAINT certificate_audit_trail_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.certificate_requests(id) ON DELETE CASCADE;


--
-- Name: certificate_requests certificate_requests_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_requests
    ADD CONSTRAINT certificate_requests_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id);


--
-- Name: health_records health_records_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;


--
-- Name: immunization_records immunization_records_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immunization_records
    ADD CONSTRAINT immunization_records_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;


--
-- Name: messages messages_parent_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.messages(id);


--
-- Name: residents residents_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residents
    ADD CONSTRAINT residents_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE SET NULL;


--
-- Name: residents residents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residents
    ADD CONSTRAINT residents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_staff_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_staff_user_id_fkey FOREIGN KEY (staff_user_id) REFERENCES public.staff_users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can manage user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage user roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: announcements Announcements are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Announcements are viewable by everyone" ON public.announcements FOR SELECT USING ((is_active = true));


--
-- Name: announcements Announcements can be managed by staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Announcements can be managed by staff" ON public.announcements USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: certificate_requests Anyone can create certificate requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create certificate requests" ON public.certificate_requests FOR INSERT WITH CHECK (true);


--
-- Name: audit_logs Audit logs can be created; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Audit logs can be created" ON public.audit_logs FOR INSERT WITH CHECK (true);


--
-- Name: audit_logs Audit logs viewable by admin only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Audit logs viewable by admin only" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: certificate_requests Certificate requests viewable by owner or admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Certificate requests viewable by owner or admin" ON public.certificate_requests FOR SELECT USING ((((resident_id IS NOT NULL) AND (resident_id IN ( SELECT residents.id
   FROM public.residents
  WHERE (residents.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: health_records Health records viewable by owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Health records viewable by owner" ON public.health_records FOR SELECT USING ((resident_id IN ( SELECT residents.id
   FROM public.residents
  WHERE (residents.user_id = auth.uid()))));


--
-- Name: households Households viewable by members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Households viewable by members" ON public.households FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.residents
  WHERE ((residents.household_id = households.id) AND (residents.user_id = auth.uid())))));


--
-- Name: immunization_records Immunization viewable by owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Immunization viewable by owner" ON public.immunization_records FOR SELECT USING ((resident_id IN ( SELECT residents.id
   FROM public.residents
  WHERE (residents.user_id = auth.uid()))));


--
-- Name: incidents Incidents accessible by verified staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Incidents accessible by verified staff" ON public.incidents USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: messages Messages can be created by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Messages can be created by authenticated users" ON public.messages FOR INSERT WITH CHECK (((sender_id = (auth.uid())::text) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: messages Messages can be updated by participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Messages can be updated by participants" ON public.messages FOR UPDATE USING (((recipient_id = (auth.uid())::text) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: messages Messages viewable by participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Messages viewable by participants" ON public.messages FOR SELECT USING (((sender_id = (auth.uid())::text) OR (recipient_id = (auth.uid())::text) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: residents Residents can view own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Residents can view own data" ON public.residents FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: sessions Sessions service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sessions service role only" ON public.sessions USING (false);


--
-- Name: certificate_audit_trail Staff can create audit trail; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create audit trail" ON public.certificate_audit_trail FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: health_records Staff can manage health records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage health records" ON public.health_records USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: households Staff can manage households; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage households" ON public.households USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: immunization_records Staff can manage immunization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage immunization" ON public.immunization_records USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: residents Staff can manage residents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage residents" ON public.residents USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: certificate_requests Staff can update certificate requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update certificate requests" ON public.certificate_requests FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: certificate_audit_trail Staff can view audit trail; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view audit trail" ON public.certificate_audit_trail FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: staff_users Staff users service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff users service role only" ON public.staff_users USING (false);


--
-- Name: certificate_templates Templates managed by admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Templates managed by admin" ON public.certificate_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: certificate_templates Templates viewable by all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Templates viewable by all" ON public.certificate_templates FOR SELECT USING (true);


--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: certificate_audit_trail; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.certificate_audit_trail ENABLE ROW LEVEL SECURITY;

--
-- Name: certificate_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.certificate_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: certificate_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: health_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

--
-- Name: households; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

--
-- Name: immunization_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.immunization_records ENABLE ROW LEVEL SECURITY;

--
-- Name: incidents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: residents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


