-- ==========================================
-- PROPERTY LEDGE - ENTERPRISE DATABASE SCHEMA
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Drop existing tables and functions if they exist (in reverse dependency order)
DROP TABLE IF EXISTS public.maintenance_requests;
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.invoices;
DROP TABLE IF EXISTS public.invoice_templates;
DROP TABLE IF EXISTS public.templates; -- Cleanup old legacy table
DROP TABLE IF EXISTS public.leases;
DROP TABLE IF EXISTS public.tenants;
DROP TABLE IF EXISTS public.properties;

-- Function for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- TABLE CREATION
-- ==========================================

-- 2. Create Properties Table
CREATE TABLE public.properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    property_id TEXT, -- Custom ID like PL-001
    address TEXT NOT NULL,
    suburb TEXT,
    postcode TEXT,
    state TEXT,
    property_type TEXT,
    image TEXT,
    bedrooms INTEGER DEFAULT 0 CHECK (bedrooms >= 0),
    bathrooms NUMERIC(3, 1) DEFAULT 0 CHECK (bathrooms >= 0),
    car_spaces INTEGER DEFAULT 0 CHECK (car_spaces >= 0),
    rent_amount NUMERIC(10, 2) CHECK (rent_amount >= 0),
    payment_frequency TEXT DEFAULT 'Weekly' CHECK (payment_frequency IN ('Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Annually')),
    -- Legacy fields (can be migrated to leases/tenants table later)
    tenant_name TEXT,
    tenant_email TEXT,
    tenant_mobile TEXT,
    lease_start DATE,
    lease_duration INTEGER CHECK (lease_duration >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Tenants Table (For better relational data)
CREATE TABLE public.tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Leases Table (Links properties and tenants)
CREATE TABLE public.leases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    rent_amount NUMERIC(10, 2) NOT NULL CHECK (rent_amount >= 0),
    payment_frequency TEXT NOT NULL CHECK (payment_frequency IN ('Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Annually')),
    bond_amount NUMERIC(10, 2) CHECK (bond_amount >= 0),
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Terminated', 'Pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT valid_lease_dates CHECK (end_date IS NULL OR end_date > start_date)
);

-- 5. Create Invoice Templates Table (For Custom Invoices & Automation)
CREATE TABLE public.invoice_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    template_type TEXT DEFAULT 'Standard' CHECK (template_type IN ('Standard', 'Rent', 'Maintenance', 'Commercial')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_due_days INTEGER DEFAULT 14 CHECK (default_due_days >= 0),
    tax_rate NUMERIC(5, 2) DEFAULT 0.00 CHECK (tax_rate >= 0),
    default_notes TEXT,
    automation_day INTEGER CHECK (automation_day >= 1 AND automation_day <= 31),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Invoices Table
CREATE TABLE public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.invoice_templates(id) ON DELETE SET NULL,
    lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
    invoice_number TEXT,
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Unpaid', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled')),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Payments Table (To track invoice settlements)
CREATE TABLE public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('Bank Transfer', 'Credit Card', 'Cash', 'Direct Debit', 'Other')),
    reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create Maintenance Requests Table
CREATE TABLE public.maintenance_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Cancelled')),
    reported_date DATE DEFAULT CURRENT_DATE,
    resolved_date DATE,
    cost NUMERIC(10, 2) CHECK (cost >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- AUTO-UPDATE TIMESTAMPS (TRIGGERS)
-- ==========================================
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_templates_updated_at BEFORE UPDATE ON public.invoice_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX idx_properties_user_id ON public.properties(user_id);
CREATE INDEX idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX idx_leases_user_id ON public.leases(user_id);
CREATE INDEX idx_leases_property_id ON public.leases(property_id);
CREATE INDEX idx_leases_tenant_id ON public.leases(tenant_id);
CREATE INDEX idx_invoice_templates_user_id ON public.invoice_templates(user_id);
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_property_id ON public.invoices(property_id);
CREATE INDEX idx_invoices_lease_id ON public.invoices(lease_id);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX idx_maintenance_user_id ON public.maintenance_requests(user_id);
CREATE INDEX idx_maintenance_property_id ON public.maintenance_requests(property_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Properties Policies
CREATE POLICY "Users can view their own properties" ON public.properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own properties" ON public.properties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own properties" ON public.properties FOR DELETE USING (auth.uid() = user_id);

-- Tenants Policies
CREATE POLICY "Users can view their own tenants" ON public.tenants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tenants" ON public.tenants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tenants" ON public.tenants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tenants" ON public.tenants FOR DELETE USING (auth.uid() = user_id);

-- Leases Policies
CREATE POLICY "Users can view their own leases" ON public.leases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own leases" ON public.leases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own leases" ON public.leases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own leases" ON public.leases FOR DELETE USING (auth.uid() = user_id);

-- Invoice Templates Policies
CREATE POLICY "Users can view their own invoice templates" ON public.invoice_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own invoice templates" ON public.invoice_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own invoice templates" ON public.invoice_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own invoice templates" ON public.invoice_templates FOR DELETE USING (auth.uid() = user_id);

-- Invoices Policies
CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own invoices" ON public.invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own invoices" ON public.invoices FOR DELETE USING (auth.uid() = user_id);

-- Payments Policies
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own payments" ON public.payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own payments" ON public.payments FOR DELETE USING (auth.uid() = user_id);

-- Maintenance Policies
CREATE POLICY "Users can view their own maintenance requests" ON public.maintenance_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own maintenance requests" ON public.maintenance_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own maintenance requests" ON public.maintenance_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own maintenance requests" ON public.maintenance_requests FOR DELETE USING (auth.uid() = user_id);
