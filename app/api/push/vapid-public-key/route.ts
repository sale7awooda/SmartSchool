import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getVapidKeys } from '@/lib/api/web-push-setup';

export async function GET() {
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  
  if (!publicKey) {
    try {
      const supabase = await createAdminClient();
      const { data } = await supabase.from('system_settings').select('vapid_public_key').limit(1).maybeSingle();
      if (data?.vapid_public_key) {
        publicKey = data.vapid_public_key;
      }
    } catch (err) {
      console.error('Error fetching dynamic VAPID public key from db:', err);
    }
  }

  // Fall back to generated stable VAPID key pair
  if (!publicKey) {
    try {
      const keys = getVapidKeys();
      publicKey = keys.publicKey;
    } catch (err) {
      console.error('Error getting backup generated VAPID keys:', err);
    }
  }
  
  if (!publicKey) {
    // Ultimate high-durability fallback to prevent 500 failures on client PWA/Push initiation
    publicKey = 'BMWkTliVadM8y0G897IiwC1gtHo5yItE0dpt-YqparhZpk0cT3-m9wsXT5BOENt3Lr6MPSh4dz8Cexklw8Ss7Pg';
  }

  return NextResponse.json({ publicKey });
}

