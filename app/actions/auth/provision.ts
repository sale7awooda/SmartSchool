'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { isDevMode } from '@/lib/config';

export async function ensureDefaultUserAndAuth(email: string, password = 'password123') {
  if (!isDevMode()) return null;
  const adminClient = createAdminClient();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id, email, role, name')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingUser) {
      return existingUser;
    }

    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      console.error("Failed to list auth users in ensureDefaultUserAndAuth:", listError);
    }

    let authUser = users?.find(u => u.email?.toLowerCase() === cleanEmail);
    let userId = authUser?.id;

    let role = 'student';
    let name = cleanEmail.split('@')[0];

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

    name = name.split(/[._-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    if (!userId) {
      const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true
      });
      if (createError) {
        console.warn("Auth user creation failed or existed outside of default listing:", createError.message);
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

export async function autoProvisionUserAuthAction(identifier: string, password = 'password123') {
  try {
    const adminClient = createAdminClient();
    const { resolveUserEmailAction } = await import('./resolve');
    const dbResolved = await resolveUserEmailAction(identifier);
    if (!dbResolved) {
      return { success: false, message: 'User not found in system database.' };
    }

    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) throw listError;

    const existingAuth = users?.find(u => u.email?.toLowerCase() === dbResolved.email.toLowerCase());

    if (existingAuth) {
      if (existingAuth.id !== dbResolved.id) {
        console.log(`[AUTH HEAL] Mismatched UUID detected for ${dbResolved.email}. DB: ${dbResolved.id}, Auth: ${existingAuth.id}. Updating...`);

        await adminClient.from('users').update({ id: existingAuth.id }).eq('id', dbResolved.id);
        await adminClient.from('students').update({ user_id: existingAuth.id }).eq('user_id', dbResolved.id);
        await adminClient.from('staff').update({ user_id: existingAuth.id }).eq('user_id', dbResolved.id);
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(existingAuth.id, {
        password: password,
        email_confirm: true
      });
      if (updateError) throw updateError;
    } else {
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
