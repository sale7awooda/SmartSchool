import { supabase } from '@/lib/supabase/client';

export async function getPaginatedInventory(page: number = 1, limit: number = 10, search: string = '') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('inventory')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    data,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}


export async function createInventoryItem(itemData: any) {
  const { data, error } = await supabase
    .from('inventory')
    .insert([itemData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}


