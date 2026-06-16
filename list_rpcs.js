const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function list() {
  console.log("Checking what RPCs are registered or what system schema we can access...");
  
  // Try querying pg_proc via REST (usually not exposed unless configured in API schema)
  const { data: procRest, error: procError } = await supabase.from('pg_proc').select('proname').limit(10);
  console.log("pg_proc direct status:", { success: !procError, dataCount: procRest?.length, error: procError?.message });

  // Let's check some known RPCs by calling them
  const testRPCS = ['exec_sql', 'execute_sql', 'run_sql', 'records_fee_payment', 'get_fee_stats'];
  for (const rpc of testRPCS) {
    const { error } = await supabase.rpc(rpc, {});
    console.log(`Checking RPC ${rpc}:`, error?.code === 'PGRST202' ? 'NOT FOUND' : `FOUND (error: ${error?.message || 'none'})`);
  }
}

list();
