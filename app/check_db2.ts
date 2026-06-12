import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('schedules').select('*');
  let nullTeacher = 0;
  let nullSubject = 0;
  let nullClass = 0;
  data?.forEach(d => {
    if (!d.teacher_id) nullTeacher++;
    if (!d.subject_id) nullSubject++;
    if (!d.class_id) nullClass++;
  });
  console.log(`Total: ${data?.length}, Null teachers: ${nullTeacher}, null subjects: ${nullSubject}, null classes: ${nullClass}`);
}
run();
