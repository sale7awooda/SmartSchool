import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/lib/mock-db';

export async function getPaginatedInvoices(page: number = 1, limit: number = 10, search: string = '', studentId?: string, status?: string, academicYear?: string) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('fee_invoices')
    .select(`
      *,
      student:students!inner(user:users!inner(name), academic_year)
    `, { count: 'exact' });

  if (academicYear) {
    query = query.eq('student.academic_year', academicYear);
  }

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  if (status && status !== 'all') {
    if (status === 'overdue') {
      query = query.eq('status', 'overdue');
    } else if (status === 'pending') {
      query = query.eq('status', 'pending');
    } else if (status === 'paid') {
      query = query.eq('status', 'paid');
    }
  } else {
    // By default, hide void invoices
    query = query.neq('status', 'void');
  }

  if (search) {
    // Search by student name or invoice ID
    query = query.or(`description.ilike.%${search}%,id.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  };
}


export async function createInvoice(invoiceData: any) {
  const { data, error } = await supabase
    .from('fee_invoices')
    .insert([invoiceData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}


export async function updateInvoice(invoiceId: string, updateData: any) {
  const { data, error } = await supabase
    .from('fee_invoices')
    .update(updateData)
    .eq('id', invoiceId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}


export async function recordPayment(paymentData: {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  recordedBy: string;
}) {
  // 1. Update the invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('fee_invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: paymentData.paymentMethod
    })
    .eq('id', paymentData.invoiceId)
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // 2. Create the payment record
  const { data: payment, error: paymentError } = await supabase
    .from('fee_payments')
    .insert([{
      invoice_id: paymentData.invoiceId,
      amount: paymentData.amount,
      payment_method: paymentData.paymentMethod,
      reference_number: paymentData.referenceNumber,
      recorded_by: paymentData.recordedBy,
      payment_date: new Date().toISOString()
    }])
    .select()
    .single();

  if (paymentError) throw paymentError;

  return { invoice, payment };
}


export async function getFeeStats(academicYear?: string) {
  let query = supabase
    .from('fee_invoices')
    .select(`
      amount, 
      status,
      student:students!inner(academic_year)
    `);
  
  if (academicYear) {
    query = query.eq('student.academic_year', academicYear);
  }

  const { data, error } = await query;
  
  if (error) throw error;

  const stats = {
    collected: 0,
    pending: 0,
    overdue: 0
  };

  data.forEach(inv => {
    if (inv.status === 'paid') {
      stats.collected += Number(inv.amount);
    } else if (inv.status === 'pending') {
      stats.pending += Number(inv.amount);
    } else if (inv.status === 'overdue') {
      stats.overdue += Number(inv.amount);
    }
  });

  return stats;
}


export async function getFeeItems() {
  const { data, error } = await supabase
    .from('fee_items')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data;
}


export async function createFeeItem(item: any) {
  const { data, error } = await supabase
    .from('fee_items')
    .insert([item])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}


export async function updateFeeItem(id: string, item: any) {
  const { data, error } = await supabase
    .from('fee_items')
    .update(item)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}


export async function deleteFeeItem(id: string) {
  const { error } = await supabase
    .from('fee_items')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}


export async function getFinancialStats(academicYear?: string) {
  // In a real app, this would aggregate data from fee_invoices and fee_payments tables
  return {
    ytdRevenue: 768000,
    health: [
      { month: 'Sep', revenue: 120000, expenses: 95000 },
      { month: 'Oct', revenue: 125000, expenses: 98000 },
      { month: 'Nov', revenue: 118000, expenses: 92000 },
      { month: 'Dec', revenue: 130000, expenses: 105000 },
      { month: 'Jan', revenue: 140000, expenses: 96000 },
      { month: 'Feb', revenue: 135000, expenses: 99000 },
    ]
  };
}


export async function getFinancials() {
  const { data, error } = await supabase
    .from('financials')
    .select('*, staff:users(name)')
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === 'PGRST205') return [];
    throw error;
  }
  return data.map((f: any) => ({ ...f, staff: f.staff?.name }));
}


export async function createFinancial(financialData: any) {
  const { data, error } = await supabase.from('financials').insert(financialData).select().single();
  if (error) throw error;
  return data;
}


