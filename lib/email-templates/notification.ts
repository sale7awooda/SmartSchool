import { baseLayout, button, divider } from './base';

interface NotificationData {
  title: string;
  message: string;
  url?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

function typeColor(type: string): string {
  const colors: Record<string, string> = {
    info: '#3b82f6',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
  };
  return colors[type] || '#3b82f6';
}

export function notificationTemplate(data: NotificationData): string {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const color = typeColor(data.type || 'info');

  const body = `
    <div style="border-left:4px solid ${color};padding-left:16px;margin-bottom:20px;">
      <h2 style="color:${color};margin:0 0 8px;font-size:18px;">${data.title}</h2>
      <p style="color:#475569;line-height:1.7;margin:0;">${data.message}</p>
    </div>
    ${data.url ? button(`${appUrl}${data.url}`, 'View Details') : ''}
    ${divider()}
    <p style="font-size:12px;color:#94a3b8;margin:0;text-align:center;">
      You can manage your notification preferences in your account settings.
    </p>
  `;

  return baseLayout(body);
}
