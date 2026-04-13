import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/lib/mock-db';

export async function getNotices() {
  try {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notices:', error);
      return [];
    }

    return data;
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Supabase connection failed. Returning empty notices list.');
      return [];
    }
    throw error;
  }
}


export async function createNotice(noticeData: any) {
  const { data, error } = await supabase
    .from('notices')
    .insert([noticeData])
    .select()
    .single();

  if (error) {
    console.error('Error creating notice:', error);
    throw error;
  }

  return data;
}


export async function getMessages(userId: string, otherUserId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data;
}


export async function sendMessage(messageData: any) {
  const { data, error } = await supabase
    .from('messages')
    .insert([messageData])
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }

  return data;
}


export async function getUsersForChat() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role');

  if (error) {
    console.error('Error fetching users for chat:', error);
    return [];
  }

  return data;
}


