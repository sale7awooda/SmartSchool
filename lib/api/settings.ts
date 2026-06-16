import { supabase } from '@/lib/supabase/client';

export async function getSystemSettings() {
  try {
    // In multi-tenant mod, we should normally fetch the school's specific settings.
    // RLS will ensure we only get our own school's settings if we select all.
    const { data, error } = await supabase.from('system_settings').select('*').limit(1).maybeSingle();
    
    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message?.includes('relation "system_settings" does not exist') || error.message?.includes('Lock broken') || error.message?.includes('Failed to fetch')) {
        // Fallback to localStorage or defaults
        console.warn('Supabase fetch failed silently or table missing. Falling back to local settings.', error);
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('SYSTEM_SETTINGS');
          if (saved) return JSON.parse(saved);
        }
        return {
          school_name: 'Smart School',
          school_address: '123 Education Lane, Learning City',
          school_phone: '+1 (555) 012-3456',
          school_email: 'info@smartschool.edu',
          grading_scale: 'Standard (A-F)',
          theme_color: 'indigo',
          font_family: 'Inter (Default)',
          compact_design: false,
          enable_online_registration: true,
          maintenance_mode: false,
          automatic_attendance: false,
          enable_sms: false,
          currency: 'USD'
        };
      }
      throw error;
    }
    
    if (!data) {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('SYSTEM_SETTINGS');
        if (saved) return JSON.parse(saved);
      }
      return {
        school_name: 'Smart School',
        school_address: '123 Education Lane, Learning City',
        school_phone: '+1 (555) 012-3456',
        school_email: 'info@smartschool.edu',
        grading_scale: 'Standard (A-F)',
        theme_color: 'indigo',
        font_family: 'Inter (Default)',
        compact_design: false,
        enable_online_registration: true,
        maintenance_mode: false,
        automatic_attendance: false,
        enable_sms: false,
        currency: 'USD'
      };
    }
    
    const mappedData = {
        ...data,
        school_address: data.school_address || data.address,
        school_phone: data.school_phone || data.phone,
        school_email: data.school_email || data.email,
        currency: data.currency || 'USD',
        role_permissions: data.role_permissions || null
      };
      return mappedData;
    } catch (error: any) {
    // Handle "Failed to fetch" which happens when the Supabase URL is invalid/placeholder or Lock is broken.
    if ((error instanceof TypeError && error.message === 'Failed to fetch') || error?.name === 'AbortError' || error?.message?.includes('Lock broken')) {
      console.warn('Supabase connection failed or blocked. Falling back to local settings.');
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('SYSTEM_SETTINGS');
        if (saved) return JSON.parse(saved);
      }
      return {
        school_name: 'Smart School',
        school_address: '123 Education Lane, Learning City',
        school_phone: '+1 (555) 012-3456',
        school_email: 'info@smartschool.edu',
        grading_scale: 'Standard (A-F)',
        theme_color: 'indigo',
        font_family: 'Inter (Default)',
        compact_design: false,
        enable_online_registration: true,
        maintenance_mode: false,
        automatic_attendance: false,
        enable_sms: false,
        currency: 'USD'
      };
    }
    throw error;
  }
}


export async function updateSystemSettings(settings: any) {
  // Save to localStorage immediately so client is always updated
  if (typeof window !== 'undefined') {
    localStorage.setItem('SYSTEM_SETTINGS', JSON.stringify(settings));
  }

  try {
    const { updateSystemSettingsServerAction } = await import('@/app/actions/settings');
    const res = await updateSystemSettingsServerAction(settings);
    if (res.success) {
      return res.settings;
    } else {
      console.warn('Server setting save error, falling back to local:', res.error);
      return settings;
    }
  } catch (err: any) {
    console.error('Error updating settings database safely:', err);
    return settings;
  }
}



