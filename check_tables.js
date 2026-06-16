const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const tables = ['users', 'students', 'fee_invoices', 'schedules', 'classes', 'subjects'];
  console.log("Checking standard tables...");
  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' }).limit(1);
    if (error) {
      console.log(`Table ${table} failed: ${error.message}`);
    } else {
      console.log(`Table ${table} exists! Records in DB: ${data.length}, total estimated rows info available:`, count);
    }
  }
}

check();
