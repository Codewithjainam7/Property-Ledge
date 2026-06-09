-- Add this to the end of supabase_schema.sql
-- Run this in the Supabase Dashboard to ensure users are automatically added to user_profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name, global_role)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1),
    SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', '') FROM (length(split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1)) + 2)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Owner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
