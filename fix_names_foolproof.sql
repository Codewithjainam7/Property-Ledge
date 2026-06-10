-- Run this in the Supabase Dashboard SQL Editor
-- This bypasses the leases table entirely and pulls the exact name from the accepted application

UPDATE public.properties p
SET 
  tenant_name = e.first_name || ' ' || e.last_name,
  tenant_email = e.email
FROM public.property_enquiries e
WHERE e.property_id = p.id 
AND e.status = 'Accepted'
AND (p.tenant_name IS NULL OR p.tenant_name = '');
