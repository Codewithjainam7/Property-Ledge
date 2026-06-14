const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qajdlvlwigjrdcnxejts.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhamRsdmx3aWdqcmRjbnhlanRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0Nzk3MzQsImV4cCI6MjA5NjA1NTczNH0.FeseI553Cv79yggo_0Acz4sTYSFU3xChGXEtffePIAQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test_debug_2234@example.com',
    password: 'password123',
    options: {
        data: {
            full_name: 'Test Name'
        }
    }
  });
  console.log("Response:", JSON.stringify({data, error}, null, 2));
}

test();
