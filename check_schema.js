const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('system_settings').select('*').limit(1);
  if (error) {
    console.error("Select error:", error);
  } else {
    console.log("Rows:", data);
  }
}
run();
