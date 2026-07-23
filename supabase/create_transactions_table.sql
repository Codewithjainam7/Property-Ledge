-- Supabase SQL: Create Unified Transactions Table

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    category TEXT NOT NULL, -- e.g., 'Rent', 'Water', 'Bank Interest', 'Strata'
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE,
    paid_date DATE,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partial', 'Paid', 'Overdue')),
    description TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Owner can read their property transactions
CREATE POLICY "Owners can view transactions for their properties" ON public.transactions
    FOR SELECT USING (
        property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
    );

-- Owner can insert transactions
CREATE POLICY "Owners can insert transactions" ON public.transactions
    FOR INSERT WITH CHECK (
        property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
    );

-- Owner can update transactions
CREATE POLICY "Owners can update transactions" ON public.transactions
    FOR UPDATE USING (
        property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
    );

-- Owner can delete transactions
CREATE POLICY "Owners can delete transactions" ON public.transactions
    FOR DELETE USING (
        property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
    );
