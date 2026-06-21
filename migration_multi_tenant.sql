-- ==========================================
-- MULTI-TENANT ARCHITECTURE MIGRATION
-- ==========================================

-- 1. Remove the unused 'images' column from properties table
ALTER TABLE public.properties DROP COLUMN IF EXISTS images;

-- 2. Enhance the lease_tenants junction table to support rent splitting
ALTER TABLE public.lease_tenants ADD COLUMN IF NOT EXISTS rent_share_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.lease_tenants ADD COLUMN IF NOT EXISTS rent_share_percentage NUMERIC(5, 2) DEFAULT 100.00;

-- Ensure the tables exist (they should, based on schema, but safe to run)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES auth.users(id) NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    access_level JSONB DEFAULT '{"receives_emails": true, "can_login": false}'::jsonb,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived', 'Pending', 'Invited')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lease_tenants (
    lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    rent_share_amount NUMERIC(10, 2) DEFAULT 0,
    rent_share_percentage NUMERIC(5, 2) DEFAULT 100.00,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (lease_id, tenant_id)
);
