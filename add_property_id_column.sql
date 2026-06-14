-- Alter tenants table to add property_id
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE;
