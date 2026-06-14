-- 1. Create a function to securely fetch the pending handshake details bypassing RLS
CREATE OR REPLACE FUNCTION public.get_pending_handshake(p_email TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_record RECORD;
    v_property_record RECORD;
    v_lease_record RECORD;
BEGIN
    -- Find pending tenant invite matching email
    SELECT * INTO v_tenant_record
    FROM public.tenants
    WHERE email ILIKE p_email AND status IN ('Pending', 'Invited')
    LIMIT 1;

    IF v_tenant_record IS NULL THEN
        RETURN NULL;
    END IF;

    -- Fetch property
    SELECT * INTO v_property_record
    FROM public.properties
    WHERE id = v_tenant_record.property_id;

    -- Fetch drafted lease
    SELECT * INTO v_lease_record
    FROM public.leases
    WHERE property_id = v_tenant_record.property_id AND status IN ('Draft', 'Pending')
    LIMIT 1;

    RETURN json_build_object(
        'tenant', row_to_json(v_tenant_record),
        'property', row_to_json(v_property_record),
        'lease', row_to_json(v_lease_record)
    );
END;
$$;

-- 2. Update the auth trigger to properly map first_name and last_name into user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, first_name, last_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', split_part(COALESCE(new.raw_user_meta_data->>'full_name', ''), ' ', 1)),
    COALESCE(new.raw_user_meta_data->>'last_name', substring(COALESCE(new.raw_user_meta_data->>'full_name', '') from position(' ' in COALESCE(new.raw_user_meta_data->>'full_name', '')) + 1)),
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
