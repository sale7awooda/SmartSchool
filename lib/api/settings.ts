import { supabase } from '@/lib/supabase/client';

export async function getSystemSettings() {
  try {
    const { data, error } = await supabase.from('system_settings').select('*').maybeSingle();
    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message.includes('relation "system_settings" does not exist')) {
        // Fallback to localStorage or defaults
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
          enable_sms: false
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
        enable_sms: false
      };
    }
    
      const mappedData = {
        ...data,
        school_address: data.address || data.school_address,
        school_phone: data.phone || data.school_phone,
        school_email: data.email || data.school_email,
      };
      return mappedData;
    } catch (error: any) {
    // Handle "Failed to fetch" which happens when the Supabase URL is invalid/placeholder
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Falling back to local settings.');
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
        enable_sms: false
      };
    }
    throw error;
  }
}


export async function updateSystemSettings(settings: any) {
  // Map JS keys to DB keys if needed
  const dbData = {
    ...settings,
    address: settings.school_address,
    phone: settings.school_phone,
    email: settings.school_email
  };
  
  // Clean up keys not in DB if desired, but passing them is fine if DB ignores or accepts them.
  // Actually, Supabase upsert might error if we pass columns that don't exist. Let's delete the frontend-only keys.
  delete dbData.school_address;
  delete dbData.school_phone;
  delete dbData.school_email;

  const { data, error } = await supabase.from('system_settings').upsert({ id: 1, ...dbData }).select().maybeSingle();
  
  if (error && (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message.includes('relation "system_settings" does not exist'))) {
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('SYSTEM_SETTINGS', JSON.stringify(settings));
    }
    return settings;
  }
  
  if (error) throw error;
  return data;
}


