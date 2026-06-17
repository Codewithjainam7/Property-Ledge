-- ============================================================
-- PROPERTY LEDGE — RLS Policies & Database Fixes
-- Run this script in the Supabase Dashboard SQL Editor to:
-- 1. Fix the buggy is_team_member function that checked a non-existent column
-- 2. Grant team members permissions to view/manage tenants based on RBAC
-- 3. Grant team members permissions to manage leases based on RBAC
-- ============================================================

-- ─── 1. Fix public.is_team_member Function ──────────────────
CREATE OR REPLACE FUNCTION public.is_team_member(p_property_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.property_team 
    WHERE property_id = p_property_id 
    AND user_id = auth.uid() 
    AND (permissions->>'can_view_property')::boolean = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── 2. Update Tenants Table RLS Policies ────────────────────
-- Drop existing team policies on tenants if they exist
DROP POLICY IF EXISTS "Team view access tenants" ON public.tenants;
DROP POLICY IF EXISTS "Team insert access tenants" ON public.tenants;
DROP POLICY IF EXISTS "Team update access tenants" ON public.tenants;
DROP POLICY IF EXISTS "Team delete access tenants" ON public.tenants;

-- Create team access policies for tenants
CREATE POLICY "Team view access tenants" ON public.tenants 
FOR SELECT USING (
  public.is_team_member(property_id)
);

CREATE POLICY "Team insert access tenants" ON public.tenants 
FOR INSERT WITH CHECK (
  public.has_property_permission(property_id, 'can_manage_tenants')
);

CREATE POLICY "Team update access tenants" ON public.tenants 
FOR UPDATE USING (
  public.has_property_permission(property_id, 'can_manage_tenants')
) WITH CHECK (
  public.has_property_permission(property_id, 'can_manage_tenants')
);

CREATE POLICY "Team delete access tenants" ON public.tenants 
FOR DELETE USING (
  public.has_property_permission(property_id, 'can_manage_tenants')
);


-- ─── 3. Update Leases Table RLS Policies ─────────────────────
-- Drop existing team write/insert policies on leases if they exist
DROP POLICY IF EXISTS "Team create access leases" ON public.leases;
DROP POLICY IF EXISTS "Team edit access leases" ON public.leases;
DROP POLICY IF EXISTS "Team delete access leases" ON public.leases;

-- Recreate team policies for leases
CREATE POLICY "Team create access leases" ON public.leases 
FOR INSERT WITH CHECK (
  public.has_property_permission(property_id, 'can_create_lease')
);

CREATE POLICY "Team edit access leases" ON public.leases 
FOR UPDATE USING (
  public.has_property_permission(property_id, 'can_edit_lease')
) WITH CHECK (
  public.has_property_permission(property_id, 'can_edit_lease')
);

CREATE POLICY "Team delete access leases" ON public.leases 
FOR DELETE USING (
  public.has_property_permission(property_id, 'can_edit_lease')
);
