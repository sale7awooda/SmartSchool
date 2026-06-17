import { createAdminClient } from './supabase/server';
import { sendPushNotification } from './push-notifications-server';
import { getResend } from './resend';
import { notificationTemplate } from './email-templates';

interface NotificationOptions {
  userId: string;
  title: string;
  message: string;
  url?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  sendPush?: boolean;
  sendEmail?: boolean;
  emailSubject?: string;
}

export async function sendNotification({
  userId,
  title,
  message,
  url,
  type = 'info',
  sendPush = true,
  sendEmail = false,
  emailSubject
}: NotificationOptions) {
  const supabase = await createAdminClient();

  // 1. Create In-App Notification
  const { data: notification, error: dbError } = await supabase
    .from('user_notifications')
    .insert([{
      user_id: userId,
      title,
      message,
      url,
      type,
      status: 'unread'
    }])
    .select()
    .single();

  if (dbError) {
    console.error('Error creating in-app notification:', dbError);
  }

  // 2. Send Push Notification if requested
  if (sendPush) {
    try {
      await sendPushNotification(userId, {
        title,
        body: message,
        url
      });
    } catch (err) {
      console.error('Error sending push notification:', err);
    }
  }

  // 3. Send Email Notification if requested
  if (sendEmail) {
    const resend = getResend();
    if (resend) {
      try {
        // Fetch user email
        const { data: user } = await supabase
          .from('users')
          .select('email, name')
          .eq('id', userId)
          .single();

        if (user && user.email) {
          const html = notificationTemplate({
            title,
            message,
            url,
            type,
          });

          await resend.emails.send({
            from: 'Smart School <notifications@smartschool.edu>',
            to: user.email,
            subject: emailSubject || title,
            html,
          });
        }
      } catch (err) {
        console.error('Error sending email notification:', err);
      }
    }
  }

  return notification;
}
