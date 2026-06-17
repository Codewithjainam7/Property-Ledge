-- 1. Insert existing users from auth.users into public.user_profiles (removing non-existent global_role)
INSERT INTO public.user_profiles (id, email, first_name, last_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'first_name', split_part(COALESCE(raw_user_meta_data->>'full_name', ''), ' ', 1)),
  COALESCE(raw_user_meta_data->>'last_name', SUBSTRING(COALESCE(raw_user_meta_data->>'full_name', '') FROM position(' ' IN COALESCE(raw_user_meta_data->>'full_name', '')) + 1))
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email;

-- 2. Make sure the trigger exists and is active for future signups (removing non-existent global_role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, first_name, last_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', split_part(COALESCE(new.raw_user_meta_data->>'full_name', ''), ' ', 1)),
    COALESCE(new.raw_user_meta_data->>'last_name', substring(new.raw_user_meta_data->>'full_name' from position(' ' in new.raw_user_meta_data->>'full_name') + 1)),
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix user_profiles RLS policy to allow all authenticated users to read profiles
-- This allows landowners and other team members to view team member names and emails
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles" 
ON public.user_profiles 
FOR SELECT 
TO authenticated 
USING (true);
