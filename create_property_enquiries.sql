-- Run this in the Supabase Dashboard SQL Editor
-- This creates the Applications/Enquiries table for the tenant workflow

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.property_enquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT,
    employment_status TEXT,
    monthly_income NUMERIC(10, 2),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Reviewed', 'Accepted', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add the trigger for updated_at
DROP TRIGGER IF EXISTS update_property_enquiries_updated_at ON public.property_enquiries;
CREATE TRIGGER update_property_enquiries_updated_at 
BEFORE UPDATE ON public.property_enquiries 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Enable RLS
ALTER TABLE public.property_enquiries ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Tenants can insert their own application
CREATE POLICY "Tenants can insert own enquiries" ON public.property_enquiries 
FOR INSERT WITH CHECK (auth.uid() = tenant_id);

-- Tenants can view their own applications
CREATE POLICY "Tenants can view own enquiries" ON public.property_enquiries 
FOR SELECT USING (auth.uid() = tenant_id);

-- Landlords can view applications for their own properties
CREATE POLICY "Landlords can view enquiries for their properties" ON public.property_enquiries 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = property_enquiries.property_id 
    AND owner_id = auth.uid()
  )
);

-- Landlords can update (accept/reject) applications for their own properties
CREATE POLICY "Landlords can update enquiries for their properties" ON public.property_enquiries 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = property_enquiries.property_id 
    AND owner_id = auth.uid()
  )
);
