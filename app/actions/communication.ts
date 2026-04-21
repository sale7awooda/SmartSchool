'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from './audit';

export const CreateNoticeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  target_audience: z.enum(['all', 'parents', 'teachers', 'students', 'staff']),
  is_important: z.boolean().default(false),
  createdBy: z.string().uuid("Invalid user ID")
});

export type CommunicationActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function processCreateNoticeAction(
  prevState: CommunicationActionState,
  formData: FormData
): Promise<CommunicationActionState> {
  const rawData = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
    target_audience: formData.get('target_audience') as string,
    is_important: formData.get('is_important') === 'true',
    createdBy: formData.get('createdBy') as string,
  };

  const validatedFields = CreateNoticeSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { createdBy, ...noticeData } = validatedFields.data;
  const supabase = await createClient();

  const { data: notice, error } = await supabase
    .from('notices')
    .insert([{
      ...noticeData,
      author_id: createdBy,
      is_published: true,
      published_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error(error);
    return { success: false, message: "Failed to publish notice." };
  }

  await logAudit('NOTICE_PUBLISHED', createdBy, {
    notice_id: notice.id,
    target_audience: notice.target_audience,
    is_important: notice.is_important,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: "Notice published successfully." };
}

export const SendMessageSchema = z.object({
  receiver_id: z.string().uuid("Invalid receiver ID"),
  content: z.string().min(1, "Message content cannot be empty").max(2000, "Message is too long"),
  senderBy: z.string().uuid("Invalid sender ID")
});

export async function processSendMessageAction(
  prevState: CommunicationActionState,
  formData: FormData
): Promise<CommunicationActionState> {
  const rawData = {
    receiver_id: formData.get('receiver_id') as string,
    content: formData.get('content') as string,
    senderBy: formData.get('senderBy') as string,
  };

  const validatedFields = SendMessageSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { senderBy, ...messageData } = validatedFields.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from('messages')
    .insert([{
      ...messageData,
      sender_id: senderBy,
      is_read: false
    }]);

  if (error) {
    console.error(error);
    return { success: false, message: "Failed to send message." };
  }

  // Not logging every single message to audit table directly to avoid log flooding
  // Can consider logging high-level analytics elsewhere

  return { success: true, message: "Message sent successfully." };
}
