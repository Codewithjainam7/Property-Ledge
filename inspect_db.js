import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qajdlvlwigjrdcnxejts.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhamRsdmx3aWdqcmRjbnhlanRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0Nzk3MzQsImV4cCI6MjA5NjA1NTczNH0.FeseI553Cv79yggo_0Acz4sTYSFU3xChGXEtffePIAQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log("=== INSPECTING PROPERTIES ===");
  const { data: properties, error: propErr } = await supabase.from('properties').select('*');
  if (propErr) console.error("Error fetching properties:", propErr);
  else console.log(properties.map(p => ({ id: p.id, address: p.address, tenant_name: p.tenant_name, tenant_email: p.tenant_email })));

  console.log("=== INSPECTING TENANTS ===");
  const { data: tenants, error: tenantErr } = await supabase.from('tenants').select('*');
  if (tenantErr) console.error("Error fetching tenants:", tenantErr);
  else console.log(tenants);

  console.log("=== INSPECTING PROPERTY TEAM ===");
  const { data: team, error: teamErr } = await supabase.from('property_team').select('*');
  if (teamErr) console.error("Error fetching team:", teamErr);
  else console.log(team);
}

inspect();
