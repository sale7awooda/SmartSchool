const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
require('dotenv').config();

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await client.from('users').select('designation').limit(1);
  if (error) {
    console.error('Error designation:', error.message);
  } else console.log('designation exists');
  const { data: d2, error: e2 } = await client.from('users').select('salary').limit(1);
  if (e2) console.error('salary err:', e2.message); else console.log('salary exists');
}
run();
