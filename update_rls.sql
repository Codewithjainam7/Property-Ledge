-- Run this in the Supabase Dashboard SQL Editor
-- This allows anyone (including Tenants) to view properties that are marked as 'Active' in the marketplace.

-- First, let's drop the old restrictive view policy just in case it conflicts
DROP POLICY IF EXISTS "Team view access properties" ON public.properties;

-- Allow the team to view properties they are assigned to (even if not active)
CREATE POLICY "Team view access properties" ON public.properties FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.property_team WHERE property_id = properties.id AND user_id = auth.uid() AND can_view_property = true)
);

-- Allow anyone to view active properties in the marketplace
CREATE POLICY "Anyone can view active properties" ON public.properties FOR SELECT USING (status = 'Active');
