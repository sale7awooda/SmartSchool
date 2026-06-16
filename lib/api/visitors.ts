import { supabase } from '@/lib/supabase/client';

export function parseVisitorFields(visitor: any) {
  if (!visitor) return visitor;
  const purposeStr = visitor.purpose || '';
  const parts = purposeStr.split(' | Host: ');
  const purpose = parts[0] || '';
  const host = parts[1] || '';
  return {
    ...visitor,
    purpose,
    host
  };
}

export async function getPaginatedVisitors(page: number = 1, limit: number = 10, search: string = '') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('visitors')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,purpose.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    data: (data || []).map(parseVisitorFields),
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}


export async function createVisitor(visitorData: any) {
  // Combine purpose and host to bypass DB column limitations
  const combinedPurpose = `${visitorData.purpose || ''}${visitorData.host ? ` | Host: ${visitorData.host}` : ''}`;
  
  const { data, error } = await supabase
    .from('visitors')
    .insert([{
      name: visitorData.name,
      purpose: combinedPurpose,
      status: 'Active',
      check_in: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) throw error;
  return parseVisitorFields(data);
}

export async function checkoutVisitor(id: string) {
  const { data, error } = await supabase
    .from('visitors')
    .update({ 
      status: 'Checked Out',
      check_out: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return parseVisitorFields(data);
}


