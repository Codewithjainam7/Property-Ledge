const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qajdlvlwigjrdcnxejts.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhamRsdmx3aWdqcmRjbnhlanRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0Nzk3MzQsImV4cCI6MjA5NjA1NTczNH0.FeseI553Cv79yggo_0Acz4sTYSFU3xChGXEtffePIAQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: team, error: teamErr } = await supabase
    .from('property_team')
    .select('can_view_property')
    .limit(1);
  console.log("Team Row:", team, "Error:", teamErr);
}

inspect();
