import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching pg_policies...");
  // We can query pg_policies using a simple RPC or query if we have permissions, 
  // but since we are using the anon key, we might not have access to pg_catalog tables directly via PostgREST.
  // Let's try it anyway.
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'condition_reports');

  if (error) {
    console.error("Direct policy query failed (as expected for anon key):", error.message);
    
    // Let's try to query the REST API config or a simple select to see what's allowed.
    console.log("Checking if we can select from condition_reports...");
    const { data: selectData, error: selectError } = await supabase
      .from('condition_reports')
      .select('*');
      
    if (selectError) {
      console.error("Select failed:", selectError);
    } else {
      console.log("Select succeeded! Result:", selectData);
    }
  } else {
    console.log("Policies on condition_reports:", data);
  }
}

run();
