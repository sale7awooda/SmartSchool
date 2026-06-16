import { createAdminClient } from './supabase/server';
import { sendPushNotification } from './push-notifications-server';
import { getResend } from './resend';

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
          await resend.emails.send({
            from: 'Smart School <notifications@smartschool.edu>',
            to: user.email,
            subject: emailSubject || title,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
                <h2 style="color: #4f46e5; margin-top: 0;">${title}</h2>
                <p style="color: #1e293b; line-height: 1.6;">${message}</p>
                ${url ? `<a href="${process.env.APP_URL}${url}" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">View Details</a>` : ''}
                <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e2e8f0;" />
                <p style="font-size: 12px; color: #64748b; text-align: center;">
                  You received this notification from Smart School. You can manage your notification preferences in settings.
                </p>
              </div>
            `
          });
        }
      } catch (err) {
        console.error('Error sending email notification:', err);
      }
    }
  }

  return notification;
}
