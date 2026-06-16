import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path:'.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
const { data, error } = await supabase.from('fee_invoices').select('*, students!inner(*, users!inner(*))').limit(1);
console.log(error || data);
}
run();
