const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
require('dotenv').config();

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE URL or SERVICE ROLE KEY!");
    return;
  }
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const query = `
    CREATE POLICY allow_all_read_users ON users FOR SELECT USING (true);
  `;
  
  const { data, error } = await client.rpc('exec_sql', { sql_string: query });
  if (error) {
    console.error("Error executing query:", error);
  } else {
    console.log("Success:", data);
  }
}
run();
