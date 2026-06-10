-- RPC to safely look up a user's ID by their email address
-- This is necessary for the Property Owner to invite Agents/Strata to their property team
-- Only returns the ID if the user exists in the user_profiles table.

CREATE OR REPLACE FUNCTION public.get_user_by_email(p_email TEXT)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id
    FROM public.user_profiles
    WHERE LOWER(email) = LOWER(p_email)
    LIMIT 1;
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
