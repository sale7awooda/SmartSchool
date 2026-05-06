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
      // Regardless of the error, we fallback to just logging the action since this is a preview
      // environment and audit tables or relations might be missing.
      console.warn(`[AUDIT LOG] (fallback schema) ${actionType} by ${userId}:`, JSON.stringify(details));
    }
  } catch (err) {
    console.warn(`[AUDIT LOG] ${actionType} by ${userId}:`, JSON.stringify(details));
  }
}
