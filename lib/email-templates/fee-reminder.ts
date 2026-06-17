import { baseLayout, button, divider } from './base';

interface FeeReminderData {
  studentName: string;
  parentName: string | null;
  title: string;
  amount: number;
  dueDate: string;
}

export function feeReminderTemplate(data: FeeReminderData): string {
  const body = `
    <h2 style="color:#dc2626;margin:0 0 16px;font-size:20px;">Fee Payment Reminder</h2>
    <p style="color:#475569;line-height:1.7;margin:0 0 20px;">
      Dear ${data.parentName || 'Parent'},
    </p>
    <p style="color:#475569;line-height:1.7;margin:0 0 20px;">
      This is a reminder that the following fee for <strong>${data.studentName}</strong> is now overdue:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e2e8f0;border-radius:6px;">
      <tr>
        <td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #e2e8f0;color:#1e293b;">Invoice</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#475569;">${data.title}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #e2e8f0;color:#1e293b;">Amount</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#475569;">$${data.amount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-weight:600;color:#1e293b;">Due Date</td>
        <td style="padding:10px 16px;color:#475569;">${data.dueDate}</td>
      </tr>
    </table>
    ${button(`${baseUrl()}/dashboard/fees`, 'Pay Now')}
    ${divider()}
    <p style="font-size:13px;color:#94a3b8;margin:0;text-align:center;">
      If you have already paid, please ignore this reminder.
    </p>
  `;

  return baseLayout(body);
}

function baseUrl(): string {
  return process.env.APP_URL || 'http://localhost:3000';
}
