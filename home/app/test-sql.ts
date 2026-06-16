import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let env = process.env;
try {
  let file = fs.readFileSync('.env.local', 'utf-8');
  let lines = file.split('\n');
  lines.forEach(l => {
    let parts = l.split('=');
    if (parts.length >= 2) env[parts[0]] = parts.slice(1).join('=');
  });
} catch(e) {}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL || '', env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

async function check() {
  const { data, error } = await supabase.from('parent_student').select('*').limit(1);
  console.log("Data:", data, "Error:", error);
}

check();
