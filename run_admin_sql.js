const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'}); // Try .env.local first
require('dotenv').config(); // Fallback to .env

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE URL or SERVICE ROLE KEY!");
    return;
  }
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const query = `
    -- Alter visitors table to ensure host column exists
    ALTER TABLE visitors ADD COLUMN IF NOT EXISTS host TEXT;
    
    -- Alter inventory table to ensure assigned_to and next_maintenance_date columns exist
    ALTER TABLE inventory ADD COLUMN IF NOT EXISTS assigned_to TEXT;
    ALTER TABLE inventory ADD COLUMN IF NOT EXISTS next_maintenance_date TEXT;
    
    -- Verify columns in visitors
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'visitors';
  `;
  
  const { data, error } = await client.rpc('exec_sql', { sql_string: query });
  if (error) {
    console.error("Error executing query via admin client:", error);
  } else {
    console.log("Notices columns query result:", data);
  }
}

run();
