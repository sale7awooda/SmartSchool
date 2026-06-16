import { supabase } from '@/lib/supabase/client';

export function parseInventoryFields(item: any) {
  if (!item) return item;
  const categoryStr = item.category || '';
  const parts = categoryStr.split(' | ');
  const category = parts[0] || 'general';
  let assigned_to = '';
  let next_maintenance_date = '';

  for (const part of parts) {
    if (part.startsWith('Assigned: ')) {
      assigned_to = part.replace('Assigned: ', '');
    } else if (part.startsWith('Maintenance: ')) {
      next_maintenance_date = part.replace('Maintenance: ', '');
    }
  }

  return {
    ...item,
    category,
    assigned_to,
    next_maintenance_date
  };
}

export async function getPaginatedInventory(page: number = 1, limit: number = 10, search: string = '') {
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
    data: (data || []).map(parseInventoryFields),
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}


export async function createInventoryItem(itemData: any) {
  const combinedCategory = `${itemData.category || 'general'}${itemData.assigned_to ? ` | Assigned: ${itemData.assigned_to}` : ''}${itemData.next_maintenance_date ? ` | Maintenance: ${itemData.next_maintenance_date}` : ''}`;

  const { data, error } = await supabase
    .from('inventory')
    .insert([{
      name: itemData.name,
      category: combinedCategory,
      quantity: itemData.quantity || 1,
      status: itemData.status || 'Available'
    }])
    .select()
    .single();
  
  if (error) throw error;
  return parseInventoryFields(data);
}

export async function updateInventoryItem(id: string, updates: any) {
  // If the update includes category-related fields, we serialize them
  if ('category' in updates || 'assigned_to' in updates || 'next_maintenance_date' in updates) {
    const { data: existing } = await supabase.from('inventory').select('*').eq('id', id).single();
    const parsed = parseInventoryFields(existing);

    const cat = 'category' in updates ? updates.category : parsed.category;
    const assigned = 'assigned_to' in updates ? updates.assigned_to : parsed.assigned_to;
    const maintenance = 'next_maintenance_date' in updates ? updates.next_maintenance_date : parsed.next_maintenance_date;

    updates.category = `${cat || 'general'}${assigned ? ` | Assigned: ${assigned}` : ''}${maintenance ? ` | Maintenance: ${maintenance}` : ''}`;
    delete updates.assigned_to;
    delete updates.next_maintenance_date;
  }

  const { data, error } = await supabase
    .from('inventory')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return parseInventoryFields(data);
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}


