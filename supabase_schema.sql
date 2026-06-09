-- ==========================================
-- PROPERTY LEDGE - ENTERPRISE DATABASE SCHEMA (PHASE 1)
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Drop existing tables and functions if they exist (in reverse dependency order)
DROP TABLE IF EXISTS public.maintenance_requests;
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.invoices;
DROP TABLE IF EXISTS public.invoice_templates;
DROP TABLE IF EXISTS public.lease_tenants;
DROP TABLE IF EXISTS public.leases;
DROP TABLE IF EXISTS public.property_team;
DROP TABLE IF EXISTS public.properties;
DROP TABLE IF EXISTS public.tenants;
DROP TABLE IF EXISTS public.user_profiles;

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

-- 2. Create User Profiles Table (Global Roles)
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    global_role TEXT DEFAULT 'Owner' CHECK (global_role IN ('Owner', 'Agent', 'Tenant', 'Strata')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Properties Table
CREATE TABLE public.properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES auth.users(id) NOT NULL,
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
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Property Team Table (RBAC / Agents / Strata)
CREATE TABLE public.property_team (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('Manager', 'Agent', 'Strata')),
    can_view_property BOOLEAN DEFAULT true,
    can_view_lease BOOLEAN DEFAULT false,
    can_create_lease BOOLEAN DEFAULT false,
    can_edit_lease BOOLEAN DEFAULT false,
    can_manage_tenants BOOLEAN DEFAULT false,
    can_renew_lease BOOLEAN DEFAULT false,
    can_terminate_lease BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(property_id, user_id)
);

-- 5. Create Tenants Table (Profile info for tenants, could also link to auth.users if they log in)
CREATE TABLE public.tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- If tenant has an account
    owner_id UUID REFERENCES auth.users(id) NOT NULL, -- Who created the tenant record
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Leases Table (Strictly linked to Property)
CREATE TABLE public.leases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    rent_amount NUMERIC(10, 2) NOT NULL CHECK (rent_amount >= 0),
    payment_frequency TEXT NOT NULL CHECK (payment_frequency IN ('Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Annually')),
    bond_amount NUMERIC(10, 2) CHECK (bond_amount >= 0),
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Active', 'Expired', 'Renewed', 'Terminated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT valid_lease_dates CHECK (end_date IS NULL OR end_date > start_date)
);

-- 7. Create Lease Tenants Junction Table (Many-to-Many)
CREATE TABLE public.lease_tenants (
    lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (lease_id, tenant_id)
);

-- 8. Create Invoice Templates Table (Future Phase, but kept so we don't break code)
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
    auto_send_email BOOLEAN DEFAULT false,
    auto_approve BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Create Invoices Table (Future Phase)
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

-- 10. Create Payments Table (Future Phase)
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

-- 11. Create Maintenance Requests Table (Future Phase)
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
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_team_updated_at BEFORE UPDATE ON public.property_team FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_templates_updated_at BEFORE UPDATE ON public.invoice_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Disable strict RLS checking on user_profiles for signup (allow anyone to read their own, insert their own)
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- Properties: Owner can do anything. Team can view if they have permissions.
CREATE POLICY "Owner full access properties" ON public.properties USING (auth.uid() = owner_id);
CREATE POLICY "Team view access properties" ON public.properties FOR SELECT USING (EXISTS (SELECT 1 FROM public.property_team WHERE property_id = properties.id AND user_id = auth.uid() AND can_view_property = true));

-- Team: Owner manages team. Team members can view themselves.
CREATE POLICY "Owner full access team" ON public.property_team USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_team.property_id AND owner_id = auth.uid()));
CREATE POLICY "Team view self" ON public.property_team FOR SELECT USING (user_id = auth.uid());

-- Leases: Owner full access. Team access depends on permissions.
CREATE POLICY "Owner full access leases" ON public.leases USING (EXISTS (SELECT 1 FROM public.properties WHERE id = leases.property_id AND owner_id = auth.uid()));
CREATE POLICY "Team view access leases" ON public.leases FOR SELECT USING (EXISTS (SELECT 1 FROM public.property_team WHERE property_id = leases.property_id AND user_id = auth.uid() AND can_view_lease = true));
CREATE POLICY "Team edit access leases" ON public.leases FOR UPDATE USING (EXISTS (SELECT 1 FROM public.property_team WHERE property_id = leases.property_id AND user_id = auth.uid() AND can_edit_lease = true));

-- Tenants & Lease Tenants (Simplified for now: Owner has full access)
CREATE POLICY "Owner full access tenants" ON public.tenants USING (auth.uid() = owner_id);
CREATE POLICY "Owner full access lease tenants" ON public.lease_tenants USING (EXISTS (SELECT 1 FROM public.leases JOIN public.properties ON leases.property_id = properties.id WHERE leases.id = lease_tenants.lease_id AND properties.owner_id = auth.uid()));

-- Future Phase Policies (Owner based for now to prevent breaking)
CREATE POLICY "Owner access templates" ON public.invoice_templates USING (auth.uid() = user_id);
CREATE POLICY "Owner access invoices" ON public.invoices USING (auth.uid() = user_id);
CREATE POLICY "Owner access payments" ON public.payments USING (auth.uid() = user_id);
CREATE POLICY "Owner access maintenance" ON public.maintenance_requests USING (auth.uid() = user_id);
