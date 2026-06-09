-- Run this in the Supabase Dashboard SQL Editor
-- This uses the official Supabase method to fix infinite recursion: Security Definer Functions

-- 1. Create a function that bypasses RLS to check team membership
CREATE OR REPLACE FUNCTION public.is_team_member(p_property_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.property_team 
    WHERE property_id = p_property_id 
    AND user_id = auth.uid() 
    AND can_view_property = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the recursive policy on properties
DROP POLICY IF EXISTS "Team view access properties" ON public.properties;

-- 3. Recreate it using the secure function instead of a direct table query
CREATE POLICY "Team view access properties" ON public.properties 
FOR SELECT USING (
  public.is_team_member(id)
);

-- 4. Do the same for property_team so the Owner can manage it safely
CREATE OR REPLACE FUNCTION public.is_property_owner(p_property_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = p_property_id 
    AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Drop the old recursive team policy
DROP POLICY IF EXISTS "Owner manage team" ON public.property_team;
DROP POLICY IF EXISTS "Owner full access team" ON public.property_team;

-- 6. Recreate the team policy securely
CREATE POLICY "Owner full access team" ON public.property_team 
FOR ALL USING (
  public.is_property_owner(property_id)
);
