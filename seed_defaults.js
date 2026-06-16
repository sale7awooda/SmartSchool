import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const accounts = [
  { email: 'admin@smartschool.com', password: 'Admin@123', name: 'System Admin', role: 'admin' },
  { email: 'staff@smartschool.com', password: 'staff@123', name: 'Support Staff', role: 'staff' },
  { email: 'teacher@smartschool.com', password: 'Teacher@123', name: 'Angela Teacher', role: 'teacher' },
  { email: 'accountant@smartschool.com', password: 'Accountant@123', name: 'Kevin Accountant', role: 'accountant' },
  { email: 'parent@smartschool.com', password: 'Parent@123', name: 'Homer Parent', role: 'parent' },
  { email: 'student@smartschool.com', password: 'Student@123', name: 'Bart Student', role: 'student' }
];

async function seedDefaultAccounts() {
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }
  
  for (const account of accounts) {
    let user = usersData.users.find(u => u.email === account.email);
    
    if (user) {
      console.log(`Updating password for ${account.email}`);
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: account.password, email_confirm: true });
      if (updateError) console.error(`Error updating password for ${account.email}:`, updateError);
    } else {
      console.log(`Creating user ${account.email}`);
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { name: account.name, role: account.role }
      });
      if (createError) {
        console.error(`Error creating ${account.email}:`, createError);
        continue;
      }
      user = createData.user;
    }
    
    // Ensure they exist in public.users table
    const { error: upsertError } = await supabaseAdmin.from('users').upsert([
      {
        id: user.id,
        email: account.email,
        name: account.name,
        role: account.role,
        is_active: true
      }
    ]);
    
    if (upsertError) {
      console.error(`Error upserting public user for ${account.email}:`, upsertError);
    } else {
      console.log(`✅ Synced public.users for ${account.email}`);
    }
  }

  // Also fix student/parent linkage if they exist
  const { data: parentUser } = await supabaseAdmin.from('users').select('id').eq('email', 'parent@smartschool.com').single();
  const { data: studentUser } = await supabaseAdmin.from('users').select('id').eq('email', 'student@smartschool.com').single();
  
  if (studentUser) {
    // Check if student record exists
    let { data: studentRecord } = await supabaseAdmin.from('students').select('id').eq('user_id', studentUser.id).single();
    
    if (!studentRecord) {
      // Create student record
      const { data: newStudent } = await supabaseAdmin.from('students').insert({
        user_id: studentUser.id,
        name: 'Bart Student',
        roll_number: 'STU999',
        grade: 'Grade 5',
        gender: 'Male',
        academic_year: '2025-2026'
      }).select('id').single();
      
      studentRecord = newStudent;
      console.log('✅ Created student record for Bart Student');
    }
    
    // Link to parent
    if (parentUser && studentRecord) {
      await supabaseAdmin.from('parent_student').upsert({
        parent_id: parentUser.id,
        student_id: studentRecord.id,
        relation: 'Father'
      }, { onConflict: 'parent_id,student_id' });
      console.log('✅ Linked Bart Student to Homer Parent');
    }
  }
}

seedDefaultAccounts().then(() => console.log('Done!'));
