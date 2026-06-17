import { NextRequest, NextResponse } from 'next/server';
import { getResend } from '@/lib/resend';

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json();
    
    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const resend = getResend();
    if (!resend) {
      return NextResponse.json({ error: 'Resend is not configured' }, { status: 500 });
    }

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME || 'Smart School'} <${process.env.EMAIL_FROM_ADDRESS || 'noreply@updates.school.edu'}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Email API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
