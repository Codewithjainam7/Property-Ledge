-- Run this in the Supabase Dashboard SQL Editor
-- This allows anyone to view user profiles (so tenants can see the landlord's name)

DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.user_profiles;

CREATE POLICY "Anyone can view user profiles" 
ON public.user_profiles 
FOR SELECT 
USING (true);
