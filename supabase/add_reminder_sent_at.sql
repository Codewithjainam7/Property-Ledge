-- Migration: Add reminder_sent_at column to invoices table
-- Run this in your Supabase SQL Editor
-- This prevents overdue reminders being sent multiple times per day

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN invoices.reminder_sent_at IS 'Tracks when the last overdue reminder email was sent to avoid spamming tenants.';
