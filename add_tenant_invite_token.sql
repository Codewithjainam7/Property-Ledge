-- Add invite_token column to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS invite_token UUID UNIQUE;

-- Add comment
COMMENT ON COLUMN tenants.invite_token IS 'Secure token used for digital tenant onboarding invitations.';
