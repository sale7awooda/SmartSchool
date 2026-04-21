'use server';

import { createClient } from '@/lib/supabase/server';

export async function logAudit(actionType: string, userId: string, details: Record<string, any>) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: actionType,
      details: details,
      created_at: new Date().toISOString()
    });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist, we just mock the audit log
        console.warn(`[AUDIT LOG] ${actionType} by ${userId}:`, JSON.stringify(details));
      } else {
        console.error('Failed to write audit log:', error);
      }
    }
  } catch (err) {
    console.warn(`[AUDIT LOG] ${actionType} by ${userId}:`, JSON.stringify(details));
  }
}
