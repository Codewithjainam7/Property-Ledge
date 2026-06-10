-- Run this in the Supabase SQL Editor
-- WARNING: This deletes ALL data from every table. Use only for testing.

-- Delete in order to respect foreign key constraints (children first, parents last)
DELETE FROM public.lease_tenants;
DELETE FROM public.leases;
DELETE FROM public.tenants;
DELETE FROM public.property_enquiries;
DELETE FROM public.property_team;
DELETE FROM public.properties;
-- user_profiles are kept so you don't have to re-register

-- Verify everything is clean
SELECT 'lease_tenants' AS table_name, COUNT(*) FROM public.lease_tenants
UNION ALL SELECT 'leases', COUNT(*) FROM public.leases
UNION ALL SELECT 'tenants', COUNT(*) FROM public.tenants
UNION ALL SELECT 'property_enquiries', COUNT(*) FROM public.property_enquiries
UNION ALL SELECT 'properties', COUNT(*) FROM public.properties;
