-- ============================================================
-- PROPERTY LEDGE — Team Invitations Migration
-- Run this entire script in the Supabase SQL Editor
-- ============================================================

-- ─── 1. Create team_invitations table ───────────────────────
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['Manager'::text, 'Agent'::text, 'Strata'::text])),
  permissions jsonb DEFAULT '{}'::jsonb,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'Pending' CHECK (status = ANY (ARRAY['Pending'::text, 'Accepted'::text, 'Declined'::text, 'Expired'::text])),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  accepted_at timestamp with time zone,
  CONSTRAINT team_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT team_invitations_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT team_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id),
  CONSTRAINT team_invitations_token_key UNIQUE (token)
);

-- ─── 2. Indexes for fast lookups ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_property ON public.team_invitations(property_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);

-- ─── 3. RLS on team_invitations ─────────────────────────────
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Landlords can fully manage invites for properties they own
DROP POLICY IF EXISTS "Owners manage invites for their properties" ON public.team_invitations;
CREATE POLICY "Owners manage invites for their properties"
ON public.team_invitations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = team_invitations.property_id
    AND p.owner_id = auth.uid()
  )
);

-- ─── 4. Ensure property_team has RLS policies ───────────────
ALTER TABLE public.property_team ENABLE ROW LEVEL SECURITY;

-- Owners can manage their property team
DROP POLICY IF EXISTS "Owners manage property team" ON public.property_team;
CREATE POLICY "Owners manage property team"
ON public.property_team
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_team.property_id
    AND p.owner_id = auth.uid()
  )
);

-- Team members can view their own membership row
DROP POLICY IF EXISTS "Members view own membership" ON public.property_team;
CREATE POLICY "Members view own membership"
ON public.property_team
FOR SELECT
USING (user_id = auth.uid());

-- ─── 5. SECURITY DEFINER function to preview an invite by token ───
-- This is called pre-auth so must bypass RLS using service role context
CREATE OR REPLACE FUNCTION public.get_team_invite_by_token(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_property RECORD;
  v_inviter RECORD;
BEGIN
  -- Fetch the pending invite
  SELECT * INTO v_invite
  FROM public.team_invitations
  WHERE token = p_token
    AND status = 'Pending'
    AND expires_at > now()
  LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN json_build_object('error', 'Invite not found, already used, or expired');
  END IF;

  -- Fetch property details
  SELECT id, address, suburb, state, postcode INTO v_property
  FROM public.properties
  WHERE id = v_invite.property_id
  LIMIT 1;

  -- Fetch inviter profile
  SELECT first_name, last_name INTO v_inviter FROM public.user_profiles
  WHERE id = v_invite.invited_by
  LIMIT 1;

  RETURN json_build_object(
    'id', v_invite.id,
    'email', v_invite.email,
    'role', v_invite.role,
    'property_id', v_invite.property_id,
    'property_address', COALESCE(v_property.address || ', ' || v_property.suburb, 'Unknown Property'),
    'inviter_name', COALESCE(v_inviter.first_name || ' ' || v_inviter.last_name, 'Your Landlord'),
    'expires_at', v_invite.expires_at
  );
END;
$$;

-- ─── 6. SECURITY DEFINER function to accept an invite ───────
CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token uuid, p_user_id uuid, p_user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Fetch invite
  SELECT * INTO v_invite
  FROM public.team_invitations
  WHERE token = p_token
    AND status = 'Pending'
    AND expires_at > now()
  LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invite not found, already accepted, or expired');
  END IF;

  -- Email must match the invite
  IF lower(v_invite.email) != lower(p_user_email) THEN
    RETURN json_build_object('success', false, 'error', 'Email mismatch. This invite was sent to a different email address.');
  END IF;

  -- Insert into property_team (upsert to avoid duplicate error)
  INSERT INTO public.property_team (property_id, user_id, email, role, permissions)
  VALUES (
    v_invite.property_id,
    p_user_id,
    v_invite.email,
    v_invite.role,
    COALESCE(v_invite.permissions, '{
      "can_view_property": true,
      "can_view_lease": true,
      "can_create_lease": false,
      "can_edit_lease": false,
      "can_manage_tenants": false,
      "can_renew_lease": false,
      "can_terminate_lease": false
    }'::jsonb)
  )
  ON CONFLICT (property_id, user_id) DO NOTHING;

  -- Mark the invite as Accepted
  UPDATE public.team_invitations
  SET status = 'Accepted', accepted_at = now()
  WHERE id = v_invite.id;

  RETURN json_build_object(
    'success', true,
    'property_id', v_invite.property_id,
    'role', v_invite.role
  );
END;
$$;

-- ─── 7. Helper: expire old invitations (can be run on a schedule) ─
CREATE OR REPLACE FUNCTION public.expire_old_team_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.team_invitations
  SET status = 'Expired'
  WHERE status = 'Pending' AND expires_at < now();
END;
$$;

-- Done! ✅
-- Next step: Deploy the accept-team-invite edge function, then update frontend.
