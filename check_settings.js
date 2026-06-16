const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('system_settings').select('*').limit(1);
  if (error) console.error(error);
  else console.log("system_settings fields:", Object.keys(data[0] || {}));
}

run();
