-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable the pg_net extension for HTTP requests (required to call the Edge Function)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Note: Replace 'https://YOUR_PROJECT_REF.supabase.co' with your actual Supabase project URL
-- Note: Replace 'YOUR_ANON_KEY' with your actual Supabase anon key

-- Schedule the job to run every minute (FOR TESTING ONLY)
-- Syntax: cron.schedule('job_name', 'cron_schedule', 'query')
SELECT cron.schedule(
  'generate-monthly-invoices',
  '* * * * *', -- Every minute
  $$
    SELECT net.http_post(
        url:='https://qajdlvlwigjrdcnxejts.supabase.co/functions/v1/generate-invoices',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhamRsdmx3aWdqcmRjbnhlanRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0Nzk3MzQsImV4cCI6MjA5NjA1NTczNH0.FeseI553Cv79yggo_0Acz4sTYSFU3xChGXEtffePIAQ"}'::jsonb
    );
  $$
);

-- Note: If you want it to run EVERY night (to catch leases that start mid-month), 
-- you would change '0 0 1 * *' to '0 0 * * *'

-- To unschedule/remove the job later, you can run:
-- SELECT cron.unschedule('generate-monthly-invoices');
