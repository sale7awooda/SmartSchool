import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { subscription, userId, userRole, userName } = await req.json();

    if (!subscription || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // The subscription object contains keys which are complex.
    // We store the ID as a hash of the endpoint to keep it unique and identifiable.
    const id = btoa(subscription.endpoint).substring(0, 50);

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        id,
        user_id: userId,
        user_role: userRole,
        user_name: userName,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        last_used_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Push subscription error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Push unsubscription error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
