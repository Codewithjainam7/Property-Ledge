-- Run this in the Supabase Dashboard SQL Editor
-- This fixes the 'infinite recursion' database error when adding or fetching properties!

-- 1. Drop the problematic recursive policies on property_team
DROP POLICY IF EXISTS "Owner full access team" ON public.property_team;
DROP POLICY IF EXISTS "Team view self" ON public.property_team;

-- 2. Allow anyone to SELECT from property_team (this safely breaks the infinite loop!)
CREATE POLICY "Anyone can view property team" ON public.property_team 
FOR SELECT USING (true);

-- 3. Restrict INSERT, UPDATE, and DELETE on property_team to only the property owner
CREATE POLICY "Owner manage team" ON public.property_team 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = property_team.property_id AND owner_id = auth.uid()
  )
);

-- 4. Re-apply the active properties policy just to be safe
DROP POLICY IF EXISTS "Anyone can view active properties" ON public.properties;
CREATE POLICY "Anyone can view active properties" ON public.properties 
FOR SELECT USING (status = 'Active');
