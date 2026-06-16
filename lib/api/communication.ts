import { supabase } from '@/lib/supabase/client';

export async function getNotices() {
  try {
    const { data, error } = await supabase
      .from('notices')
      .select('*, author:created_by(name, role)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notices:', error);
      return [];
    }

    const mapped = (data || []).map((item: any) => {
      const roleTarget = item.role_target || [];
      const hasImportant = roleTarget.includes('important') || item.is_important === true;
      const isDeleted = roleTarget.includes('deleted');
      const cleanAudience = roleTarget.filter((r: string) => r !== 'important' && r !== 'deleted')[0] || 'all';

      return {
        id: item.id,
        title: item.title,
        content: item.content,
        created_at: item.created_at,
        createdAt: item.created_at,
        is_important: hasImportant,
        isImportant: hasImportant,
        isDeleted,
        is_deleted: isDeleted,
        target_audience: cleanAudience,
        targetAudience: cleanAudience,
        role_target: roleTarget,
        authorName: item.author?.name || 'System Admin',
        authorRole: item.author?.role || 'admin',
        author_name: item.author?.name || 'System Admin',
        author_role: item.author?.role || 'admin',
        type: 'notice' as const
      };
    });

    return mapped;
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

export async function getBroadcasts() {
  try {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*, author:created_by(name, role)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching broadcasts:', error);
      return [];
    }

    const mapped = (data || []).map((item: any) => {
      const targetAudience = item.target_audience || [];
      const isDeleted = targetAudience.includes('deleted');
      const cleanAudience = targetAudience.filter((r: string) => r !== 'deleted')[0] || 'all';

      return {
        id: item.id,
        title: item.title || 'Broadcast Alert',
        content: item.message || item.content || '',
        message: item.message || item.content || '',
        created_at: item.created_at,
        createdAt: item.created_at,
        is_important: true,
        isImportant: true,
        isDeleted,
        is_deleted: isDeleted,
        target_audience: cleanAudience,
        targetAudience: cleanAudience,
        role_target: targetAudience,
        authorName: item.author?.name || 'System Admin',
        authorRole: item.author?.role || 'admin',
        author_name: item.author?.name || 'System Admin',
        author_role: item.author?.role || 'admin',
        type: 'broadcast' as const
      };
    });

    return mapped;
  } catch (error) {
    console.error('Failed to fetch broadcasts:', error);
    return [];
  }
}



