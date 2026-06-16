const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
require('dotenv').config();

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await client.from('users').select('extra_info').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('extra_info exists:', data);
  }
}
run();
