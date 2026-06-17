'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { isDevMode } from '@/lib/config';

export async function bootstrapUserProfile(sessionUser: { id: string; email: string; name?: string }) {
  const adminClient = createAdminClient();

  const { data: existingProfile } = await adminClient
    .from('users')
    .select('*')
    .eq('id', sessionUser.id)
    .maybeSingle();

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

  if (role === 'student' || (isDevMode() && email === 'student@smartschool.com')) {
    let { data: studentRecord } = await adminClient
      .from('students')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

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
      const yearSuffix = '25';
      const prefix = `S${yearSuffix}`;
      let nextRollNumber = `${prefix}003`;
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
          nextRollNumber = `${prefix}003`;
        }
      } catch (err) {
        console.error("Error determining dynamic roll number during bootstrap:", err);
      }

      const { data: newStudentRecord, error: studentError } = await adminClient
        .from('students')
        .insert([{
          user_id: profile.id,
          name: profile.name === 'student' ? 'Bart Student' : profile.name,
          grade: 'Grade 10',
          roll_number: nextRollNumber,
          gender: 'Male',
          academic_year: '2025-2026'
        }])
        .select()
        .single();

      if (!studentError && newStudentRecord) {
        studentRecord = newStudentRecord;
        const { data: updatedProfile } = await adminClient
          .from('users')
          .update({ student_id: newStudentRecord.id, name: profile.name === 'student' ? 'Bart Student' : profile.name })
          .eq('id', profile.id)
          .select()
          .single();
        if (updatedProfile) profile = updatedProfile;
      }
    } else {
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
        const { data: updatedProfile } = await adminClient
          .from('users')
          .update({ student_id: studentRecord.id })
          .eq('id', profile.id)
          .select()
          .single();
        if (updatedProfile) profile = updatedProfile;
      }
    }

    if (studentRecord && isDevMode()) {
      try {
        const { data: parentUser } = await adminClient
          .from('users')
          .select('id')
          .eq('email', 'homer@smartschool.com')
          .maybeSingle();

        if (parentUser) {
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
