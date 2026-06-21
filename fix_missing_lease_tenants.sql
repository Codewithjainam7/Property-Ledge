-- ==========================================
-- FIX MISSING LEASE TENANTS (BACKFILL)
-- ==========================================
-- This script fixes the issue where tenants added BEFORE the new architecture
-- were not showing up on the Property page. It automatically links existing 
-- active tenants to their active leases.

INSERT INTO public.lease_tenants (lease_id, tenant_id, is_primary, rent_share_percentage)
SELECT l.id, t.id, true, 100
FROM public.leases l
JOIN public.tenants t ON l.property_id = t.property_id
WHERE l.status = 'Active' 
  AND t.status = 'Active'
ON CONFLICT (lease_id, tenant_id) DO NOTHING;
