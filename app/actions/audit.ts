'use server';

import { createClient } from '@/lib/supabase/server';

export async function simulateLogEvent() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    const auditEvents = [
      {
        action_type: 'FACTORY_RESET',
        severity: 'High',
        module: 'Advanced Settings',
        details: {
          message: 'System data reset executed',
          scope: 'Cleaned all student profiles and historical grades',
          target: 'All core transaction tables',
          options: { preservedAdminCreds: true }
        }
      },
      {
        action_type: 'CONFIG_OVERRIDE',
        severity: 'Medium',
        module: 'Security Override',
        details: {
          message: 'Altered override advanced options',
          changed_fields: {
            supademoMode: 'disabled',
            resend_api_key: '********34',
            mapbox_token: '********pk'
          }
        }
      },
      {
        action_type: 'VISITOR_CHECK_IN',
        severity: 'Low',
        module: 'Operations Hub',
        details: {
          message: 'Checked-in external visiting contractor',
          visitor_name: 'David Millers',
          host_staff: 'Sarah Jenkins',
          duration_allocated: '2 hours'
        }
      },
      {
        action_type: 'ASSET_INVENTORY_ADD',
        severity: 'Low',
        module: 'Inventory Management',
        details: {
          message: 'Added core laboratory devices',
          asset_name: 'Advanced Optical Microscope XG',
          sku_code: 'LAB-MIC-042',
          initial_quantity: 15,
          status: 'Instock'
        }
      },
      {
        action_type: 'GRADE_MODIFIED',
        severity: 'Medium',
        module: 'Academic Performance',
        details: {
          message: 'Adjusted assessment final grade values',
          student: 'Marcus Brody',
          subject: 'Advanced Physics 102',
          original_score: '58%',
          new_score: '75%',
          remark: 'Extra credit correction applied'
        }
      }
    ];

    const randomEvent = auditEvents[Math.floor(Math.random() * auditEvents.length)];

    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      action_type: randomEvent.action_type,
      severity: randomEvent.severity,
      module: randomEvent.module,
      details: randomEvent.details,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error(error);
      throw error;
    }

    return { success: true };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

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
