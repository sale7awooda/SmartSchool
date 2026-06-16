import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResend() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY is not set. Email functionality will be disabled.');
      return null;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}
