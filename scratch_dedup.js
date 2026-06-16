const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { 
    sql: `
    DELETE FROM submissions
    WHERE id IN (
      SELECT id
      FROM (
        SELECT id,
        ROW_NUMBER() OVER( PARTITION BY assessment_id, student_id ORDER BY created_at DESC ) as row_num
        FROM submissions
      ) t
      WHERE t.row_num > 1
    );
    ALTER TABLE submissions DROP CONSTRAINT IF EXISTS unique_submission_per_student;
    ALTER TABLE submissions ADD CONSTRAINT unique_submission_per_student UNIQUE (assessment_id, student_id);
    `
  });
  console.log('Result:', data, error);
}

run();
