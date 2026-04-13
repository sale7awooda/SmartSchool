import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/lib/mock-db';

export async function getSchedules(classId?: string, academicYear?: string) {
  try {
    let query = supabase
      .from('schedules')
      .select(`
        *,
        teacher:users(name)
      `);

    if (classId) {
      query = query.eq('class_id', classId);
    }

    // academic_year column does not exist on schedules table
    /*
    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }
    */

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


export async function saveSchedule(scheduleData: any) {
  const { data, error } = await supabase
    .from('schedules')
    .upsert(scheduleData, { onConflict: 'class_id,day_of_week,period' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}


export async function saveScheduleDraft(draft: { name: string, constraints: any, mappings: any, schedule: any, academic_year?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('schedule_drafts')
    .upsert({
      name: draft.name,
      constraints: draft.constraints,
      mappings: draft.mappings,
      schedule: draft.schedule,
      // academic_year: draft.academic_year, // column does not exist
      created_by: user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'name' })
    .select()
    .single();

  if (error) throw error;
  return data;
}


export async function getScheduleDrafts(academicYear?: string) {
  try {
    let query = supabase
      .from('schedule_drafts')
      .select('*')
      .order('updated_at', { ascending: false });

    // academic_year column does not exist on schedule_drafts table
    /*
    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }
    */

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning empty drafts list.');
      return [];
    }
    throw error;
  }
}


export async function deleteScheduleDraft(id: string) {
  const { error } = await supabase
    .from('schedule_drafts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}


export async function publishSchedule(scheduleItems: any[], academicYear: string) {
  // First, clear existing schedule
  // academic_year column does not exist on schedules table
  const { error: deleteError } = await supabase
    .from('schedules')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all for now since we can't filter by year

  if (deleteError) throw deleteError;

  const { data, error } = await supabase
    .from('schedules')
    .insert(scheduleItems.map(item => {
      const { academic_year, ...rest } = item;
      return rest;
    }));

  if (error) throw error;
  return data;
}

