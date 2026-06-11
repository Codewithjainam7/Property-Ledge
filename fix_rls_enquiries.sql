CREATE POLICY "Tenants can update own enquiries" ON public.property_enquiries 
    FOR UPDATE 
    USING (auth.uid() = tenant_id);
