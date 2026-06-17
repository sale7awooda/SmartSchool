import { createAdminClient } from '@/lib/supabase/server';
import { getResend } from '@/lib/resend';
import { feeReminderTemplate } from '@/lib/email-templates';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_FROM = 'Smart School <notifications@smartschool.edu>';

interface OverdueInvoice {
  id: string;
  student_id: string;
  title: string;
  amount: number;
  due_date: string;
  student_name: string;
  parent_email: string | null;
  parent_name: string | null;
  school_id: string;
}

async function fetchOverdueInvoices(): Promise<OverdueInvoice[]> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('fee_invoices')
    .select('id, student_id, title, amount, due_date, school_id')
    .eq('status', 'pending')
    .lt('due_date', today);

  if (error) {
    console.error('[FEE CRON] Error fetching overdue invoices:', error);
    return [];
  }

  const results: OverdueInvoice[] = [];

  for (const row of data || []) {
    const { data: student } = await supabase
      .from('students')
      .select('name, user_id')
      .eq('id', row.student_id)
      .maybeSingle();

    if (!student) continue;

    const { data: parentLink } = await supabase
      .from('parent_student')
      .select('parent_id')
      .eq('student_id', row.student_id)
      .maybeSingle();

    if (!parentLink) continue;

    const { data: parentUser } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', parentLink.parent_id)
      .maybeSingle();

    results.push({
      id: row.id,
      student_id: row.student_id,
      title: row.title || 'Fee Payment',
      amount: row.amount,
      due_date: row.due_date,
      student_name: student.name || 'Student',
      parent_email: parentUser?.email || null,
      parent_name: parentUser?.name || null,
      school_id: row.school_id,
    });
  }

  return results;
}

async function markOverdue(invoiceId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('fee_invoices')
    .update({ status: 'overdue' })
    .eq('id', invoiceId)
    .eq('status', 'pending');

  if (error) {
    console.error(`[FEE CRON] Error marking invoice ${invoiceId} as overdue:`, error);
    return false;
  }
  return true;
}

async function sendReminderEmail(invoice: OverdueInvoice): Promise<void> {
  if (!invoice.parent_email) return;

  const resend = getResend();
  if (!resend) return;

  try {
    const html = feeReminderTemplate({
      studentName: invoice.student_name,
      parentName: invoice.parent_name,
      title: invoice.title,
      amount: invoice.amount,
      dueDate: invoice.due_date,
    });

    await resend.emails.send({
      from: DEFAULT_FROM,
      to: invoice.parent_email,
      subject: `Fee Reminder: ${invoice.title} is overdue`,
      html,
    });
    console.log(`[FEE CRON] Sent reminder email for invoice ${invoice.id} to ${invoice.parent_email}`);
  } catch (err) {
    console.error(`[FEE CRON] Error sending reminder email for invoice ${invoice.id}:`, err);
  }
}

async function processFeeReminders(): Promise<void> {
  console.log('[FEE CRON] Checking for overdue invoices...');
  const invoices = await fetchOverdueInvoices();
  console.log(`[FEE CRON] Found ${invoices.length} overdue invoice(s)`);

  for (const invoice of invoices) {
    await sendReminderEmail(invoice);
    await markOverdue(invoice.id);
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startFeeReminderCron(): void {
  if (intervalHandle) return;
  console.log(`[FEE CRON] Starting fee reminder cron (every ${CHECK_INTERVAL_MS / 60000} minutes)`);
  processFeeReminders();
  intervalHandle = setInterval(processFeeReminders, CHECK_INTERVAL_MS);
}

export function stopFeeReminderCron(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[FEE CRON] Stopped fee reminder cron');
  }
}
