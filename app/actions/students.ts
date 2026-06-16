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
  paymentStructure: z.string().optional(),
  baseFeeAmount: z.string().optional(),
  isCustomFee: z.string().optional(),
  joiningDate: z.string().optional(),
  discountPercentage: z.string().optional(),
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
      paymentStructure: formData.get('paymentStructure') as string,
      baseFeeAmount: formData.get('baseFeeAmount') as string,
      isCustomFee: formData.get('isCustomFee') as string,
      joiningDate: formData.get('joiningDate') as string,
      discountPercentage: formData.get('discountPercentage') as string,
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

    const discountNum = updateData.discountPercentage ? parseFloat(updateData.discountPercentage) : undefined;
    
    const updatePayload: any = {
      name: updateData.name,
      grade: updateData.grade,
      roll_number: updateData.studentId,
      dob: updateData.dob,
      gender: updateData.gender,
      address: updateData.address,
      fee_structure: updateData.feeStructure,
      payment_structure: updateData.paymentStructure,
      base_fee_amount: updateData.baseFeeAmount ? parseFloat(updateData.baseFeeAmount) : null,
      is_custom_fee: updateData.isCustomFee === 'true',
      additional_info: updateData.additionalInfo
    };
    
    if (updateData.joiningDate !== undefined) {
      updatePayload.joining_date = updateData.joiningDate || null;
    }
    
    if (discountNum !== undefined) {
      updatePayload.discount_percentage = discountNum;
    }

    const { error: studentError, data: student } = await supabase
      .from('students')
      .update(updatePayload)
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

    // Recalculate invoices when fee or discount updates
    try {
      const adminClient = createAdminClient();
      
      // Fetch existing invoices
      const { data: existingInvoices } = await adminClient
        .from('fee_invoices')
        .select('*')
        .eq('student_id', student.id);

      const invoicesList = existingInvoices || [];
      const paidInvoices = invoicesList.filter(inv => inv.status === 'paid');
      const paidAmount = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

      const baseFee = student.base_fee_amount || (updateData.baseFeeAmount ? parseFloat(updateData.baseFeeAmount) : 3000);
      const discountPct = student.discount_percentage || (updateData.discountPercentage ? parseFloat(updateData.discountPercentage) : 0);
      const finalAnnualFee = baseFee * (1.0 - (discountPct / 100.0));
      const remainingToPay = Math.max(0, finalAnnualFee - paidAmount);

      // Delete existing unpaid (pending & overdue) bills
      await adminClient
        .from('fee_invoices')
        .delete()
        .eq('student_id', student.id)
        .in('status', ['pending', 'overdue']);

      // Calculate installment numbers
      const paymentStr = student.payment_structure || updateData.paymentStructure || 'Term';
      let numInstallments = 1;
      const digitsMatch = paymentStr.match(/\d+/);
      
      if (digitsMatch) {
        numInstallments = parseInt(digitsMatch[0], 10);
      } else if (paymentStr.toLowerCase().includes('term')) {
        numInstallments = 3;
      } else if (paymentStr.toLowerCase().includes('monthly')) {
        numInstallments = 10;
      }

      const unpaidInstallmentsCount = Math.max(1, numInstallments - paidInvoices.length);
      let baseInstallment = (remainingToPay / unpaidInstallmentsCount >= 100)
        ? Math.ceil((remainingToPay / unpaidInstallmentsCount) / 100) * 100
        : Math.round(remainingToPay / unpaidInstallmentsCount);
      let lastInstallment = remainingToPay - (baseInstallment * (unpaidInstallmentsCount - 1));
      
      if (lastInstallment <= 0) {
        baseInstallment = Math.round(remainingToPay / unpaidInstallmentsCount);
        lastInstallment = remainingToPay - (baseInstallment * (unpaidInstallmentsCount - 1));
      }
      
      const now = new Date();
      const invoicePromises = [];

      for (let j = 0; j < unpaidInstallmentsCount; j++) {
        const dueDate = new Date(now);
        dueDate.setMonth(now.getMonth() + j);
        
        const installmentIndex = paidInvoices.length + j + 1;
        const amountForThisInstallment = j === (unpaidInstallmentsCount - 1) ? lastInstallment : baseInstallment;

        if (amountForThisInstallment > 0) {
          invoicePromises.push(
            adminClient
              .from('fee_invoices')
              .insert({
                student_id: student.id,
                title: `Installment ${installmentIndex} of ${numInstallments}`,
                description: `Installment ${installmentIndex} of ${numInstallments}`,
                amount: amountForThisInstallment,
                status: 'pending',
                due_date: dueDate.toISOString().split('T')[0],
                academic_year: student.academic_year || '2025-2026'
              })
          );
        }
      }

      if (invoicePromises.length > 0) {
        await Promise.all(invoicePromises);
      }

      // Update student total_due and total_paid balance
      await adminClient
        .from('students')
        .update({ 
            total_due: finalAnnualFee,
            total_paid: paidAmount
          })
          .eq('id', student.id);
    } catch (updateBillingError) {
      console.error("[Billing Update Warning] Error during student update billing recalculation:", updateBillingError);
    }

    // Handle Parent
    if (updateData.parentName && updateData.parentPhone) {
      const parentEmailToUse = updateData.parentEmail || `parent_${updateData.parentPhone.replace(/\D/g, '')}@smartschool.com`;
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
            
            if (parentAuthError) {
              console.warn("Parent auth creation error, attempting fallback:", parentAuthError);
              const { data: fallbackAuthData, error: fallbackError } = await adminClient.auth.signUp({
                email: parentEmailToUse,
                password: parentPassword || 'password123',
                options: {
                  data: { name: updateData.parentName, role: 'parent' }
                }
              });
              if (!fallbackError) {
                parentAuthUser = fallbackAuthData?.user || undefined;
              }
            } else {
              parentAuthUser = parentAuthData?.user || undefined;
            }
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

    // Automatically void any unpaid (pending & overdue) installments
    const adminClient = createAdminClient();
    await adminClient
      .from('fee_invoices')
      .update({ status: 'void' })
      .eq('student_id', student_id)
      .in('status', ['pending', 'overdue']);

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
      paymentStructure: formData.get('paymentStructure') as string,
      baseFeeAmount: formData.get('baseFeeAmount') as string,
      isCustomFee: formData.get('isCustomFee') as string,
      joiningDate: formData.get('joiningDate') as string,
      discountPercentage: formData.get('discountPercentage') as string,
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
      return { success: false, message: `A student with this ID (${studentData.studentId}) already exists.` };
    }

    // 1. Create the student auth profile
    const studentEmail = `${studentData.studentId.trim().toLowerCase()}@smartschool.com`;
    const parentEmail = studentData.parentEmail || `parent_${studentData.parentPhone?.replace(/\D/g, '')}@smartschool.com`;
    
    // Check if auth user exists first
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
    
    let authUser = listData?.users.find(u => u.email === studentEmail);
    
    if (!authUser) {
      // Create the student auth profile
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: studentEmail,
        email_confirm: true,
        password: 'password123',
        user_metadata: { name: studentData.name, role: 'student' }
      });

      if (authError) {
        console.warn("Admin createUser failed, attempting standard signUp fallback...", authError);
        // Fallback: Use standard signUp if service_role key is missing
        const { data: fallbackAuthData, error: fallbackError } = await adminClient.auth.signUp({
          email: studentEmail,
          password: 'password123',
          options: {
            data: { name: studentData.name, role: 'student' }
          }
        });

        if (fallbackError) {
          console.error("Auth creation fallback error:", fallbackError);
          return { success: false, message: "Failed to create student auth profile: " + (authError.message || fallbackError.message) };
        }
        authUser = fallbackAuthData?.user || undefined;
      } else {
        authUser = authData?.user || undefined;
      }
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
    const discountNum = studentData.discountPercentage ? parseFloat(studentData.discountPercentage) : 0;
    
    const { data: student, error: studentError } = await adminClient
      .from('students')
      .insert([{
        user_id: user.id,
        name: studentData.name,
        grade: studentData.grade,
        roll_number: studentData.studentId,
        dob: studentData.dob,
        gender: studentData.gender,
        address: studentData.address,
        academic_year: studentData.academicYear || '2025-2026',
        fee_structure: studentData.feeStructure,
        payment_structure: studentData.paymentStructure,
        base_fee_amount: studentData.baseFeeAmount ? parseFloat(studentData.baseFeeAmount) : null,
        is_custom_fee: studentData.isCustomFee === 'true',
        joining_date: studentData.joiningDate || null,
        discount_percentage: discountNum,
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

    // Dynamic Programmatic Invoice System Fallback (Elite Design Pattern)
    // Ensures fee invoices are guaranteed to be created instantly regardless of database trigger delays or schema cache sync
    try {
      // 1. Fetch any existing invoices generated by DB automatic triggers
      const { data: triggerInvoices } = await adminClient
        .from('fee_invoices')
        .select('id')
        .eq('student_id', student.id);
      
      if (!triggerInvoices || triggerInvoices.length === 0) {
        console.log(`[Billing System] No trigger-generated invoices found for student ${student.id}. Generating programmatically...`);
        
        // 2. Choose the base annual fee
        // First choice: studentData.baseFeeAmount. Second Choice: standard fee item. Third Choice: standard default
        let baseFee = studentData.baseFeeAmount ? parseFloat(studentData.baseFeeAmount) : (student.base_fee_amount || 3000);
        
        // 3. Apply Scholarship/Discount percentage
        const discountPct = studentData.discountPercentage ? parseFloat(studentData.discountPercentage) : (student.discount_percentage || 0);
        const finalAnnualFee = baseFee * (1.0 - (discountPct / 100.0));
        
        // 4. Parse installment count from selected Payment Structure
        let numInstallments = 1;
        const paymentStr = studentData.paymentStructure || student.payment_structure || 'Term';
        const digitsMatch = paymentStr.match(/\d+/);
        
        if (digitsMatch) {
          numInstallments = parseInt(digitsMatch[0], 10);
        } else if (paymentStr.toLowerCase().includes('term')) {
          numInstallments = 3; // Standard school term default
        } else if (paymentStr.toLowerCase().includes('monthly')) {
          numInstallments = 10; // Monthly breakdown
        }
        
        let baseInstallment = (finalAnnualFee / numInstallments >= 100)
          ? Math.ceil((finalAnnualFee / numInstallments) / 100) * 100
          : Math.round(finalAnnualFee / numInstallments);
        let lastInstallment = finalAnnualFee - (baseInstallment * (numInstallments - 1));
        
        if (lastInstallment <= 0) {
          baseInstallment = Math.round(finalAnnualFee / numInstallments);
          lastInstallment = finalAnnualFee - (baseInstallment * (numInstallments - 1));
        }
        const now = new Date();
        const invoicePromises = [];
        
        for (let i = 1; i <= numInstallments; i++) {
          // Calculate due_date month-by-month
          const dueDate = new Date(now);
          dueDate.setMonth(now.getMonth() + (i - 1));
          const amountForThisInstallment = i === numInstallments ? lastInstallment : baseInstallment;
          
          invoicePromises.push(
            adminClient
              .from('fee_invoices')
              .insert({
                student_id: student.id,
                title: `Installment ${i} of ${numInstallments}`,
                description: `Installment ${i} of ${numInstallments}`,
                amount: amountForThisInstallment,
                status: 'pending',
                due_date: dueDate.toISOString().split('T')[0],
                academic_year: student.academic_year || studentData.academicYear || '2025-2026'
              })
          );
        }
        
        await Promise.all(invoicePromises);
        console.log(`[Billing System] Successfully generated ${numInstallments} invoices representing installment plans.`);
        
        // 5. Update running total_due balance securely on student
        await adminClient
          .from('students')
          .update({ total_due: finalAnnualFee })
          .eq('id', student.id);
      }
    } catch (billingError) {
      console.error("[Billing System Fallback Warning] Programmatic installment invoice generator error:", billingError);
    }

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
              console.warn("Parent admin createUser failed, attempting fallback...", parentAuthError);
              const { data: fallbackAuthData, error: fallbackError } = await adminClient.auth.signUp({
                email: parentEmail,
                password: parentPassword || 'password123',
                options: {
                  data: { name: studentData.parentName, role: 'parent' }
                }
              });
              if (fallbackError) {
                console.error("Parent auth creation fallback error:", fallbackError);
              } else {
                parentAuthUser = fallbackAuthData?.user || undefined;
              }
            } else {
              parentAuthUser = parentAuthData?.user || undefined;
            }
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

export async function syncStudentAuthAction(studentIds: string[]): Promise<CreateStudentState> {
  const adminClient = createAdminClient();
  let successCount = 0;
  let failCount = 0;

  try {
    const { data: students, error: fetchError } = await adminClient
      .from('students')
      .select('*, user:users(*)')
      .in('id', studentIds);

    if (fetchError) throw fetchError;

    for (const student of students || []) {
      try {
        const studentEmail = student.user?.email || `${student.roll_number?.trim().toLowerCase()}@smartschool.com`;
        
        // 1. Check if auth user exists
        const { data: listData } = await adminClient.auth.admin.listUsers();
        let authUser = listData?.users.find(u => u.email === studentEmail);

        if (!authUser) {
          // 2. Create auth user
          const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email: studentEmail,
            email_confirm: true,
            password: 'password123',
            user_metadata: { name: student.name, role: 'student' }
          });

          if (authError) {
            console.error(`Failed to sync auth for ${student.name}:`, authError);
            failCount++;
            continue;
          }
          authUser = authData?.user || undefined;
        }

        if (authUser) {
          // 3. Link student profile to auth ID if different
          if (student.user_id !== authUser.id) {
             // This is tricky because students.user_id FK. 
             // Usually we'd update both users and students.
             await adminClient.from('users').upsert({
               id: authUser.id,
               email: studentEmail,
               name: student.name,
               role: 'student'
             });
             await adminClient.from('students').update({ user_id: authUser.id }).eq('id', student.id);
          }
          successCount++;
        }
      } catch (err) {
        console.error(`Sync error for student ${student.id}:`, err);
        failCount++;
      }
    }

    return { 
      success: true, 
      message: `Sync completed: ${successCount} successful, ${failCount} failed.` 
    };
  } catch (error: any) {
    console.error("Sync Auth Error:", error);
    return { success: false, message: error.message || "Sync failed." };
  }
}
