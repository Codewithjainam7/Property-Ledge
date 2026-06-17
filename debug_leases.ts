import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeases() {
  const { data: leases, error: lErr } = await supabase.from('leases').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("LAST 5 LEASES:", leases, lErr);

  const { data: properties, error: pErr } = await supabase.from('properties').select('id, address, owner_id').limit(5);
  console.log("PROPERTIES:", properties, pErr);
}

checkLeases();
