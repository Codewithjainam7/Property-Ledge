-- Run this in the Supabase SQL Editor
-- This creates a highly resilient database function that bypasses RLS to allow an invited tenant to accept a lease.
-- It also properly populates the tenants and lease_tenants tables.

CREATE OR REPLACE FUNCTION public.accept_lease(p_property_id UUID, p_signature_data TEXT, p_tenant_record_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as the database owner, bypassing RLS
AS $$
DECLARE
    v_owner_id UUID;
    v_rent_amount NUMERIC;
    v_payment_frequency TEXT;
    v_tenant_name TEXT;
    v_tenant_first_name TEXT;
    v_tenant_last_name TEXT;
    v_tenant_email TEXT;
    v_tenant_record_id UUID := p_tenant_record_id;
    v_lease_id UUID;
    v_property_status TEXT;
BEGIN
    -- 1. Get property details
    SELECT owner_id, rent_amount, payment_frequency, status INTO v_owner_id, v_rent_amount, v_payment_frequency, v_property_status
    FROM public.properties
    WHERE id = p_property_id;

    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Property not found.';
    END IF;

    -- Prevent accepting if property is already leased/inactive
    IF v_property_status = 'Inactive' THEN
        RAISE EXCEPTION 'This property has already been leased to someone else.';
    END IF;

    -- Clean payment frequency
    IF v_payment_frequency NOT IN ('Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Annually') OR v_payment_frequency IS NULL THEN
        v_payment_frequency := 'Monthly';
    END IF;

    -- Clean rent amount
    IF v_rent_amount IS NULL OR v_rent_amount < 0 THEN
        v_rent_amount := 0;
    END IF;

    -- 2. Get tenant profile details from auth
    SELECT 
        COALESCE(raw_user_meta_data->>'first_name', 'Tenant'),
        COALESCE(raw_user_meta_data->>'last_name', ''),
        email 
    INTO v_tenant_first_name, v_tenant_last_name, v_tenant_email
    FROM auth.users 
    WHERE id = auth.uid();

    -- 3. Upsert tenant record in tenants table (create if not exists)
    -- If p_tenant_record_id wasn't passed, fall back to email
    IF v_tenant_record_id IS NULL THEN
        SELECT id INTO v_tenant_record_id
        FROM public.tenants
        WHERE email ILIKE v_tenant_email AND property_id = p_property_id
        LIMIT 1;
        
        IF v_tenant_record_id IS NULL THEN
            SELECT id INTO v_tenant_record_id
            FROM public.tenants
            WHERE email ILIKE v_tenant_email AND status IN ('Pending', 'Invited')
            LIMIT 1;
        END IF;
    END IF;

    IF v_tenant_record_id IS NOT NULL THEN
        UPDATE public.tenants
        SET user_id = auth.uid(),
            status = 'Active',
            owner_id = v_owner_id,
            property_id = p_property_id
        WHERE id = v_tenant_record_id;
    ELSE
        INSERT INTO public.tenants (user_id, owner_id, property_id, first_name, last_name, email, status)
        VALUES (auth.uid(), v_owner_id, p_property_id, v_tenant_first_name, v_tenant_last_name, v_tenant_email, 'Active')
        RETURNING id INTO v_tenant_record_id;
    END IF;

    -- Check if a drafted lease already exists for this property
    SELECT id INTO v_lease_id
    FROM public.leases
    WHERE property_id = p_property_id AND status IN ('Draft', 'Pending')
    LIMIT 1;

    IF v_lease_id IS NULL THEN
        RAISE EXCEPTION 'No formal drafted lease found for this property. The landlord must draft a lease before you can accept.';
    END IF;

    -- 4. Update the enquiry statuses
    -- Accept the current tenant's enquiry
    UPDATE public.property_enquiries
    SET status = 'Accepted'
    WHERE property_id = p_property_id AND tenant_id = auth.uid();

    -- Reject all other pending/invited enquiries for this property
    UPDATE public.property_enquiries
    SET status = 'Rejected'
    WHERE property_id = p_property_id AND tenant_id != auth.uid();

    -- 5. Update the existing formal lease
    UPDATE public.leases
    SET
        tenant_id = auth.uid(),
        tenant_signature = p_signature_data,
        status = 'Active',
        start_date = CURRENT_DATE,
        end_date = CURRENT_DATE + INTERVAL '1 year'
    WHERE id = v_lease_id;

    -- 6. Link tenant to lease in the junction table
    INSERT INTO public.lease_tenants (lease_id, tenant_id, is_primary)
    VALUES (v_lease_id, v_tenant_record_id, true);

    -- 7. Update the property to Inactive and save tenant name for backwards compatibility
    UPDATE public.properties
    SET 
        status = 'Inactive',
        tenant_name = v_tenant_first_name || ' ' || v_tenant_last_name,
        tenant_email = v_tenant_email
    WHERE id = p_property_id;

END;
$$;
