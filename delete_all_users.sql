-- ⚠️ WARNING: This will permanently delete ALL users from your Supabase project.
-- This will also trigger cascading deletes for any properties, applications, or profiles linked to these users.

-- Delete all user profiles (if they don't cascade automatically)
DELETE FROM public.profiles;

-- Delete all authenticated users
DELETE FROM auth.users;
