import { baseLayout, button, divider } from './base';

interface WelcomeData {
  name: string;
  role: string;
  email: string;
  password?: string;
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    student: 'Student',
    teacher: 'Teacher',
    staff: 'Staff Member',
    parent: 'Parent',
    accountant: 'Accountant',
    admin: 'Administrator',
  };
  return map[role] || role;
}

export function welcomeTemplate(data: WelcomeData): string {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  const body = `
    <h2 style="color:#059669;margin:0 0 16px;font-size:20px;">Welcome to Smart School!</h2>
    <p style="color:#475569;line-height:1.7;margin:0 0 20px;">
      Dear ${data.name},
    </p>
    <p style="color:#475569;line-height:1.7;margin:0 0 20px;">
      Your account has been created as a <strong>${roleLabel(data.role)}</strong>.
      You can now log in to access your dashboard.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e2e8f0;border-radius:6px;">
      <tr>
        <td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #e2e8f0;color:#1e293b;">Email</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#475569;">${data.email}</td>
      </tr>
      ${data.password ? `
      <tr>
        <td style="padding:10px 16px;font-weight:600;color:#1e293b;">Password</td>
        <td style="padding:10px 16px;color:#475569;">${data.password}</td>
      </tr>
      ` : ''}
    </table>
    ${button(`${appUrl}/login`, 'Log In to Your Account')}
    ${divider()}
    <p style="font-size:13px;color:#94a3b8;margin:0;text-align:center;">
      For security, please change your password after your first login.
    </p>
  `;

  return baseLayout(body);
}
