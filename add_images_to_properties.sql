-- Run this in the Supabase SQL Editor to add support for multiple property images
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
