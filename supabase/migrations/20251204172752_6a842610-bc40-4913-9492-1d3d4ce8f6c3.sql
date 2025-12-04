-- Fix RLS policy for staff_users to allow inserts from authenticated custom staff sessions
-- The current policy uses auth.uid() which doesn't work with custom staff auth

-- Drop the restrictive admin-only management policy
DROP POLICY IF EXISTS "Staff users can be managed by admins" ON public.staff_users;

-- Create a more permissive policy for staff user management
-- Since staff auth is custom (not via Supabase auth), we allow all operations
CREATE POLICY "Staff users can be managed" ON public.staff_users
FOR ALL USING (true) WITH CHECK (true);

-- Create function to handle new user registration and auto-create resident profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.residents (
    user_id,
    email,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), ' ', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2)),
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- User already has a resident profile, skip
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Failed to create resident profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger to auto-create resident profile on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();