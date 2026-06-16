const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking notices...");
  const { data: nData, error: nErr } = await supabase.from('notices').select('*').limit(1);
  if (nErr) {
    console.error("Notices fetch failed:", nErr);
  } else {
    console.log("Notice Row sample:", nData?.[0]);
  }

  console.log("Checking broadcasts...");
  const { data: bData, error: bErr } = await supabase.from('broadcasts').select('*').limit(1);
  if (bErr) {
    console.error("Broadcasts fetch failed:", bErr);
  } else {
    console.log("Broadcast Row sample:", bData?.[0]);
  }
}

check();
