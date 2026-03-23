import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client or throw a more descriptive error if needed.
    // For build time, returning a dummy client might be safer.
    console.warn('Supabase environment variables are missing. Supabase client will not function.');
    return {} as any; 
  }

  return supabaseCreateClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
