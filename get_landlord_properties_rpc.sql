-- Run this in the Supabase Dashboard SQL Editor
-- This RPC securely fetches all properties and their active tenant details for the landlord,
-- bypassing complex nested RLS policies that cause silent null returns in PostgREST.

CREATE OR REPLACE FUNCTION public.get_landlord_properties()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
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
      'status', p.status,
      'rent_amount', p.rent_amount,
      'payment_frequency', p.payment_frequency,
      'created_at', p.created_at,
      'tenant_name', CASE 
                        WHEN t.first_name IS NOT NULL THEN t.first_name || ' ' || t.last_name
                        ELSE ''
                     END,
      'tenant_email', COALESCE(t.email, ''),
      'lease_start', l.start_date,
      'lease_duration', CASE 
                           WHEN l.start_date IS NOT NULL AND l.end_date IS NOT NULL 
                           THEN ROUND(EXTRACT(EPOCH FROM (l.end_date - l.start_date)) / (3600 * 24 * 30))
                           ELSE NULL
                        END
    ) ORDER BY p.created_at DESC
  ) INTO v_result
  FROM public.properties p
  LEFT JOIN public.leases l ON l.property_id = p.id AND l.status = 'Active'
  LEFT JOIN public.lease_tenants lt ON lt.lease_id = l.id
  LEFT JOIN public.tenants t ON t.id = lt.tenant_id
  WHERE p.owner_id = auth.uid();

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;
