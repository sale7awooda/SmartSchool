const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function probe() {
  const rpcNames = ['exec_sql', 'execute_sql', 'run_sql', 'exec', 'run'];
  const argNames = ['sql_string', 'sql', 'query', 'sql_query', 'stmt', 'statement', 'q'];

  console.log("Probing combinations...");
  for (const rpc of rpcNames) {
    for (const arg of argNames) {
      try {
        const { data, error } = await supabase.rpc(rpc, { [arg]: 'SELECT 1 as val' });
        if (error) {
          if (error.code !== 'PGRST202') {
            console.log(`FOUND! RPC: ${rpc}(${arg}) returned error: ${error.message} (code: ${error.code})`);
          }
        } else {
          console.log(`SUCCESS! RPC: ${rpc}(${arg}) returned:`, data);
          return;
        }
      } catch (e) {
        // ignore exception
      }
    }
  }
  console.log("Completed probing all combinations.");
}

probe();
