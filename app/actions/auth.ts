'use server';

import { createAdminClient } from '@/lib/supabase/server';

export async function lookupStudentEmailsByParentEmail(parentEmail: string): Promise<string[]> {
  const adminClient = createAdminClient();

  // 1. Find parent
  const { data: parent } = await adminClient
    .from('users')
    .select('id')
    .eq('email', parentEmail)
    .eq('role', 'parent')
    .maybeSingle();

  if (!parent) return [];

  // 2. Find linked students
  const { data: links } = await adminClient
    .from('parent_student')
    .select('student_id')
    .eq('parent_id', parent.id);

  if (!links || links.length === 0) return [];

  const studentIds = links.map(l => l.student_id);

  // 3. Find student emails directly from users 
  const { data: studentUsers } = await adminClient
    .from('users')
    .select('email')
    .in('student_id', studentIds)
    .eq('role', 'student');
    
  // If student_id isn't reliably set on users, we can look up the students first
  const { data: students } = await adminClient
    .from('students')
    .select('user_id')
    .in('id', studentIds);
    
  if (students && students.length > 0) {
    const userIds = students.map(s => s.user_id);
    const { data: users } = await adminClient
      .from('users')
      .select('email')
      .in('id', userIds)
      .eq('role', 'student');
      
    if (users) {
      return [...new Set([...(studentUsers?.map(u => u.email) || []), ...users.map(u => u.email)])].filter(Boolean) as string[];
    }
  }

  return studentUsers?.map(u => u.email).filter(Boolean) as string[] || [];
}

