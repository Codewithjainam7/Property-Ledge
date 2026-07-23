-- Add expenses table for tracking generic outgoing costs (Phase 1 Accounting)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    expense_date DATE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Water', 'Strata', 'Repairs', 'Maintenance', 'Bank Fees', 'Interest', 'Other')),
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Owner can view and manage their own properties' expenses
DROP POLICY IF EXISTS "Owner full access expenses" ON public.expenses;
CREATE POLICY "Owner full access expenses" ON public.expenses 
USING (EXISTS (SELECT 1 FROM public.properties WHERE id = expenses.property_id AND owner_id = auth.uid()));

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at 
BEFORE UPDATE ON public.expenses 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note for Supabase Storage:
-- The 'receipts' storage bucket must be created via the Supabase Dashboard or API, 
-- as SQL alone cannot reliably create storage buckets without access to the storage schema.
