import { createStaff } from './lib/supabase-db';

async function test() {
  try {
    const res = await createStaff({
      name: 'Test Staff',
      email: `test-${Date.now()}@example.com`,
      role: 'staff'
    });
    console.log('Success:', res);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
