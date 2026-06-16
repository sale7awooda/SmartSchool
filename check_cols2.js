const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
require('dotenv').config();

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = createClient(supabaseUrl, serviceRoleKey);
  const { data: visData, error: visError } = await client.from('visitors').select('id, name, purpose, host').limit(1);
  console.log('Visitors columns check:', { success: !visError, data: visData, error: visError });

  const { data: invData, error: invError } = await client.from('inventory').select('id, name, category, quantity, assigned_to, next_maintenance_date').limit(1);
  console.log('Inventory columns check:', { success: !invError, data: invData, error: invError });
}
run();
