-- Run this in the Supabase Dashboard SQL Editor
-- This allows Tenants to view their own tenant profile, their lease connection, and their actual leases.

DROP POLICY IF EXISTS "Tenants view own profile" ON public.tenants;
CREATE POLICY "Tenants view own profile" ON public.tenants 
FOR SELECT USING (user_id = auth.uid() OR email = auth.jwt()->>'email');

-- 2. Allow tenants to view their connection to a lease
CREATE POLICY "Tenants view own lease link" ON public.lease_tenants 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tenants 
    WHERE id = lease_tenants.tenant_id AND user_id = auth.uid()
  )
);

-- 3. Allow tenants to view the actual lease details
CREATE POLICY "Tenants view own leases" ON public.leases 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.lease_tenants lt
    JOIN public.tenants t ON lt.tenant_id = t.id
    WHERE lt.lease_id = leases.id AND t.user_id = auth.uid()
  )
);
