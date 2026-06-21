import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Checking properties...");
  const { data: props } = await supabase.from('properties').select('id, tenant_name, rent_amount').limit(5);
  console.log(props);
  
  console.log("\nChecking leases...");
  const { data: leases } = await supabase.from('leases').select('id, property_id, status').limit(5);
  console.log(leases);
  
  console.log("\nChecking tenants...");
  const { data: tenants } = await supabase.from('tenants').select('id, property_id, first_name').limit(5);
  console.log(tenants);

  console.log("\nChecking lease_tenants...");
  const { data: leaseTenants } = await supabase.from('lease_tenants').select('*').limit(5);
  console.log(leaseTenants);
}

check();
