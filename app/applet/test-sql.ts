import { supabase } from '@/lib/supabase/client';

async function check() {
  const { data, error } = await supabase.from('parent_student').select('*').limit(1);
  console.log("Data:", data, "Error:", error);
}

check();
