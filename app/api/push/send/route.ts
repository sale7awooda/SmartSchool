import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getVapidKeys } from '@/lib/api/web-push-setup';
import { getAllSubscriptions, getSubscriptionsForRole, getSubscriptionsForUser, removeSubscription } from '@/lib/api/push-subscriptions-store';

// We run dynamic check or configure web-push setup
function initializeWebPush() {
  const keys = getVapidKeys();
  webpush.setVapidDetails(
    'mailto:sale7awooda@gmail.com', // Dynamic fallback/contact mail
    keys.publicKey,
    keys.privateKey
  );
}

export async function POST(req: NextRequest) {
  try {
    initializeWebPush();
    
    const body = await req.json();
    const { title, content, url, targetAudience, targetUserId } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Missing title or content notification payload' }, { status: 400 });
    }

    // 1. Gather relevant subscriptions based on audiences
    let targets = await getAllSubscriptions();

    if (targetUserId) {
      targets = await getSubscriptionsForUser(targetUserId);
    } else if (targetAudience && targetAudience !== 'all') {
      targets = await getSubscriptionsForRole(targetAudience);
    }

    if (targets.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No subscribers found matching the target audience.', 
        dispatchedCount: 0 
      });
    }

    // 2. Map payload
    const notificationPayload = JSON.stringify({
      title,
      body: content,
      url: url || '/dashboard'
    });

    const results = await Promise.all(
      targets.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.subscription.endpoint,
              keys: sub.subscription.keys
            },
            notificationPayload
          );
          return { id: sub.id, status: 'success' };
        } catch (error: any) {
          console.error(`Error sending push notification to subscriber ${sub.id}:`, error);
          
          // If the subscription is expired, invalid, or obsolete (410 or 404), prune it.
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Pruning expired subscriber ${sub.id}`);
            await removeSubscription(sub.subscription.endpoint);
            return { id: sub.id, status: 'pruned', error: error.message };
          }
          
          return { id: sub.id, status: 'failed', error: error.message };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'success').length;
    const prunedCount = results.filter(r => r.status === 'pruned').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      message: `Dispatched notifications successfully to ${successCount} node(s)`,
      dispatchedCount: targets.length,
      stats: {
        success: successCount,
        pruned: prunedCount,
        failed: failedCount
      },
      details: results
    });

  } catch (error: any) {
    console.error('Error in /api/push/send:', error);
    return NextResponse.json({ error: error.message || 'Notification broadcast failed' }, { status: 500 });
  }
}
