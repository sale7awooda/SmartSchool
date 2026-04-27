'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from './audit';

const MasterEntitySchema = z.object({
  type: z.enum(['year', 'class', 'subject']),
  name: z.string().min(1, "Name is required"),
  createdBy: z.string().uuid("Invalid user ID")
});

export type MasterEntityActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function processCreateMasterEntityAction(
  prevState: MasterEntityActionState,
  formData: FormData
): Promise<MasterEntityActionState> {
  const rawData = {
    type: formData.get('type') as string,
    name: formData.get('name') as string,
    createdBy: formData.get('createdBy') as string,
  };

  const validatedFields = MasterEntitySchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { type, name, createdBy } = validatedFields.data;
  const supabase = await createClient();

  let tableName = '';
  let payload: any = { name };

  if (type === 'year') {
    tableName = 'academic_years';
    payload.is_active = false;
  } else if (type === 'class') {
    tableName = 'classes';
  } else if (type === 'subject') {
    tableName = 'subjects';
  }

  const { error } = await supabase
    .from(tableName)
    .insert([payload]);

  if (error) {
    console.error(error);
    return { success: false, message: `Failed to create ${type}: ${error.message}` };
  }

  await logAudit('MASTER_DATA_CREATED', createdBy, {
    entity_type: type,
    entity_name: name,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully.` };
}

const UpdateMasterEntitySchema = z.object({
  type: z.enum(['year', 'class', 'subject']),
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  payload: z.string(), // JSON string for other specific fields
  updatedBy: z.string().uuid("Invalid user ID")
});

export async function processUpdateMasterEntityAction(
  prevState: MasterEntityActionState,
  formData: FormData
): Promise<MasterEntityActionState> {
  const rawData = {
    type: formData.get('type') as string,
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    payload: formData.get('payload') as string,
    updatedBy: formData.get('updatedBy') as string,
  };

  const validatedFields = UpdateMasterEntitySchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { type, id, name, payload, updatedBy } = validatedFields.data;
  const supabase = await createClient();

  let tableName = '';
  let parsedPayload = {};
  try {
    parsedPayload = JSON.parse(payload);
  } catch (e) {
    return { success: false, message: "Invalid payload format" };
  }

  const updateData: { name: string; is_active?: boolean; [key: string]: any } = { name, ...parsedPayload };

  if (type === 'year') {
    tableName = 'academic_years';
    
    // If activating a year, deactivate others first
    if (updateData.is_active) {
      await supabase.from(tableName).update({ is_active: false }).neq('id', id);
    }
  } else if (type === 'class') {
    tableName = 'classes';
  } else if (type === 'subject') {
    tableName = 'subjects';
  }

  const { data, error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return { success: false, message: `Failed to update ${type}: ${error.message}` };
  }

  await logAudit('MASTER_DATA_UPDATED', updatedBy, {
    entity_type: type,
    entity_name: name,
    entity_id: id,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully.` };
}

const DeleteMasterEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  deletedBy: z.string().uuid("Invalid user ID")
});

export async function processDeleteMasterEntityAction(
  prevState: MasterEntityActionState,
  formData: FormData
): Promise<MasterEntityActionState> {
  const rawData = {
    type: formData.get('type') as string,
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    deletedBy: formData.get('deletedBy') as string,
  };

  const validatedFields = DeleteMasterEntitySchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  const { type, id, name, deletedBy } = validatedFields.data;
  const supabase = await createClient();

  let tableName = '';
  if (type === 'year') tableName = 'academic_years';
  else if (type === 'class') tableName = 'classes';
  else if (type === 'subject') tableName = 'subjects';

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    return { success: false, message: `Failed to delete ${type}: ${error.message}` };
  }

  await logAudit('MASTER_DATA_DELETED', deletedBy, {
    entity_type: type,
    entity_name: name,
    entity_id: id,
    timestamp: new Date().toISOString()
  });

  return { success: true, message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.` };
}
