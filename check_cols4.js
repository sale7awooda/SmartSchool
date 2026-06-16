const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
require('dotenv').config();

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = createClient(supabaseUrl, serviceRoleKey);
  const cols = ['gender', 'dob', 'date_of_join', 'account_number', 'join_date'];
  for (const c of cols) {
    const { error } = await client.from('users').select(c).limit(1);
    if (error) console.error(c + ' err: ' + error.message);
    else console.log(c + ' exists');
  }
}
run();
