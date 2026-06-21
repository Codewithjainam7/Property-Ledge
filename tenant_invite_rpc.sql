-- 1. RPC to securely fetch invite preview using the token
CREATE OR REPLACE FUNCTION public.get_tenant_invite_preview(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'tenant_id', t.id,
    'first_name', t.first_name,
    'last_name', t.last_name,
    'email', t.email,
    'property_address', p.address,
    'property_suburb', p.suburb
  ) INTO v_result
  FROM public.tenants t
  JOIN public.properties p ON t.property_id = p.id
  WHERE t.invite_token = p_token AND t.status = 'Invited';

  RETURN v_result;
END;
$$;

-- 2. RPC to securely consume the token and activate the tenant
CREATE OR REPLACE FUNCTION public.accept_tenant_invite(p_token UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Validate token exists and is valid
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE invite_token = p_token AND status = 'Invited';

  IF v_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update tenant: link user_id, activate, and clear token
  UPDATE public.tenants
  SET 
    user_id = p_user_id,
    status = 'Active',
    invite_token = NULL
  WHERE id = v_tenant_id;

  RETURN TRUE;
END;
$$;
