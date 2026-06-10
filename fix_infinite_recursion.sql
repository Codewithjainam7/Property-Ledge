-- Run this in the Supabase Dashboard SQL Editor

-- 1. Drop the recursive policy that caused the infinite loop
DROP POLICY IF EXISTS "Tenants view leased properties" ON public.properties;

-- 2. Create a SECURITY DEFINER function to securely check lease connection without triggering RLS recursively
CREATE OR REPLACE FUNCTION public.tenant_has_lease(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leases 
    WHERE property_id = p_property_id AND tenant_id = auth.uid()
  );
$$;

-- 3. Create the new, safe policy using the function
CREATE POLICY "Tenants view leased properties" ON public.properties 
FOR SELECT USING (
  public.tenant_has_lease(id)
);
