import { supabase } from '@/lib/supabase/client';

export interface VisitorRecord {
  id: string;
  name: string;
  purpose: string;
  host: string;
  badge_id?: string;
  check_in: string;
  check_out?: string;
  status: string;
  created_at: string;
}

export interface VisitorInput {
  name: string;
  purpose?: string;
  host?: string;
}

export function parseVisitorFields(visitor: Record<string, unknown> | null): VisitorRecord | null {
  if (!visitor) return null;

  let purpose = (visitor.purpose as string) || '';
  let host = (visitor.host as string) || '';

  if (!host && purpose.includes(' | Host: ')) {
    const parts = purpose.split(' | Host: ');
    purpose = parts[0] || '';
    host = parts[1] || '';
  }

  return {
    id: visitor.id as string,
    name: visitor.name as string,
    purpose,
    host,
    badge_id: visitor.badge_id as string | undefined,
    check_in: visitor.check_in as string,
    check_out: visitor.check_out as string | undefined,
    status: visitor.status as string,
    created_at: visitor.created_at as string,
  };
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  totalPages: number;
}

export async function getPaginatedVisitors(
  page: number = 1,
  limit: number = 10,
  search: string = ''
): Promise<PaginatedResult<VisitorRecord>> {
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
    data: (data || []).map((d) => parseVisitorFields(d as Record<string, unknown>)!),
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function createVisitor(visitorData: VisitorInput): Promise<VisitorRecord> {
  const payload: Record<string, unknown> = {
    name: visitorData.name,
    purpose: visitorData.purpose || '',
    status: 'Active',
    check_in: new Date().toISOString(),
  };

  if (visitorData.host) {
    payload.host = visitorData.host;
  }

  const { data, error } = await supabase
    .from('visitors')
    .insert([payload])
    .select()
    .single();

  if (error) {
    if (error.message?.includes('column') && error.message?.includes('host')) {
      const combinedPurpose = `${visitorData.purpose || ''}${visitorData.host ? ` | Host: ${visitorData.host}` : ''}`;
      const fallbackPayload: Record<string, unknown> = { ...payload, purpose: combinedPurpose };
      delete fallbackPayload.host;

      const { data: retryData, error: retryError } = await supabase
        .from('visitors')
        .insert([fallbackPayload])
        .select()
        .single();

      if (retryError) throw retryError;
      return parseVisitorFields(retryData as Record<string, unknown>)!;
    }
    throw error;
  }

  return parseVisitorFields(data as Record<string, unknown>)!;
}

export async function checkoutVisitor(id: string): Promise<VisitorRecord> {
  const { data, error } = await supabase
    .from('visitors')
    .update({
      status: 'Checked Out',
      check_out: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseVisitorFields(data as Record<string, unknown>)!;
}
