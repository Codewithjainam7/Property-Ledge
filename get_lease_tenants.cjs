require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: properties } = await supabase.from('properties').select('id, address');
  if(!properties || properties.length === 0) { console.log("No properties"); return; }
  
  const { data: leaseTenants, error } = await supabase.from('lease_tenants').select('*, tenants(first_name, last_name, status)');
  if (error) console.error(error);
  console.log("Lease tenants:", JSON.stringify(leaseTenants, null, 2));
}
check();
