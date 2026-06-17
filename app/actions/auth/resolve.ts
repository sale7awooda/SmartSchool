'use server';

import { createAdminClient } from '@/lib/supabase/server';

export async function resolveUserEmailAction(identifier: string): Promise<{ email: string; role: string; id: string } | null> {
  const adminClient = createAdminClient();
  const clean = identifier.trim().toLowerCase();

  if (!clean.includes('@')) {
    const { data: student } = await adminClient
      .from('students')
      .select('user_id, id')
      .ilike('roll_number', clean)
      .maybeSingle();

    if (student) {
      const { data: user } = await adminClient
        .from('users')
        .select('email, role, id')
        .eq('id', student.user_id)
        .maybeSingle();

      if (user) {
        return { email: user.email, role: user.role || 'student', id: user.id };
      }
    }

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

  if (clean.includes('@')) {
    let { data: user } = await adminClient
      .from('users')
      .select('email, role, id')
      .eq('email', clean)
      .maybeSingle();

    if (!user) {
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

    if (!user && clean.endsWith('@smartschool.com')) {
      const { ensureDefaultUserAndAuth } = await import('./provision');
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
