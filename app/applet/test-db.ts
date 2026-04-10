import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  throw new Error('Supabase environment variables not found');
}

const url = urlMatch[1];
const key = keyMatch[1];

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('classes').select('*').limit(1);
  console.log(JSON.stringify(data, null, 2));
}
test();
