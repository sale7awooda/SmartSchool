const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('system_settings').select('automatic_attendance').limit(1);
  if (error) console.error("Error for automatic_attendance:", error);

  const { data: d2, error: e2 } = await supabase.from('system_settings').select('currency').limit(1);
  if (e2) console.error("Error for currency:", e2);

  const { data: d3, error: e3 } = await supabase.from('system_settings').select('id, school_name, school_address').limit(1);
  if (e3) console.error("Error for known fields:", e3);
  else console.log("Known fields data:", d3);
}

run();
