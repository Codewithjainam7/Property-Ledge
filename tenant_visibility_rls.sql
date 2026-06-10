-- Run this in the Supabase Dashboard SQL Editor

-- 1. Allow tenants to view their own leases based on the new tenant_id column
DROP POLICY IF EXISTS "Tenants view own direct leases" ON public.leases;
CREATE POLICY "Tenants view own direct leases" ON public.leases 
FOR SELECT USING (tenant_id = auth.uid());

-- 2. Allow tenants to view properties they have leased (even if Inactive)
DROP POLICY IF EXISTS "Tenants view leased properties" ON public.properties;
CREATE POLICY "Tenants view leased properties" ON public.properties 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.leases 
    WHERE property_id = properties.id AND tenant_id = auth.uid()
  )
);
