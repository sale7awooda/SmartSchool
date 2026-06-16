import { supabase } from './supabase/client';

export function getSubdomain(host: string): string | null {
  if (!host) return null;
  
  // Remove port if present
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');
  
  if (parts.length <= 1) return null;
  
  // Ignore standard dev proxy or Cloud Run URLs where first segment is the unique container name
  // e.g. ais-dev-zjctlxvg3eop7udnnmpgu4-29607727025.europe-west2.run.app
  if (parts[0].startsWith('ais-dev-') || parts[0].startsWith('ais-pre-')) {
    return null;
  }
  
  // Localhost sandbox check (e.g., smartschool.localhost)
  if (hostname.endsWith('localhost') && parts.length > 1) {
    return parts[0];
  }

  // General check (e.g. smartschool.schoolapp.com)
  if (parts.length >= 3) {
    return parts[0];
  }
  
  return null;
}

export async function resolveTenantBySubdomain(subdomain: string) {
  if (!subdomain) return null;
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('subdomain', subdomain.toLowerCase())
    .maybeSingle();
  if (error) {
    console.error('Error resolving tenant by subdomain:', error);
    return null;
  }
  return data;
}

export async function getDefaultSchool() {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .or('subdomain.eq.smartschool,name.eq.Smart School')
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('Error fetching default school:', error);
    return null;
  }
  return data;
}
