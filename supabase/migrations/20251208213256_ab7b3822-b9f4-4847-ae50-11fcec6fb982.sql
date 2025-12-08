-- Create trigger on auth.users to link residents on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      updated_at = NOW()
    WHERE id = v_resident_id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to process new user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();