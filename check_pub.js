const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.example' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('grades').select('*').eq('remarks', 'PUBLICATION_RECORD');
  console.log(error ? error : JSON.stringify(data, null, 2));
}
check();
