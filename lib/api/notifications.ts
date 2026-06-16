import { supabase } from '@/lib/supabase/client';

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  url?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  status: 'unread' | 'read';
  created_at: string;
}

export async function getUserNotifications(userId: string) {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as UserNotification[];
}

export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('user_notifications')
    .update({ status: 'read' })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function markAllNotificationsAsRead(userId: string) {
  const { error } = await supabase
    .from('user_notifications')
    .update({ status: 'read' })
    .eq('user_id', userId)
    .eq('status', 'unread');

  if (error) throw error;
}

export async function createNotification(notification: {
  user_id: string;
  title: string;
  message: string;
  url?: string;
  type?: string;
}) {
  const { data, error } = await supabase
    .from('user_notifications')
    .insert([notification])
    .select()
    .single();

  if (error) throw error;
  
  // also trigger push if possible (this would be better in a server function/action)
  return data;
}
