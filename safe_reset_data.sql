-- ============================================
-- SAFE DATA RESET (keeps your user account!)
-- ============================================
-- Run this in the Supabase SQL Editor when you want a clean slate for testing.
-- This deletes ALL business data but keeps auth.users and user_profiles intact
-- so you don't have to sign up again.

-- Delete in order to respect foreign key constraints (children first, parents last)
DELETE FROM public.lease_tenants;
DELETE FROM public.invoice_audit_logs;
DELETE FROM public.invoice_recipients;
DELETE FROM public.invoices;
DELETE FROM public.invoice_templates;
DELETE FROM public.payments;
DELETE FROM public.maintenance_requests;
DELETE FROM public.leases;
DELETE FROM public.tenants;
DELETE FROM public.property_enquiries;
DELETE FROM public.property_team;
DELETE FROM public.properties;

-- ⚠️ user_profiles and auth.users are NOT deleted on purpose!
-- Deleting auth.users breaks your login session.

-- Verify everything is clean
SELECT 'lease_tenants' AS table_name, COUNT(*) FROM public.lease_tenants
UNION ALL SELECT 'leases', COUNT(*) FROM public.leases
UNION ALL SELECT 'tenants', COUNT(*) FROM public.tenants
UNION ALL SELECT 'properties', COUNT(*) FROM public.properties
UNION ALL SELECT 'payments', COUNT(*) FROM public.payments;
