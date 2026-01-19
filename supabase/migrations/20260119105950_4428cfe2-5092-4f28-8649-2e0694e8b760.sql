-- Create the missing trigger to link auth users to residents
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix the existing unlinked resident record
UPDATE residents 
SET user_id = 'cc20463c-b98a-4e28-a2ab-733c058ccdd3'
WHERE email = 'test123@gmail.com' 
AND user_id IS NULL;