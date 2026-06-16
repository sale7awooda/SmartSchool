const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
require('dotenv').config();

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await client.from('users').select('education').limit(1);
  if (error) console.error('education err: ' + error.message);
  else console.log('education exists');
}
run();
