import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { error } = await supabase.rpc('execute_sql', {
       sql_statement: "ALTER TABLE assessments ADD COLUMN IF NOT EXISTS total_marks INTEGER; UPDATE assessments SET total_marks = (SELECT sum(points) FROM assessment_questions WHERE assessment_id = assessments.id); UPDATE assessments SET total_marks = 10 WHERE total_marks IS NULL;"
  });
  
  if (error) {
     console.error("RPC failed:", error);
  } else {
     console.log("Success");
  }
}
main();
