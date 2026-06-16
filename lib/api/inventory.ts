import { supabase } from '@/lib/supabase/client';

export interface InventoryRecord {
  id: string;
  name: string;
  category: string;
  quantity: number;
  status: string;
  assigned_to: string;
  next_maintenance_date: string;
  created_at?: string;
}

export interface InventoryInput {
  name: string;
  category?: string;
  quantity?: number;
  status?: string;
  assigned_to?: string;
  next_maintenance_date?: string;
}

export function parseInventoryFields(item: Record<string, unknown> | null): InventoryRecord | null {
  if (!item) return null;

  let category = (item.category as string) || 'general';
  let assigned_to = (item.assigned_to as string) || '';
  let next_maintenance_date = (item.next_maintenance_date as string) || '';

  if (!assigned_to && !next_maintenance_date && category.includes(' | ')) {
    const parts = category.split(' | ');
    category = parts[0] || 'general';
    for (const part of parts) {
      if (part.startsWith('Assigned: ')) {
        assigned_to = part.replace('Assigned: ', '');
      } else if (part.startsWith('Maintenance: ')) {
        next_maintenance_date = part.replace('Maintenance: ', '');
      }
    }
  }

  return {
    id: item.id as string,
    name: item.name as string,
    category,
    quantity: (item.quantity as number) || 0,
    status: (item.status as string) || 'Available',
    assigned_to,
    next_maintenance_date,
    created_at: item.created_at as string | undefined,
  };
}

export async function getPaginatedInventory(
  page: number = 1,
  limit: number = 10,
  search: string = ''
) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('inventory')
    .select('*', { count: 'exact' })
    .order('name', { ascending: true });

  if (search) {
    query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    data: (data || []).map((d) => parseInventoryFields(d as Record<string, unknown>)!),
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function createInventoryItem(itemData: InventoryInput) {
  const payload: Record<string, unknown> = {
    name: itemData.name,
    category: itemData.category || 'general',
    quantity: itemData.quantity || 1,
    status: itemData.status || 'Available',
  };

  if (itemData.assigned_to) payload.assigned_to = itemData.assigned_to;
  if (itemData.next_maintenance_date) payload.next_maintenance_date = itemData.next_maintenance_date;

  const { data, error } = await supabase
    .from('inventory')
    .insert([payload])
    .select()
    .single();

  if (error) {
    if (error.message?.includes('column') && (error.message?.includes('assigned_to') || error.message?.includes('next_maintenance_date'))) {
      const combinedCategory = `${itemData.category || 'general'}${itemData.assigned_to ? ` | Assigned: ${itemData.assigned_to}` : ''}${itemData.next_maintenance_date ? ` | Maintenance: ${itemData.next_maintenance_date}` : ''}`;
      const fallbackPayload = { ...payload, category: combinedCategory };
      delete fallbackPayload.assigned_to;
      delete fallbackPayload.next_maintenance_date;

      const { data: retryData, error: retryError } = await supabase
        .from('inventory')
        .insert([fallbackPayload])
        .select()
        .single();

      if (retryError) throw retryError;
      return parseInventoryFields(retryData as Record<string, unknown>)!;
    }
    throw error;
  }

  return parseInventoryFields(data as Record<string, unknown>)!;
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryInput>) {
  const payload: Record<string, unknown> = { ...updates };

  const { data, error } = await supabase
    .from('inventory')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseInventoryFields(data as Record<string, unknown>)!;
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
