'use server';

import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logAudit } from './audit';

const CreateStaffSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(['teacher', 'staff', 'accountant', 'admin', 'principal', 'superintendent']),
  phone: z.string().optional(),
  department: z.string().optional(),
  createdBy: z.string().uuid("Invalid user ID")
});

export type CreateStaffState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function processCreateStaffAction(
  prevState: CreateStaffState,
  formData: FormData
): Promise<CreateStaffState> {
  const rawData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    role: formData.get('role') as string,
    phone: (formData.get('phone') as string) || undefined,
    department: (formData.get('department') as string) || undefined,
    createdBy: formData.get('createdBy') as string,
  };

  const validatedFields = CreateStaffSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { createdBy, ...staffData } = validatedFields.data;

  const adminClient = createAdminClient();
  const supabase = await createClient();

  // Try to create auth user first
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: staffData.email,
    email_confirm: true,
    password: 'password123',
    user_metadata: { name: staffData.name, role: staffData.role }
  });

  if (authError) {
    console.error("Auth creation error:", authError);
    return { success: false, message: "Auth creation failed: " + authError.message };
  }

  const { data: newStaff, error } = await supabase
    .from('users')
    .insert([{
      id: authData.user.id,
      ...staffData,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error(error);
    return { success: false, message: "Database creation failed: " + error.message };
  }

  // Record Audit
  await logAudit('STAFF_CREATED', createdBy, {
    staff_id: newStaff.id,
    role: newStaff.role,
    department: newStaff.department,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: "Staff member added successfully." };
}

const UpdateStaffSchema = CreateStaffSchema.partial().extend({
  staff_id: z.string().uuid("Invalid staff ID"),
  updatedBy: z.string().uuid("Invalid user ID")
});

export async function processUpdateStaffAction(
  prevState: CreateStaffState,
  formData: FormData
): Promise<CreateStaffState> {
  const rawData = {
    staff_id: formData.get('staff_id') as string,
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    role: formData.get('role') as string,
    phone: (formData.get('phone') as string) || undefined,
    department: (formData.get('department') as string) || undefined,
    updatedBy: formData.get('updatedBy') as string,
  };

  const validatedFields = UpdateStaffSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { staff_id, updatedBy, ...staffData } = validatedFields.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from('users')
    .update(staffData)
    .eq('id', staff_id);

  if (error) {
    console.error(error);
    return { success: false, message: "Database update failed: " + error.message };
  }

  await logAudit('STAFF_UPDATED', updatedBy, {
    staff_id: staff_id,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: "Staff member updated successfully." };
}

export async function processDeleteStaffAction(
  prevState: CreateStaffState,
  formData: FormData
): Promise<CreateStaffState> {
  const staff_id = formData.get('staff_id') as string;
  const deletedBy = formData.get('deletedBy') as string;
  const reason = formData.get('reason') as string;

  if (!staff_id || !deletedBy || !reason) {
    return { success: false, message: "Missing required fields for deletion." };
  }

  const supabase = await createClient();

  // Assuming soft delete similar to students, we need is_active or is_deleted
  const { error } = await supabase
    .from('users')
    .update({ 
      is_active: false // Soft delete
    })
    .eq('id', staff_id);

  if (error) {
    console.error(error);
    return { success: false, message: "Failed to delete staff." };
  }

  await logAudit('STAFF_DELETED', deletedBy, {
    staff_id: staff_id,
    reason: reason,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: "Staff member disabled successfully." };
}