export async function bootstrapUserProfile(sessionUser: { id: string; email: string; name?: string }) {
  const adminClient = createAdminClient();
  
  // 1. Try to fetch existing profile to keep it idempotent
  const { data: existingProfile } = await adminClient
    .from('users')
    .select('*')
    .eq('id', sessionUser.id)
    .maybeSingle();

  // 2. Determine role based on email pattern
  let role = existingProfile?.role;
  const email = sessionUser.email || existingProfile?.email || '';
  
  if (!role) {
    role = 'parent';
    if (email === 'sale7awooda@gmail.com' || email.startsWith('admin')) role = 'admin';
    else if (email.startsWith('teacher')) role = 'teacher';
    else if (email.startsWith('accountant')) role = 'accountant';
    else if (email.startsWith('staff')) role = 'staff';
    else if (email.startsWith('student') || /^s\d+/i.test(email)) role = 'student';
  }

  const newProfile = {
    id: sessionUser.id,
    email: email,
    name: sessionUser.name || existingProfile?.name || email.split('@')[0],
    role: role
  };

  let profile = existingProfile;
  if (!profile) {
    const { data: createdProfile, error } = await adminClient
      .from('users')
      .insert([newProfile])
      .select()
      .maybeSingle();

    if (error) {
      console.error("Server-side bootstrap failed:", error);
      throw new Error(`Profile creation failed: ${error.message}`);
    }
    profile = createdProfile;
  }

  if (!profile) {
    throw new Error("Failed to retrieve or create profile");
  }

  // 3. Role-specific initialization check (dev-only demo logic gated)
  if (role === 'student' || (isDevMode() && email === 'student@smartschool.com')) {
    // Check if student record exists
    let { data: studentRecord } = await adminClient
      .from('students')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    // If it's the specific quick login student, let's ensure the user name is Bart Student if it's currently 'student'
    if (isDevMode() && email === 'student@smartschool.com' && profile.name === 'student') {
      const { data: updatedUser } = await adminClient
        .from('users')
        .update({ name: 'Bart Student' })
        .eq('id', profile.id)
        .select()
        .single();
      if (updatedUser) profile = updatedUser;
    }

    if (!studentRecord) {
      // Generate standard roll number matching prefix systems (e.g. S25003)
      const yearSuffix = '25'; 
      const prefix = `S${yearSuffix}`;
      let nextRollNumber = `${prefix}003`; // smart fallback
      try {
        const { data: latestRoll } = await adminClient
          .from('students')
          .select('roll_number')
          .ilike('roll_number', `${prefix}%`)
          .order('roll_number', { ascending: false })
          .limit(1);
          
        if (latestRoll && latestRoll.length > 0) {
          const lastId = latestRoll[0].roll_number;
          const lastNumStr = lastId.substring(prefix.length);
          const lastNum = parseInt(lastNumStr, 10);
          if (!isNaN(lastNum)) {
            nextRollNumber = `${prefix}${(lastNum + 1).toString().padStart(3, '0')}`;
          }
        } else {
          nextRollNumber = `${prefix}003`; // Default next if empty
        }
      } catch (err) {
        console.error("Error determining dynamic roll number during bootstrap:", err);
      }

      // Default grade is Grade 10 instead of Unassigned for standard styling format
      const defaultGrade = 'Grade 10';

      // Create student record with default values
      const { data: newStudentRecord, error: studentError } = await adminClient
        .from('students')
        .insert([{
          user_id: profile.id,
          name: profile.name === 'student' ? 'Bart Student' : profile.name,
          grade: defaultGrade,
          roll_number: nextRollNumber,
          gender: 'Male',
          academic_year: '2025-2026'
        }])
        .select()
        .single();

      if (!studentError && newStudentRecord) {
        studentRecord = newStudentRecord;
        // Link student_id back to user
        const { data: updatedProfile } = await adminClient
          .from('users')
          .update({ student_id: newStudentRecord.id, name: profile.name === 'student' ? 'Bart Student' : profile.name })
          .eq('id', profile.id)
          .select()
          .single();
        if (updatedProfile) profile = updatedProfile;
      }
    } else {
      // It exists. Let's heal it if it has placeholder/incorrect values (roll_number starts with STU- or grade is Unassigned)
      let needsUpdate = false;
      const updateData: any = {};
      
      if (studentRecord.roll_number && (studentRecord.roll_number.startsWith('STU-') || studentRecord.roll_number === 'STU999')) {
        const yearSuffix = '25'; 
        const prefix = `S${yearSuffix}`;
        let nextRollNumber = `${prefix}003`; 
        try {
          const { data: latestRoll } = await adminClient
            .from('students')
            .select('roll_number')
            .not('roll_number', 'ilike', 'STU-%')
            .ilike('roll_number', `${prefix}%`)
            .order('roll_number', { ascending: false })
            .limit(1);
            
          if (latestRoll && latestRoll.length > 0) {
            const lastId = latestRoll[0].roll_number;
            const lastNumStr = lastId.substring(prefix.length);
            const lastNum = parseInt(lastNumStr, 10);
            if (!isNaN(lastNum)) {
              nextRollNumber = `${prefix}${(lastNum + 1).toString().padStart(3, '0')}`;
            }
          }
        } catch (err) {
          console.error("Error updating dynamic roll number:", err);
        }
        updateData.roll_number = nextRollNumber;
        needsUpdate = true;
      }

      if (studentRecord.grade === 'Unassigned' || !studentRecord.grade) {
        updateData.grade = 'Grade 10';
        needsUpdate = true;
      }

      if (profile.name === 'student' || studentRecord.name === 'student') {
        updateData.name = 'Bart Student';
        needsUpdate = true;
      }

      if (needsUpdate) {
        const { data: updatedStudentRecord } = await adminClient
          .from('students')
          .update(updateData)
          .eq('id', studentRecord.id)
          .select()
          .single();
        if (updatedStudentRecord) {
          studentRecord = updatedStudentRecord;
        }
      }
      
      if (!profile.student_id) {
         // Sync student_id if missing in users table
         const { data: updatedProfile } = await adminClient
          .from('users')
          .update({ student_id: studentRecord.id })
          .eq('id', profile.id)
          .select()
          .single();
         if (updatedProfile) profile = updatedProfile;
      }
    }

    // Always ensure connection to parent (homer@smartschool.com) exists
    if (studentRecord && isDevMode()) {
      try {
        const { data: parentUser } = await adminClient
          .from('users')
          .select('id')
          .eq('email', 'homer@smartschool.com')
          .maybeSingle();

        if (parentUser) {
          // Check if link already exists
          const { data: existingLink } = await adminClient
            .from('parent_student')
            .select('*')
            .eq('parent_id', parentUser.id)
            .eq('student_id', studentRecord.id)
            .maybeSingle();

          if (!existingLink) {
            await adminClient
              .from('parent_student')
              .insert({
                parent_id: parentUser.id,
                student_id: studentRecord.id,
                relation: 'Father'
              });
            console.log("Auto-linked Bart Student to Homer Parent in bootstrap");
          }
        }
      } catch (linkError) {
        console.error("Error linking parent/student during bootstrap:", linkError);
      }
    }
  }
  
  return profile;
}

function isDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEV_MODE !== 'false';
}

export async function ensureDefaultUserAndAuth(email: string, password = 'password123') {
  if (!isDevMode()) return null;
  const adminClient = createAdminClient();
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Try fetching the existing user in public.users table
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id, email, role, name')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingUser) {
      return existingUser;
    }

    // 2. Fetch the existing auth users to see if they exist in Supabase Auth
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      console.error("Failed to list auth users in ensureDefaultUserAndAuth:", listError);
    }

    let authUser = users?.find(u => u.email?.toLowerCase() === cleanEmail);
    let userId = authUser?.id;

    let role = 'student';
    let name = cleanEmail.split('@')[0];

    // Determine default role and name based on fallback email mappings
    if (cleanEmail === 'admin@smartschool.com' || cleanEmail === 'super@smartschool.com') {
      role = 'admin';
      name = cleanEmail === 'admin@smartschool.com' ? 'Principal Skinner' : 'System Owner';
    } else if (cleanEmail === 'staff@smartschool.com') {
      role = 'staff';
      name = 'Willie MacDougal';
    } else if (cleanEmail === 'teacher@smartschool.com') {
      role = 'teacher';
      name = 'Edna Krabappel';
    } else if (cleanEmail === 'accountant@smartschool.com') {
      role = 'accountant';
      name = 'Angela Martin';
    } else if (cleanEmail === 'homer@smartschool.com') {
      role = 'parent';
      name = 'Homer Simpson';
    } else if (cleanEmail === 'marge@smartschool.com') {
      role = 'parent';
      name = 'Marge Simpson';
    } else if (cleanEmail === 'student@smartschool.com') {
      role = 'student';
      name = 'Bart Simpson';
    } else if (cleanEmail === 'driver@smartschool.com') {
      role = 'staff';
      name = 'Otto Mann';
    } else {
      if (cleanEmail.startsWith('admin')) role = 'admin';
      else if (cleanEmail.startsWith('teacher')) role = 'teacher';
      else if (cleanEmail.startsWith('accountant')) role = 'accountant';
      else if (cleanEmail.startsWith('staff') || cleanEmail.startsWith('driver')) role = 'staff';
      else if (cleanEmail.startsWith('parent')) role = 'parent';
      else if (cleanEmail.startsWith('student') || /^s\d+/i.test(cleanEmail)) role = 'student';
    }

    // Nicely format capitalized display name
    name = name.split(/[._-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    if (!userId) {
      // 3. Create brand new Supabase Auth record on-the-fly
      const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true
      });
      if (createError) {
        console.warn("Auth user creation failed or existed outside of default listing:", createError.message);
        // Quick lookup check again in case of race-conditions
        const { data: { users: reloadedUsers } } = await adminClient.auth.admin.listUsers();
        const found = reloadedUsers?.find(u => u.email?.toLowerCase() === cleanEmail);
        if (found) {
          userId = found.id;
        } else {
          return null;
        }
      } else if (newAuthUser && newAuthUser.user) {
        userId = newAuthUser.user.id;
      }
    }

    if (userId) {
      // 4. Create the public.users record
      const { data: newDbUser, error: dbInsertError } = await adminClient
        .from('users')
        .insert([{
          id: userId,
          email: cleanEmail,
          name: name,
          role: role
        }])
        .select()
        .maybeSingle();

      if (dbInsertError) {
        console.warn("Failed to insert user profile or profile existed:", dbInsertError.message);
        const { data: finalFetch } = await adminClient
          .from('users')
          .select('id, email, role, name')
          .eq('id', userId)
          .maybeSingle();
        return finalFetch;
      }

      console.log(`[PROVISION] Successfully auto-provisioned user database profile for ${cleanEmail}`);
      return newDbUser;
    }
  } catch (err) {
    console.error("[PROVISION] Error auto-provisioning fallback user:", err);
  }

  return null;
}

