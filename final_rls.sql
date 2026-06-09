-- Final RLS Cleanup & Fix
-- Run this in the Supabase Dashboard SQL Editor

-- 1. Drop ALL potentially conflicting policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Anyone can view property team" ON public.property_team;
DROP POLICY IF EXISTS "Owner full access team" ON public.property_team;
DROP POLICY IF EXISTS "Team view self" ON public.property_team;
DROP POLICY IF EXISTS "Owner manage team" ON public.property_team;
DROP POLICY IF EXISTS "Team view access properties" ON public.properties;

-- 2. Create the secure functions that bypass RLS loops
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

-- 3. Safely recreate the properties policy using the function
CREATE POLICY "Team view access properties" ON public.properties 
FOR SELECT USING (
  public.is_team_member(id)
);

-- 4. Safely recreate the team policy using the function
CREATE POLICY "Owner full access team" ON public.property_team 
FOR ALL USING (
  public.is_property_owner(property_id)
);

-- 5. Ensure the marketplace active properties policy is set
DROP POLICY IF EXISTS "Anyone can view active properties" ON public.properties;
CREATE POLICY "Anyone can view active properties" ON public.properties 
FOR SELECT USING (status = 'Active');
