-- Add missing columns to support the new Tenancy Setup Wizard details
ALTER TABLE public.leases
ADD COLUMN IF NOT EXISTS bond_is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bond_due_date DATE,
ADD COLUMN IF NOT EXISTS signing_provider TEXT,
ADD COLUMN IF NOT EXISTS date_of_agreement DATE,
ADD COLUMN IF NOT EXISTS renter_addresses JSONB,
ADD COLUMN IF NOT EXISTS urgent_repairs JSONB,
ADD COLUMN IF NOT EXISTS owners_corporation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS condition_report_status TEXT,
ADD COLUMN IF NOT EXISTS additional_terms TEXT;
