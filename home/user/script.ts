import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data, error, count } = await supabaseAdmin
    .from('students')
    .select('*', { count: 'exact' });
  console.log('Error:', error);
  console.log('Count:', count);
  console.log('Data:', JSON.stringify(data, null, 2));
}

run();
