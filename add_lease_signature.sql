-- Run this in the Supabase SQL Editor to add digital signature support to leases
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id);
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS tenant_signature TEXT;
