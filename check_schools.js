const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `;

  // Try different RPC names
  const rpcs = ['exec_sql', 'execute_sql', 'run_sql'];
  let tables = [];
  let success = false;

  for (const rpc of rpcs) {
    try {
      console.log(`Trying RPC: ${rpc}`);
      const { data, error } = await supabase.rpc(rpc, { sql_string: query });
      if (!error && data) {
        console.log(`Success on RPC ${rpc}!`);
        tables = data;
        success = true;
        break;
      } else {
        console.warn(`RPC ${rpc} failed or returned no data:`, error?.message);
      }
    } catch (e) {
      console.warn(`RPC ${rpc} threw an exception:`, e.message);
    }
  }

  if (success) {
    console.log("Tables in database:", tables.map(t => t.table_name || t.val || Object.values(t)[0]));
    
    // Check if table schools exists
    const hasSchools = tables.some(t => {
      const name = t.table_name || t.val || Object.values(t)[0];
      return String(name).toLowerCase() === 'schools';
    });
    
    if (hasSchools) {
      console.log("schools table exists!");
      const colQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'schools';
      `;
      const bestRpc = rpcs.find(r => success); // wait, it's the one we matched
      const { data: cols } = await supabase.rpc('execute_sql', { sql_string: colQuery }); // let's try execute_sql or the successful one
      console.log("Columns of schools table:", cols);
    } else {
      console.log("schools table DOES NOT exist.");
    }
  } else {
    console.log("Failed all RPC methods. Trying standard tables select read to check if schools exists...");
    const { data, error } = await supabase.from('schools').select('*').limit(1);
    if (error) {
      console.log("schools table select check failed or table doesn't exist:", error.message);
    } else {
      console.log("schools table exists! Accessible via standard client.");
    }
  }
}

check();

