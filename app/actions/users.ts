'use server';

import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logAudit } from './audit';

// Validation Schema for user roles
const UserRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(['admin', 'accountant', 'teacher', 'staff', 'parent', 'student'])
});

// Helper function to verify caller is admin
async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized: Please log in");
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile || profile.role !== 'admin') {
    throw new Error("Unauthorized: Only admins can perform this action");
  }

  return user.id; // Return admin's user ID for audit logging
}

export async function updateUserProfileAction(
  payload: { name?: string, email?: string, phone?: string }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    // If email changed, we also need to update it in Supabase Auth
    if (payload.email && payload.email !== user.email) {
      const { error: authError } = await supabase.auth.updateUser({ email: payload.email });
      if (authError) throw authError;
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Error updating profile:", err);
    return { success: false, message: err.message || "Failed to update profile" };
  }
}

export async function changePasswordAction(password: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Error changing password:", err);
    return { success: false, message: err.message || "Failed to change password" };
  }
}

export async function updateUserPermissionsAction(
  userId: string, 
  customPermissions: Record<string, string[]>
) {
  try {
    const adminId = await verifyAdmin();

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('users')
      .update({ custom_permissions: customPermissions })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await logAudit('USER_PERMISSIONS_UPDATED', adminId, {
      target_user_id: userId,
      custom_permissions: customPermissions,
      timestamp: new Date().toISOString()
    });

    return { success: true, data };
  } catch (err: any) {
    console.error("Error updating user permissions:", err);
    return { success: false, message: err.message || "Failed to update permissions" };
  }
}

export async function updateStaffMemberAction(
  userId: string, 
  payload: { name: string, email: string, phone: string, role: string, department: string }
) {
  try {
    const adminId = await verifyAdmin();

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await logAudit('STAFF_MEMBER_UPDATED', adminId, {
      target_user_id: userId,
      updates: payload,
      timestamp: new Date().toISOString()
    });

    return { success: true, data };
  } catch (err: any) {
    console.error("Error updating staff member:", err);
    return { success: false, message: err.message || "Failed to update staff member" };
  }
}

export async function updateUserRoleAndDepartmentAction(
  userId: string, 
  role: string, 
  department: string
) {
  try {
    const adminId = await verifyAdmin();

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('users')
      .update({ role, department })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await logAudit('USER_ROLE_DEPARTMENT_UPDATED', adminId, {
      target_user_id: userId,
      role,
      department,
      timestamp: new Date().toISOString()
    });

    return { success: true, data };
  } catch (err: any) {
    console.error("Error updating user role and department:", err);
    return { success: false, message: err.message || "Failed to update user role and department" };
  }
}

export async function updateUserRoleAction(userId: string, role: string) {
  try {
    const adminId = await verifyAdmin();

    // Validate role
    const parsed = UserRoleSchema.safeParse({ userId, role });
    if (!parsed.success) {
      throw new Error("Invalid role or user ID format");
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await logAudit('USER_ROLE_UPDATED', adminId, {
      target_user_id: userId,
      role,
      timestamp: new Date().toISOString()
    });

    return { success: true, data };
  } catch (err: any) {
    console.error("Error updating user role:", err);
    return { success: false, message: err.message || "Failed to update user role" };
  }
}

export async function adminResetUserPasswordAction(userId: string, password: string) {
  try {
    const adminId = await verifyAdmin();

    const adminClient = createAdminClient();
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (authError) throw authError;

    await logAudit('USER_PASSWORD_RESET_BY_ADMIN', adminId, {
      target_user_id: userId,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } catch (err: any) {
    console.error("Error resetting user password as admin:", err);
    return { success: false, message: err.message || "Failed to reset user password" };
  }
}

export async function adminBulkResetPasswordsAction(role: 'student' | 'parent', password: string) {
  try {
    const adminId = await verifyAdmin();

    if (!password || password.length < 6) {
      return { success: false, message: "Password must be at least 6 characters long." };
    }

    const adminClient = createAdminClient();

    // 1. Fetch all users with the specified role
    const { data: usersToReset, error: fetchError } = await adminClient
      .from('users')
      .select('id, name, email')
      .eq('role', role);

    if (fetchError) throw fetchError;
    if (!usersToReset || usersToReset.length === 0) {
      return { success: false, message: `No users found with role "${role}".` };
    }

    // 2. Iterate and reset password for each
    let successCount = 0;
    let failCount = 0;
    for (const u of usersToReset) {
      try {
        const { error: authError } = await adminClient.auth.admin.updateUserById(
          u.id,
          { password }
        );
        if (authError) {
          console.warn(`Could not update auth for ${u.name} (${u.id}):`, authError.message);
          failCount++;
        } else {
          successCount++;
        }
      } catch (e) {
        console.error(`Error resetting auth for user ${u.name} (${u.id}):`, e);
        failCount++;
      }
    }

    await logAudit('BULK_USER_PASSWORD_RESET_BY_ADMIN', adminId, {
      role,
      successCount,
      failCount,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: `Successfully reset password for ${successCount} ${role}s.${failCount > 0 ? ` Failed for ${failCount} users.` : ''}`
    };
  } catch (err: any) {
    console.error("Error doing bulk password reset:", err);
    return { success: false, message: err.message || "Failed to perform bulk password reset" };
  }
}

export async function adminSolidifyStudentEmailsAction() {
  try {
    const adminId = await verifyAdmin();
    const adminClient = createAdminClient();

    // 1. Fetch all students from users table
    const { data: studentUsers, error: fetchError } = await adminClient
      .from('users')
      .select('id, name, email')
      .eq('role', 'student');

    if (fetchError) throw fetchError;
    if (!studentUsers || studentUsers.length === 0) {
      return { success: true, message: "No student users found to solidify." };
    }

    let migratedCount = 0;
    let errorsCount = 0;

    for (const u of studentUsers) {
      const originalEmail = u.email;
      let newEmail = originalEmail.trim().toLowerCase();

      // Check for legacy student_s25001@smartschool.com format
      if (newEmail.startsWith('student_')) {
        newEmail = newEmail.replace('student_', '');
      }

      // Ensure it is sXXXXX@smartschool.com type format and lowercase
      if (newEmail !== originalEmail) {
        try {
          // A. Update in Supabase auth first
          const { error: authError } = await adminClient.auth.admin.updateUserById(
            u.id,
            { email: newEmail, email_confirm: true }
          );

          if (authError && !authError.message.includes("email already exists")) {
            console.error(`Auth update failed for ${originalEmail}:`, authError.message);
            errorsCount++;
            continue;
          }

          // B. Update in public users table
          const { error: dbError } = await adminClient
            .from('users')
            .update({ email: newEmail })
            .eq('id', u.id);

          if (dbError) {
            console.error(`Database email update failed for ${u.name}:`, dbError.message);
            errorsCount++;
          } else {
            migratedCount++;
          }
        } catch (err: any) {
          console.error(`Error migrating user ${u.name}:`, err);
          errorsCount++;
        }
      }
    }

    await logAudit('BULK_EMAIL_SOLIDIFY_BY_ADMIN', adminId, {
      migratedCount,
      errorsCount,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: `Successfully consolidated ${migratedCount} student email formats (from student_sXXXXX to sXXXXX@smartschool.com)${errorsCount > 0 ? ` with errors on ${errorsCount} users.` : '.'}`
    };
  } catch (err: any) {
    console.error("Error migrating student emails:", err);
    return { success: false, message: err.message || "Failed to perform solidification" };
  }
}

