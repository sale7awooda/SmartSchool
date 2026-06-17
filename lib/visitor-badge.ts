import QRCode from 'qrcode';

export interface BadgeData {
  badgeId: string;
  name: string;
  purpose: string;
  host: string;
  checkIn: string;
}

export function generateBadgeId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'V-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function badgeQRContent(data: BadgeData): string {
  return JSON.stringify({
    id: data.badgeId,
    n: data.name,
    p: data.purpose,
    h: data.host,
    t: data.checkIn,
  });
}

export async function generateBadgeQRDataURL(data: BadgeData): Promise<string> {
  const content = badgeQRContent(data);
  return QRCode.toDataURL(content, {
    width: 200,
    margin: 2,
    color: { dark: '#1e293b', light: '#ffffff' },
  });
}
