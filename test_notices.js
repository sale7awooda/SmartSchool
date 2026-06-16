const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('notices').insert([{
    title: 'test',
    content: 'test',
    target_audience: 'Everyone',
    is_important: false,
    author_id: '11111111-1111-1111-1111-111111111111',
    is_published: true,
    published_at: new Date().toISOString()
  }]);
  if (error) {
    console.error("Notice error:", error);
  } else {
    console.log("Success:", data);
  }
}
run();
