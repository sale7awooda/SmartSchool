const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('notices').select('*').limit(1);
  if (error) {
    console.error("Select error:", error);
  } else {
    // If no row, let's insert a dummy one that will fail RLS to see the error, but we don't know the columns.
    // wait, we can just look at `schema.sql` or `seed.sql`?
  }
}
run();
