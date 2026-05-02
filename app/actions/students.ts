'use server';

import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logAudit } from './audit';

const CreateStudentSchema = z.object({
  name: z.string().min(2, "Name is required"),
  studentId: z.string().min(1, "Student ID (Roll Number) is required"),
  grade: z.string().min(1, "Grade is required"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(['Male', 'Female', 'Other']),
  address: z.string().optional(),
  
  // Parent details (optional)
  parentName: z.string().optional().or(z.literal('')),
  parentPhone: z.string().optional().or(z.literal('')),
  parentEmail: z.string().email("Invalid email address").optional().or(z.literal('')),
  parentRelation: z.string().optional(),
  
  // Fee & Academic info
  academicYear: z.string().min(1, "Academic year is required"),
  feeStructure: z.string().optional(),
  additionalInfo: z.string().optional(),

  createdBy: z.string().uuid("Invalid user ID")
});

const UpdateStudentSchema = CreateStudentSchema.partial().extend({
  student_id: z.string().uuid("Invalid student ID"),
  updatedBy: z.string().uuid("Invalid user ID")
});

export type CreateStudentState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function processUpdateStudentAction(
  prevState: CreateStudentState,
  formData: FormData
): Promise<CreateStudentState> {
  try {
    const rawData = {
      student_id: formData.get('student_id') as string,
      name: formData.get('name') as string,
      studentId: formData.get('studentId') as string,
      grade: formData.get('grade') as string,
      dob: formData.get('dob') as string,
      gender: formData.get('gender') as string,
      address: formData.get('address') as string,
      parentName: formData.get('parentName') as string,
      parentPhone: formData.get('parentPhone') as string,
      parentEmail: formData.get('parentEmail') as string,
      parentRelation: formData.get('parentRelation') as string,
      feeStructure: formData.get('feeStructure') as string,
      additionalInfo: formData.get('additionalInfo') as string,
      updatedBy: formData.get('updatedBy') as string,
    };

    const validatedFields = UpdateStudentSchema.safeParse(rawData);

    if (!validatedFields.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: validatedFields.error.flatten().fieldErrors
      };
    }

    const { student_id, updatedBy, ...updateData } = validatedFields.data;
    const supabase = await createClient();

    const { error: studentError, data: student } = await supabase
      .from('students')
      .update({
        name: updateData.name,
        grade: updateData.grade,
        roll_number: updateData.studentId,
        dob: updateData.dob,
        gender: updateData.gender,
        address: updateData.address,
        fee_structure: updateData.feeStructure,
        additional_info: updateData.additionalInfo
      })
      .eq('id', student_id)
      .select()
      .single();

    if (studentError) {
      console.error(studentError);
      return { success: false, message: "Failed to update student record: " + studentError.message };
    }

    if (updateData.name) {
      await supabase.from('users').update({ name: updateData.name }).eq('id', student.user_id);
    }

    // Handle Parent
    if (updateData.parentName && updateData.parentPhone) {
      const parentEmailToUse = updateData.parentEmail || `parent_${updateData.parentPhone.replace(/\D/g, '')}@school.com`;
      const adminClient = createAdminClient();
      let parentId = null;
      try {
        let { data: parent } = await adminClient
          .from('users')
          .select('*')
          .eq('email', parentEmailToUse)
          .eq('role', 'parent')
          .maybeSingle();
        
        if (!parent) {
          const { data: parentPhoneUser } = await adminClient
            .from('users')
            .select('*')
            .eq('phone', updateData.parentPhone)
            .eq('role', 'parent')
            .maybeSingle();
          parent = parentPhoneUser;
        }

        if (!parent) {
          const parentPassword = updateData.parentPhone.replace(/\D/g, '');
          const { data: listData } = await adminClient.auth.admin.listUsers();
          let parentAuthUser = listData?.users.find(u => u.email === parentEmailToUse);
          
          if (!parentAuthUser) {
            const { data: parentAuthData, error: parentAuthError } = await adminClient.auth.admin.createUser({
              email: parentEmailToUse,
              email_confirm: true,
              password: parentPassword || 'password123',
              user_metadata: { name: updateData.parentName, role: 'parent' }
            });
            
            if (parentAuthError) console.error("Parent auth creation error:", parentAuthError);
            parentAuthUser = parentAuthData?.user || undefined;
          }

          if (parentAuthUser) {
            const { data: newParent, error: parentCreateError } = await adminClient
              .from('users')
              .upsert([{
                id: parentAuthUser.id,
                email: parentEmailToUse,
                name: updateData.parentName,
                role: 'parent',
                phone: updateData.parentPhone
              }])
              .select()
              .single();
            if (!parentCreateError) parent = newParent;
          }
        } else {
          // Update existing parent if needed
          await adminClient.from('users').update({
            name: updateData.parentName,
            phone: updateData.parentPhone
          }).eq('id', parent.id);
        }

        if (parent) {
          parentId = parent.id;
          
          await adminClient
            .from('parent_student')
            .delete()
            .eq('student_id', student.id);
            
          await adminClient
            .from('parent_student')
            .insert([{
              parent_id: parent.id,
              student_id: student.id,
              relation: updateData.parentRelation || 'Father'
            }]);
        }
      } catch (err) {
        console.error('Error linking parent in update:', err);
      }
    }

    await logAudit('STUDENT_UPDATED', updatedBy, {
      student_record_id: student_id,
      grade: updateData.grade,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: "Student updated successfully." };
  } catch (error: any) {
    console.error("Update Student Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred during update." };
  }
}

export async function processDeleteStudentAction(
  prevState: CreateStudentState,
  formData: FormData
): Promise<CreateStudentState> {
  try {
    const student_id = formData.get('student_id') as string;
    const deletedBy = formData.get('deletedBy') as string;
    const reason = formData.get('reason') as string;

    if (!student_id || !deletedBy || !reason) {
      return { success: false, message: "Missing required fields for deletion." };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('students')
      .update({ 
        is_deleted: true, 
        deleted_reason: reason 
      })
      .eq('id', student_id);

    if (error) {
      console.error(error);
      return { success: false, message: "Failed to delete student: " + error.message };
    }

    await logAudit('STUDENT_DELETED', deletedBy, {
      student_record_id: student_id,
      reason: reason,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: "Student deleted successfully." };
  } catch (error: any) {
    console.error("Delete Student Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred during deletion." };
  }
}

export async function processCreateStudentAction(
  prevState: CreateStudentState,
  formData: FormData
): Promise<CreateStudentState> {
  try {
    const rawData = {
      name: formData.get('name') as string,
      studentId: formData.get('studentId') as string,
      grade: formData.get('grade') as string,
      dob: formData.get('dob') as string,
      gender: formData.get('gender') as string,
      address: formData.get('address') as string,
      parentName: formData.get('parentName') as string,
      parentPhone: formData.get('parentPhone') as string,
      parentEmail: formData.get('parentEmail') as string,
      parentRelation: formData.get('parentRelation') as string,
      academicYear: formData.get('academicYear') as string,
      studentEmail: formData.get('studentEmail') as string,
      feeStructure: formData.get('feeStructure') as string,
      additionalInfo: formData.get('additionalInfo') as string,
      createdBy: formData.get('createdBy') as string,
    };

    const validatedFields = CreateStudentSchema.safeParse(rawData);

    if (!validatedFields.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: validatedFields.error.flatten().fieldErrors
      };
    }

    const { createdBy, ...studentData } = validatedFields.data;
    const adminClient = createAdminClient();
    const supabase = await createClient();

    // 0. Check if student already exists in database (using admin client to bypass RLS)
    const { data: existingStudent, error: checkError } = await adminClient
      .from('students')
      .select('id')
      .eq('roll_number', studentData.studentId)
      .maybeSingle();

    if (existingStudent) {
      return { success: false, message: "A student with this ID (Roll Number) already exists." };
    }

    // 1. Create the student auth profile
    const studentEmail = `student_${studentData.studentId.toLowerCase()}@school.com`;
    const parentEmail = studentData.parentEmail || `parent_${studentData.parentPhone?.replace(/\D/g, '')}@school.com`;
    
    // Check if auth user exists first
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
    
    let authUser = listData?.users.find(u => u.email === studentEmail);
    
    if (!authUser) {
      // Create the student auth profile
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: studentEmail,
        email_confirm: true,
        password: studentData.studentId,
        user_metadata: { name: studentData.name, role: 'student' }
      });

      if (authError) {
        console.error("Auth creation error:", authError);
        return { success: false, message: "Failed to create student auth profile: " + authError.message };
      }
      authUser = authData?.user || undefined;
    }

    if (!authUser) {
      return { success: false, message: "Auth profile created but no user data returned." };
    }

    // Upsert the student public profile (since trigger might have already inserted it)
    const { data: user, error: userError } = await adminClient
      .from('users')
      .upsert([{
        id: authUser.id,
        email: studentEmail,
        name: studentData.name,
        role: 'student',
        phone: null
      }])
      .select()
      .single();

    if (userError) {
      console.error("User profile creation/update error:", userError);
      return { success: false, message: "Failed to create/update student user profile: " + userError.message };
    }

    // 2. Create the student record
    const { data: student, error: studentError } = await adminClient
      .from('students')
      .insert([{
        name: studentData.name,
        grade: studentData.grade,
        roll_number: studentData.studentId,
        dob: studentData.dob,
        gender: studentData.gender,
        address: studentData.address,
        academic_year: studentData.academicYear || '2025-2026',
        fee_structure: studentData.feeStructure,
        additional_info: studentData.additionalInfo
      }])
      .select()
      .single();

    if (studentError) {
      console.error("Student record creation error detail:", JSON.stringify(studentError, null, 2));
      
      const isSchemaCacheError = studentError.code === 'PGRST204' || studentError.message.includes('user_id');
      
      return { 
        success: false, 
        message: isSchemaCacheError 
          ? "Database schema is out of sync. Please run the SQL fix in supabase_fix.sql to add the missing 'user_id' column and reload the schema cache."
          : `Failed to create student record: ${studentError.message} (Code: ${studentError.code}) ${studentError.details || ''}`.trim() 
      };
    }

    // 2.1 Update user profile with student_id (redundancy for easier querying)
    await adminClient
      .from('users')
      .update({ student_id: student.id })
      .eq('id', user.id);

    // 3. Handle Parent Registration if provided
    let parentId = null;
    if (studentData.parentName && studentData.parentPhone) {
      try {
        let { data: parent } = await adminClient
          .from('users')
          .select('*')
          .eq('email', parentEmail)
          .eq('role', 'parent')
          .maybeSingle();
        
        if (!parent) {
          const { data: parentPhoneUser } = await adminClient
            .from('users')
            .select('*')
            .eq('phone', studentData.parentPhone)
            .eq('role', 'parent')
            .maybeSingle();
          parent = parentPhoneUser;
        }

        if (!parent) {
          const parentPassword = studentData.parentPhone.replace(/\D/g, '');
          
          let parentAuthUser = listData?.users.find(u => u.email === parentEmail);
          
          if (!parentAuthUser) {
            const { data: parentAuthData, error: parentAuthError } = await adminClient.auth.admin.createUser({
              email: parentEmail,
              email_confirm: true,
              password: parentPassword || 'password123',
              user_metadata: { name: studentData.parentName, role: 'parent' }
            });
            
            if (parentAuthError) {
              console.error("Parent auth creation error:", parentAuthError);
            }
            parentAuthUser = parentAuthData?.user || undefined;
          }

          if (parentAuthUser) {
            const { data: newParent, error: parentCreateError } = await adminClient
              .from('users')
              .upsert([{
                id: parentAuthUser.id,
                email: parentEmail,
                name: studentData.parentName,
                role: 'parent',
                phone: studentData.parentPhone
              }])
              .select()
              .single();
            
            if (!parentCreateError) parent = newParent;
          }
        }

        if (parent) {
          parentId = parent.id;
          await adminClient
            .from('parent_student')
            .insert([{
              parent_id: parent.id,
              student_id: student.id,
              relation: studentData.parentRelation || 'Parent'
            }]);
        }
      } catch (err) {
        console.error('Error linking parent:', err);
      }
    }

    // 4. Record Audit Log
    await logAudit('STUDENT_ENROLLED', createdBy, {
      student_record_id: student.id,
      student_user_id: user.id,
      grade: student.grade,
      parent_linked: !!parentId,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: "Student registered successfully." };
  } catch (error: any) {
    console.error("Create Student Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred during creation." };
  }
}
