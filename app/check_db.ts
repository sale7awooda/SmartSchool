import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('schedules').select('*');
  if (error) console.error(error);
  console.log(`Total schedules in DB: ${data?.length}`);
  
  // Group by class_id
  const byClass: any = {};
  data?.forEach(d => {
    byClass[d.class_id] = (byClass[d.class_id] || 0) + 1;
  });
  console.log(byClass);
}

run();
