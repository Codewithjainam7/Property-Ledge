-- Run this in the Supabase Dashboard SQL Editor
-- This script fixes any properties that are missing their tenant names 
-- by pulling the data from the active lease records.

UPDATE public.properties p
SET 
  tenant_name = t.first_name || ' ' || t.last_name,
  tenant_email = t.email
FROM public.leases l
JOIN public.lease_tenants lt ON lt.lease_id = l.id
JOIN public.tenants t ON t.id = lt.tenant_id
WHERE l.property_id = p.id 
AND l.status = 'Active'
AND p.tenant_name IS NULL;
