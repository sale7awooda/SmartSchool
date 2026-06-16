import webpush from 'web-push';
import { createAdminClient } from './supabase/server';
import { getVapidKeys } from './api/web-push-setup';

// Initialize web-push dynamically
let webpushInitialized = false;

async function ensureVapidDetails() {
  if (webpushInitialized) return true;

  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@smartschool.com';

  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    webpushInitialized = true;
    return true;
  }

  try {
    const supabase = await createAdminClient();
    const { data } = await supabase.from('system_settings').select('vapid_public_key, vapid_private_key, vapid_subject').limit(1).maybeSingle();
    if (data?.vapid_public_key && data?.vapid_private_key) {
      webpush.setVapidDetails(
        data.vapid_subject || 'mailto:admin@smartschool.com',
        data.vapid_public_key,
        data.vapid_private_key
      );
      webpushInitialized = true;
      return true;
    }
  } catch (err) {
    console.error('Failed to lazily load VAPID keys from Supabase system_settings:', err);
  }

  // Backup fallback using generated/generated files
  try {
    const keys = getVapidKeys();
    if (keys.publicKey && keys.privateKey) {
      webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
      webpushInitialized = true;
      return true;
    }
  } catch (err) {
    console.error('Failed to resolve backup VAPID keys programmatically:', err);
  }

  return false;
}


interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  actions?: any[];
}

export async function sendPushNotification(userId: string, payload: PushPayload) {
  await ensureVapidDetails();
  const supabase = await createAdminClient();

  // Get all active subscriptions for this user
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching push subscriptions:', error);
    return { success: false, error };
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { success: true, sent: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys as any,
          },
          JSON.stringify(payload)
        );
        return true;
      } catch (err: any) {
        // If subscription is expired or revoked, delete it
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log('Push subscription expired, deleting...');
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
        throw err;
      }
    })
  );

  const sentCount = results.filter((r) => r.status === 'fulfilled').length;
  return { success: true, sent: sentCount };
}

export async function sendPushToRole(role: string, payload: PushPayload) {
  await ensureVapidDetails();
  const supabase = await createAdminClient();

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_role', role);

  if (error) {
    console.error('Error fetching push subscriptions by role:', error);
    return { success: false, error };
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { success: true, sent: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys as any,
          },
          JSON.stringify(payload)
        );
        return true;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
        throw err;
      }
    })
  );

  const sentCount = results.filter((r) => r.status === 'fulfilled').length;
  return { success: true, sent: sentCount };
}
