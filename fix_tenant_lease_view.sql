-- Run this in the Supabase Dashboard SQL Editor
-- This completely fixes the infinite recursion problem

-- Step 1: Drop ALL problematic policies on leases that cause cross-table recursion
DROP POLICY IF EXISTS "Tenants view own leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants view own direct leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants view leased properties" ON public.properties;

-- Step 2: Drop the helper function if it exists
DROP FUNCTION IF EXISTS public.tenant_has_lease(UUID);

-- Step 3: Create a simple, non-recursive policy on leases
-- This ONLY checks columns on the leases table itself, no joins, no sub-selects to other tables
CREATE POLICY "Tenants view own direct leases" ON public.leases 
FOR SELECT USING (
  tenant_id = auth.uid() OR created_by = auth.uid()
);

-- Step 4: Create an RPC function that fetches tenant lease data with SECURITY DEFINER
-- This bypasses ALL RLS, so no recursion is possible
CREATE OR REPLACE FUNCTION public.get_tenant_lease_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'lease', json_build_object(
      'id', l.id,
      'property_id', l.property_id,
      'start_date', l.start_date,
      'end_date', l.end_date,
      'rent_amount', l.rent_amount,
      'payment_frequency', l.payment_frequency,
      'bond_amount', l.bond_amount,
      'status', l.status,
      'tenant_signature', l.tenant_signature,
      'created_at', l.created_at
    ),
    'property', json_build_object(
      'id', p.id,
      'address', p.address,
      'suburb', p.suburb,
      'postcode', p.postcode,
      'state', p.state,
      'property_type', p.property_type,
      'image', p.image,
      'images', p.images,
      'bedrooms', p.bedrooms,
      'bathrooms', p.bathrooms,
      'car_spaces', p.car_spaces,
      'rent_amount', p.rent_amount,
      'payment_frequency', p.payment_frequency,
      'status', p.status
    )
  ) INTO v_result
  FROM public.leases l
  JOIN public.properties p ON l.property_id = p.id
  WHERE l.tenant_id = auth.uid()
  AND l.status = 'Active'
  ORDER BY l.created_at DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;
