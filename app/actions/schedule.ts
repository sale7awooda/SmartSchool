'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function getSchedulesAction(classId?: string, academicYear?: string) {
  try {
    let query = adminClient
      .from('schedules')
      .select(`
        *,
        teacher:users(name),
        subject:subjects(name),
        class:classes(name)
      `);

    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning empty schedules list.');
      return [];
    }
    throw error;
  }
}
