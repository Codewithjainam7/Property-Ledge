-- Run this in the Supabase Dashboard SQL Editor
-- This adds 'rent_amount' and 'payment_frequency' to the properties table so they can be advertised on the marketplace!

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS rent_amount NUMERIC(10, 2) DEFAULT 0 CHECK (rent_amount >= 0),
ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'Weekly' CHECK (payment_frequency IN ('Weekly', 'Fortnightly', 'Monthly'));
