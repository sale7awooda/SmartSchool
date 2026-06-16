const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing supabase credentials in env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const runMigrations = async () => {
  const sql = `
    -- 1. Ensure assessments table has needed columns
    ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    ALTER TABLE assessments ADD COLUMN IF NOT EXISTS academic_year TEXT;
    ALTER TABLE assessments ADD COLUMN IF NOT EXISTS teacher_id UUID;
    
    -- 2. Ensure submissions table exists and is fully configured
    -- Let's check columns for submissions to ensure it works correctly
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    
    -- 3. Create indices to speed up queries
    ALTER TABLE users ADD COLUMN IF NOT EXISTS designation TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS salary NUMERIC;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS certificate TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS account_number TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS join_date DATE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS extra_info TEXT;
    
    CREATE INDEX IF NOT EXISTS idx_assessments_is_deleted ON assessments(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_assessments_academic_year ON assessments(academic_year);
  `;

  console.log("Running SQL migrations...");
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
  if (error) {
    console.error("Migration error:", error);
  } else {
    console.log("Migration completed successfully!", data);
  }
};

runMigrations();
