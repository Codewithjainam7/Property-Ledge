-- Run this in the Supabase SQL Editor to clean up duplicate/stuck tenant records.

-- 1. First, find the tenant that accepted the lease (they have an active lease)
-- and make sure they have the correct property_id set on their tenant profile.
UPDATE public.tenants t
SET property_id = lt.property_id
FROM (
  SELECT tenant_id, property_id
  FROM public.leases 
  WHERE status = 'Active' AND tenant_id IS NOT NULL
) lt
WHERE t.user_id = lt.tenant_id 
AND t.property_id IS NULL;

-- 2. If a property already has an 'Active' tenant (or an active lease), 
-- delete ALL stuck 'Pending' or 'Invited' tenant records for that same property!
-- This fixes the issue where the landlord invited 'email1@example.com' but the tenant signed up with 'email2@example.com'.
DELETE FROM public.tenants
WHERE status IN ('Pending', 'Invited')
AND property_id IN (
  SELECT property_id 
  FROM public.tenants 
  WHERE status = 'Active' AND property_id IS NOT NULL
);

-- 3. Also delete any 'Pending' or 'Invited' tenant records for properties that have an 'Active' lease.
DELETE FROM public.tenants
WHERE status IN ('Pending', 'Invited')
AND property_id IN (
  SELECT property_id 
  FROM public.leases 
  WHERE status = 'Active'
);
