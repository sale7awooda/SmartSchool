import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data: d1 } = await supabase.from('leave_requests').select('*').limit(1);
  console.log('leave_requests:', d1);
  const { data: d2 } = await supabase.from('payslips').select('*').limit(1);
  console.log('payslips:', d2);
  const { data: d3 } = await supabase.from('financials').select('*').limit(1);
  console.log('financials:', d3);
}

run();
