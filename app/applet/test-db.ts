
import { createAdminClient } from '@/lib/supabase/server';

async function checkSchema() {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('students')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error selecting from students:', error);
  } else {
    console.log('Columns in students:', data.length > 0 ? Object.keys(data[0]) : 'No data to check columns');
  }

  const { data: users, error: userError } = await adminClient
    .from('users')
    .select('*')
    .limit(1);
  
  if (userError) {
    console.error('Error selecting from users:', userError);
  } else {
    console.log('Columns in users:', users.length > 0 ? Object.keys(users[0]) : 'No data to check columns');
  }
}

checkSchema().catch(console.error);