export async function resolveUserEmailAction(identifier: string): Promise<{ email: string; role: string; id: string } | null> {
  const adminClient = createAdminClient();
  const clean = identifier.trim().toLowerCase();

  // 1. Check if it's a student roll number or ID
  if (!clean.includes('@')) {
    // Check in students table by roll_number
    const { data: student } = await adminClient
      .from('students')
      .select('user_id, id')
      .ilike('roll_number', clean)
      .maybeSingle();

    if (student) {
      // Find the user's email
      const { data: user } = await adminClient
        .from('users')
        .select('email, role, id')
        .eq('id', student.user_id)
        .maybeSingle();

      if (user) {
        return { email: user.email, role: user.role || 'student', id: user.id };
      }
    }

    // Try finding by ID directly if student is UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(clean)) {
      const { data: user } = await adminClient
        .from('users')
        .select('email, role, id')
        .eq('id', clean)
        .maybeSingle();

      if (user) {
        return { email: user.email, role: user.role || 'student', id: user.id };
      }
    }
  }

  // 2. Query by email in users table with automatic format fallback
  if (clean.includes('@')) {
    let { data: user } = await adminClient
      .from('users')
      .select('email, role, id')
      .eq('email', clean)
      .maybeSingle();

    if (!user) {
      // Handle fallback translation from student_s25001@smartschool.com to s25001@smartschool.com or vice-versa
      let altEmail = clean;
      if (clean.startsWith('student_')) {
        altEmail = clean.replace('student_', '');
      } else if (clean.startsWith('s') && /^[s]\d+@/i.test(clean)) {
        altEmail = 'student_' + clean;
      }

      if (altEmail !== clean) {
        const { data: altUser } = await adminClient
          .from('users')
          .select('email, role, id')
          .eq('email', altEmail)
          .maybeSingle();
        user = altUser;
      }
    }

    // Dynamic on-the-fly provisioning if the user is completely missing but matches our unified domain
    if (!user && clean.endsWith('@smartschool.com')) {
      const createdUser = await ensureDefaultUserAndAuth(clean);
      if (createdUser) {
        user = {
          email: createdUser.email,
          role: createdUser.role,
          id: createdUser.id
        };
      }
    }

    if (user) {
      return { email: user.email, role: user.role || 'student', id: user.id };
    }
  }

  // 3. Query parent by phone in users table
  const phoneClean = clean.replace(/\D/g, '');
  if (phoneClean.length >= 8) {
    const { data: users } = await adminClient
      .from('users')
      .select('email, role, id, phone')
      .eq('role', 'parent');

    if (users) {
      const found = users.find(u => u.phone && u.phone.replace(/\D/g, '') === phoneClean);
      if (found) {
        return { email: found.email, role: found.role || 'parent', id: found.id };
      }
    }
  }

  return null;
}

export async function autoProvisionUserAuthAction(identifier: string, password = 'password123') {
  try {
    const adminClient = createAdminClient();
    const dbResolved = await resolveUserEmailAction(identifier);
    if (!dbResolved) {
      return { success: false, message: 'User not found in system database.' };
    }

    // 1. Retrieve auth users list to cross-reference existence and UUIDs
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) throw listError;

    const existingAuth = users?.find(u => u.email?.toLowerCase() === dbResolved.email.toLowerCase());

    if (existingAuth) {
      // Self-healing: if UUIDs are mismatched, align public users UUID to match auth users UUID so join relations work!
      if (existingAuth.id !== dbResolved.id) {
        console.log(`[AUTH HEAL] Mismatched UUID detected for ${dbResolved.email}. DB: ${dbResolved.id}, Auth: ${existingAuth.id}. Updating...`);
        
        // Disable potential constraints or execute updates
        await adminClient.from('users').update({ id: existingAuth.id }).eq('id', dbResolved.id);
        await adminClient.from('students').update({ user_id: existingAuth.id }).eq('user_id', dbResolved.id);
        await adminClient.from('staff').update({ user_id: existingAuth.id }).eq('user_id', dbResolved.id);
      }

      // Update password to synchronize credentials and set confirmed: true
      const { error: updateError } = await adminClient.auth.admin.updateUserById(existingAuth.id, {
        password: password,
        email_confirm: true
      });
      if (updateError) throw updateError;
    } else {
      // Create a brand new auth user using the exact matching public.users row UUID
      const { error: createError } = await adminClient.auth.admin.createUser({
        id: dbResolved.id,
        email: dbResolved.email,
        password: password,
        email_confirm: true
      });
      if (createError) throw createError;
    }

    return { success: true, email: dbResolved.email };
  } catch (err: any) {
    console.error("[AUTH HEAL] Failed to auto-provision user credentials:", err);
    return { success: false, message: err.message || 'Auto-provisioning failed' };
  }
}

