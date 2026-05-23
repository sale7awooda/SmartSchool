require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sql = fs.readFileSync('supabase_fix.sql', 'utf8');

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
  if (error) console.error("Error:", error);
  else console.log("Success:", data);
}
run();
