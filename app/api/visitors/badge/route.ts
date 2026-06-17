import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { generateBadgeId, generateBadgeQRDataURL } from '@/lib/visitor-badge';
import { jsPDF } from 'jspdf';

export async function GET(req: NextRequest) {
  try {
    const visitorId = req.nextUrl.searchParams.get('visitorId');
    if (!visitorId) {
      return NextResponse.json({ error: 'visitorId query parameter is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: visitor, error } = await supabase
      .from('visitors')
      .select('*')
      .eq('id', visitorId)
      .single();

    if (error || !visitor) {
      return NextResponse.json({ error: error?.message || 'Visitor not found' }, { status: 404 });
    }

    const badgeData = {
      badgeId: visitor.badge_id || generateBadgeId(),
      name: visitor.name,
      purpose: visitor.purpose || '',
      host: visitor.host || '',
      checkIn: visitor.check_in,
    };

    const qrDataUrl = await generateBadgeQRDataURL(badgeData);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [102, 152] });

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 152, 102, 'F');

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(4, 4, 144, 94, 4, 4, 'F');

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('SMART SCHOOL', 76, 14, { align: 'center' });

    doc.setFontSize(7);
    doc.text('Visitor Pass', 76, 19, { align: 'center' });

    doc.addImage(qrDataUrl, 'PNG', 10, 26, 50, 50);

    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text(badgeData.name, 72, 36);

    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text(`Badge: ${badgeData.badgeId}`, 72, 44);

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    let y = 54;
    if (badgeData.purpose) {
      doc.text(`Purpose: ${badgeData.purpose}`, 72, y);
      y += 8;
    }
    if (badgeData.host) {
      doc.text(`Host: ${badgeData.host}`, 72, y);
      y += 8;
    }
    doc.text(`In: ${new Date(badgeData.checkIn).toLocaleString()}`, 72, y);

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Present this badge at the reception desk.', 76, 90, { align: 'center' });

    const pdfBuffer = doc.output('arraybuffer');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Badge-${badgeData.badgeId}.pdf`,
      },
    });
  } catch (error: any) {
    console.error('Badge PDF Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate badge PDF' }, { status: 500 });
  }
}
