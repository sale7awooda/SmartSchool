const { createAdminClient } = require('./lib/supabase/server');
require('dotenv').config();

async function run() {
  const client = createAdminClient();
  const query = `
    ALTER TABLE system_settings 
    ADD COLUMN IF NOT EXISTS automatic_attendance BOOLEAN DEFAULT false;

    ALTER TABLE system_settings 
    ADD COLUMN IF NOT EXISTS enable_sms BOOLEAN DEFAULT false;

    ALTER TABLE system_settings 
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

    -- Notify PostgREST to reload schema
    NOTIFY pgrst, 'reload schema';
  `;
  
  const { data, error } = await client.rpc('exec_sql', { sql_string: query });
  if (error) {
    console.error("Error executing query via admin client:", error);
  } else {
    console.log("Columns added successfully and schema reloaded:", data);
  }
}

run();
