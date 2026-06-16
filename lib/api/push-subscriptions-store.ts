import { supabase } from '@/lib/supabase/client';
// Note: In a production server environment where we can't use the client bundle, 
// we should use a service role client. For now, since this is for AI Studio preview,
// and we have permissive policies or will use the standard client.

export interface PushSubscriptionDetails {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface UserPushSubscription {
  id: string; 
  userId: string;
  userRole: string;
  userName: string;
  subscription: PushSubscriptionDetails;
  subscribedAt: string;
}

export async function addSubscription(
  userId: string,
  userRole: string,
  userName: string,
  subscription: PushSubscriptionDetails
): Promise<UserPushSubscription> {
  const endpointHash = Buffer.from(subscription.endpoint).toString('base64').substring(0, 32);
  const id = `${userId || 'anon'}-${endpointHash}`;

  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert({
      id,
      user_id: userId,
      user_role: userRole,
      user_name: userName,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      subscribed_at: new Date().toISOString(),
      last_used_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding push subscription to DB:', error);
    throw error;
  }

  return {
    id: data.id,
    userId: data.user_id,
    userRole: data.user_role,
    userName: data.user_name,
    subscription: {
      endpoint: data.endpoint,
      keys: data.keys
    },
    subscribedAt: data.subscribed_at
  };
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);
  
  if (error) {
    console.error('Error removing push subscription from DB:', error);
  }
}

export async function getSubscriptionsForUser(userId: string): Promise<UserPushSubscription[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);
  
  if (error) return [];
  return mapDbSubsToType(data);
}

export async function getSubscriptionsForRole(role: string): Promise<UserPushSubscription[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .ilike('user_role', role);
  
  if (error) return [];
  return mapDbSubsToType(data);
}

export async function getAllSubscriptions(): Promise<UserPushSubscription[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*');
  
  if (error) return [];
  return mapDbSubsToType(data);
}

function mapDbSubsToType(data: any[]): UserPushSubscription[] {
  return data.map(item => ({
    id: item.id,
    userId: item.user_id,
    userRole: item.user_role,
    userName: item.user_name,
    subscription: {
      endpoint: item.endpoint,
      keys: item.keys
    },
    subscribedAt: item.subscribed_at
  }));
}
