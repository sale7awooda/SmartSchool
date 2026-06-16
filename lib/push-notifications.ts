'use client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isPushNotificationSupported() {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!(await isPushNotificationSupported())) return null;
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
}

export async function subscribeUserToPush(user: { id: string; name: string; role: string }) {
  if (!(await isPushNotificationSupported())) {
    throw new Error('Push notifications are not supported on this browser.');
  }

  // Request user permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied.');
  }

  // Get active registration
  const registration = await navigator.serviceWorker.ready;

  // Crucial Fix: If an existing subscription exists, unsubscribe it first.
  // PushManager throws InvalidAccessError if we try to subscribe using a new/different VAPID public key
  // while an active subscription exists.
  try {
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Unsubscribing existing subscription before registering new key...');
      await existingSubscription.unsubscribe();
    }
  } catch (err) {
    console.warn('Failed to check or unsubscribe existing push registration:', err);
  }

  // Fetch VAPID public key
  const vapidRes = await fetch('/api/push/vapid-public-key');
  if (!vapidRes.ok) {
    throw new Error('Failed to fetch the push server VAPID key.');
  }
  const { publicKey } = await vapidRes.json();
  if (!publicKey) {
    throw new Error('VAPID public key was not returned by server.');
  }

  const convertedKey = urlBase64ToUint8Array(publicKey);

  // Subscribe to push service
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey
  });

  // Save on our backend
  const saveRes = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription,
      userId: user.id,
      userRole: user.role,
      userName: user.name
    })
  });

  if (!saveRes.ok) {
    const errorData = await saveRes.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to register subscription on server.');
  }

  return { success: true, subscription };
}

export async function unsubscribeUserFromPush() {
  if (!(await isPushNotificationSupported())) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    // Delete from server first
    await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
      method: 'DELETE'
    });
    
    // Unsubscribe from browser push manager
    await subscription.unsubscribe();
    return true;
  }
  
  return false;
}
