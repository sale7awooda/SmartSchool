import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/types';

export async function getPaginatedInvoices(page: number = 1, limit: number = 10, search: string = '', studentId?: string | string[], status?: string, academicYear?: string) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('fee_invoices_view')
    .select('*', { count: 'exact' });

  if (academicYear) {
    query = query.eq('student_academic_year', academicYear);
  }

  if (studentId) {
    if (Array.isArray(studentId)) {
      if (studentId.length > 0) {
        query = query.in('student_id', studentId);
      }
    } else {
      query = query.eq('student_id', studentId);
    }
  }

  if (status && status !== 'all') {
    if (status === 'overdue') {
      query = query.eq('status', 'overdue');
    } else if (status === 'pending') {
      query = query.eq('status', 'pending');
    } else if (status === 'paid') {
      query = query.in('status', ['paid', 'partially_paid']);
    } else if (status === 'void' || status === 'voided') {
      query = query.eq('status', 'void');
    } else if (status === 'partially_paid') {
      query = query.eq('status', 'partially_paid');
    }
  } else {
    // By default, hide void invoices unless specified
    query = query.neq('status', 'void');
  }

  if (search) {
    query = query.or(`description.ilike.%${search}%,student_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const mappedData = (data || []).map(inv => ({
    ...inv,
    student: {
      id: inv.student_id,
      academic_year: inv.student_academic_year,
      user: {
        name: inv.student_name
      }
    }
  }));

  return {
    data: mappedData,
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
  const { data, error } = await supabase.rpc('record_fee_payment', {
    p_invoice_id: paymentData.invoiceId,
    p_amount: paymentData.amount,
    p_payment_method: paymentData.paymentMethod,
    p_reference_number: paymentData.referenceNumber || '',
    p_recorded_by: paymentData.recordedBy
  });

  if (error) throw error;
  if (data && !data.success) {
    throw new Error(data.message);
  }

  return {
    invoice: data.invoice,
    payment: data.payment
  };
}


export async function getFeeStats(academicYear?: string) {
  const { data, error } = await supabase.rpc('get_fee_stats', {
    p_academic_year: academicYear || null
  });

  if (error) {
    if (error.code === 'PGRST202') {
      // Fallback if rpc is missing
      const { data: invoices } = await supabase.from('fee_invoices').select('*');
      return {
        collected: invoices?.filter(i => i.status === 'paid').reduce((a, b) => a + Number(b.amount || 0), 0) || 0,
        pending: invoices?.filter(i => i.status === 'pending').reduce((a, b) => a + Number(b.amount || 0), 0) || 0,
        overdue: invoices?.filter(i => i.status === 'overdue').reduce((a, b) => a + Number(b.amount || 0), 0) || 0,
        collected_this_month: 0,
        due_this_month: 0
      };
    }
    throw error;
  }
  return data;
}

export async function getExpenseStats() {
  const { data, error } = await supabase.from('financials').select('amount, date').eq('type', 'Expense');
  if (error) throw error;
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let totalExpenses = 0;
  let thisMonthExpenses = 0;

  data?.forEach((exp) => {
    const amt = Number(exp.amount || 0);
    totalExpenses += amt;
    if (exp.date) {
      const expDate = new Date(exp.date);
      if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
        thisMonthExpenses += amt;
      }
    }
  });

  return {
    total: totalExpenses,
    thisMonth: thisMonthExpenses
  };
}


export async function getFeeItems() {
  const { data, error } = await supabase
    .from('fee_items')
    .select('*')
    .order('name', { ascending: true });
  
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
  try {
    const { data: invoices } = await supabase.from('fee_invoices').select('amount, due_date, created_at, status');
    const { data: expenses } = await supabase.from('financials').select('amount, date').eq('type', 'Expense');
    
    // YTD Revenue: Sum of all PAID/PARTIALLY PAID invoices
    const paidInvoices = invoices?.filter(inv => inv.status === 'paid' || inv.status === 'partially_paid') || [];
    const revenue = paidInvoices.reduce((acc, inv) => acc + Number(inv.amount), 0) || 0;

    // Monthly Cash Flow
    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const monthlySum: Record<string, { revenue: number; expenses: number }> = {};
    months.forEach(m => {
      monthlySum[m] = { revenue: 0, expenses: 0 };
    });

    paidInvoices.forEach(inv => {
      const recordDate = inv.created_at || inv.due_date;
      if (!recordDate) return;
      const d = new Date(recordDate);
      const mName = d.toLocaleString('en-US', { month: 'short' });
      if (monthlySum[mName]) {
        monthlySum[mName].revenue += Number(inv.amount) || 0;
      }
    });

    expenses?.forEach(exp => {
      const recordDate = exp.date;
      if (!recordDate) return;
      const d = new Date(recordDate);
      const mName = d.toLocaleString('en-US', { month: 'short' });
      if (monthlySum[mName]) {
        monthlySum[mName].expenses += Number(exp.amount) || 0;
      }
    });

    const displayMonths = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
    const health = displayMonths.map((m) => {
      const data = monthlySum[m];
      const hasRealData = data && (data.revenue > 0 || data.expenses > 0);
      
      let finalRevenue = data ? data.revenue : 0;
      let finalExpenses = data ? data.expenses : 0;

      return {
        month: m,
        revenue: finalRevenue,
        expenses: finalExpenses
      };
    });

    return {
      ytdRevenue: revenue,
      health: health
    };
  } catch (e) {
    console.error('Error fetching financial stats:', e);
    return { ytdRevenue: 0, health: [] };
  }
}


export async function getFinancials() {
  const { data, error } = await supabase
    .from('financials')
    .select('*');
  if (error) {
    if (error.code === 'PGRST205') return [];
    throw error;
  }
  
  // As a workaround since financials doesn't have a direct staff relation, we'll map gracefully
  return data.map((f: any) => ({ ...f, staff: f.category || itemCategoryToUser(f) }));
}

function itemCategoryToUser(f: any) {
  // Extract user from description if we saved it there
  if (f.description && f.description.startsWith('Staff:')) {
    return f.description.split('-')[0].replace('Staff:', '').trim();
  }
  return null;
}


export async function createFinancial(financialData: any) {
  const { data, error } = await supabase.from('financials').insert(financialData).select().single();
  if (error) throw error;
  return data;
}


