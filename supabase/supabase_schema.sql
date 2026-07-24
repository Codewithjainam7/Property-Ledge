-- ==========================================
-- PROPERTY LEDGE - ENTERPRISE DATABASE SCHEMA (PHASE 1)
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Drop existing tables and functions if they exist (in reverse dependency order)
DROP FUNCTION IF EXISTS public.is_property_owner(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_property_permission(UUID, TEXT) CASCADE;
DROP TABLE IF EXISTS public.maintenance_requests CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.invoice_recipients CASCADE;
DROP TABLE IF EXISTS public.invoice_audit_logs CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.invoice_templates CASCADE;
DROP TABLE IF EXISTS public.property_enquiries CASCADE;
DROP TABLE IF EXISTS public.lease_tenants CASCADE;
DROP TABLE IF EXISTS public.leases CASCADE;
DROP TABLE IF EXISTS public.property_team CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

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

CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
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
    property_category TEXT CHECK (property_category IN ('Residential', 'Commercial')),
    property_type TEXT,
    image TEXT,
    bedrooms INTEGER DEFAULT 0 CHECK (bedrooms >= 0),
    bathrooms NUMERIC(3, 1) DEFAULT 0 CHECK (bathrooms >= 0),
    car_spaces INTEGER DEFAULT 0 CHECK (car_spaces >= 0),
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Maintenance')),
    rent_amount NUMERIC(10, 2),
    payment_frequency TEXT,
    images JSONB,
    tenant_name TEXT,
    tenant_email TEXT,
    lease_start DATE,
    lease_duration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Property Team Table (RBAC / Agents / Strata)
CREATE TABLE public.property_team (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT, -- Used for pending invitations before user creates an auth account
    role TEXT NOT NULL CHECK (role IN ('Manager', 'Agent', 'Strata')),
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(property_id, user_id),
    UNIQUE(property_id, email)
);

-- 5. Create Tenants Table (Profile info for tenants, could also link to auth.users if they log in)
CREATE TABLE public.tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE, -- Linked property
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- If tenant has an account
    owner_id UUID REFERENCES auth.users(id) NOT NULL, -- Who created the tenant record
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    access_level JSONB DEFAULT '{"receives_emails": true, "can_login": false}'::jsonb,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived', 'Pending', 'Invited')),
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
    property_ids UUID[] DEFAULT '{}'::uuid[],
    late_fee_amount NUMERIC(10, 2) DEFAULT 0.00,
    late_fee_days INTEGER DEFAULT 0,
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
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Viewed', 'Unpaid', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled')),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    -- Historical Snapshot Fields (Immutability)
    property_address TEXT,
    tenant_name TEXT,
    tenant_email TEXT,
    billing_period_start DATE,
    billing_period_end DATE,
    agency_details JSONB,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    notes TEXT,
    late_fee_amount NUMERIC(10, 2) DEFAULT 0.00,
    late_fee_days INTEGER DEFAULT 0,
    late_fee_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9.1 Create Invoice Recipients Table
CREATE TABLE public.invoice_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    recipient_type TEXT DEFAULT 'CC' CHECK (recipient_type IN ('Primary', 'CC')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9.2 Create Invoice Audit Logs Table
CREATE TABLE public.invoice_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Create Payments Table (Phase 4 Rental Ledger)
CREATE TABLE public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
    amount_due NUMERIC(10, 2) NOT NULL CHECK (amount_due >= 0),
    amount_paid NUMERIC(10, 2) DEFAULT 0 CHECK (amount_paid >= 0),
    due_date DATE NOT NULL,
    paid_date DATE,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Partial')),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('Rent', 'Bond', 'Water', 'Maintenance')),
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
-- AUTHENTICATION TRIGGERS (INVITE SYSTEM)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user_invite_link()
RETURNS trigger AS $$
BEGIN
  -- Link to property_team
  UPDATE public.property_team SET user_id = NEW.id WHERE email = NEW.email AND user_id IS NULL;
  
  -- Link to tenants
  UPDATE public.tenants SET user_id = NEW.id WHERE email = NEW.email AND user_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In Supabase, you must run this via SQL Editor to attach to auth.users schema
-- DROP TRIGGER IF EXISTS on_auth_user_created_link_invites ON auth.users;
-- CREATE TRIGGER on_auth_user_created_link_invites
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_invite_link();

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
ALTER TABLE public.invoice_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Disable strict RLS checking on user_profiles for signup (allow anyone to read their own, insert their own)
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Helper Functions to prevent Infinite Recursion
CREATE OR REPLACE FUNCTION public.is_property_owner(pid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.properties WHERE id = pid AND owner_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_property_permission(pid UUID, perm TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.property_team 
    WHERE property_id = pid 
    AND user_id = auth.uid() 
    AND (permissions->>perm)::boolean = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Properties: Owner can do anything. Team can view if they have permissions.
CREATE POLICY "Owner full access properties" ON public.properties USING (auth.uid() = owner_id);
CREATE POLICY "Team view access properties" ON public.properties FOR SELECT USING (public.has_property_permission(id, 'can_view_property'));

-- Team: Owner manages team. Team members can view themselves.
CREATE POLICY "Owner full access team" ON public.property_team USING (public.is_property_owner(property_id));
CREATE POLICY "Team view self" ON public.property_team FOR SELECT USING (user_id = auth.uid());

-- Leases: Owner full access. Team access depends on permissions.
CREATE POLICY "Owner full access leases" ON public.leases USING (EXISTS (SELECT 1 FROM public.properties WHERE id = leases.property_id AND owner_id = auth.uid()));
CREATE POLICY "Team view access leases" ON public.leases FOR SELECT USING (EXISTS (SELECT 1 FROM public.property_team WHERE property_id = leases.property_id AND user_id = auth.uid() AND permissions @> '{"can_view_lease": true}'));
CREATE POLICY "Team edit access leases" ON public.leases FOR UPDATE USING (EXISTS (SELECT 1 FROM public.property_team WHERE property_id = leases.property_id AND user_id = auth.uid() AND permissions @> '{"can_edit_lease": true}'));

-- Tenants & Lease Tenants (Simplified for now: Owner has full access)
CREATE POLICY "Owner full access tenants" ON public.tenants USING (auth.uid() = owner_id);
CREATE POLICY "Owner full access lease tenants" ON public.lease_tenants USING (EXISTS (SELECT 1 FROM public.leases JOIN public.properties ON leases.property_id = properties.id WHERE leases.id = lease_tenants.lease_id AND properties.owner_id = auth.uid()));

-- Future Phase Policies (Owner based for now to prevent breaking)
CREATE POLICY "Owner access templates" ON public.invoice_templates USING (auth.uid() = user_id);
CREATE POLICY "Access invoices" ON public.invoices USING (
  auth.uid() = user_id OR
  tenant_email = auth.jwt()->>'email' OR
  EXISTS (SELECT 1 FROM public.properties p WHERE p.id = invoices.property_id AND p.owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.property_team pt WHERE pt.property_id = invoices.property_id AND pt.user_id = auth.uid())
);

-- Invoice Recipients & Audit Logs Policies
CREATE POLICY "Access invoice recipients" ON public.invoice_recipients USING (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_recipients.invoice_id AND i.user_id = auth.uid())
);
CREATE POLICY "Access invoice audit logs" ON public.invoice_audit_logs USING (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_audit_logs.invoice_id AND i.user_id = auth.uid())
);
CREATE POLICY "Owner access payments" ON public.payments USING (public.is_property_owner(property_id));
CREATE POLICY "Owner access maintenance" ON public.maintenance_requests USING (auth.uid() = user_id);
