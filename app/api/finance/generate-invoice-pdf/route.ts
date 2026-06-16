import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function POST(req: NextRequest) {
  try {
    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch Invoice Details
    const { data: invoiceRaw, error: invError } = await adminClient
      .from('fee_invoices')
      .select('*')
      .eq('id', invoice_id)
      .single();

    if (invError || !invoiceRaw) {
        console.error('Invoice fetch error:', invError);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 1.5 Fetch Student Info manually since relation might be missing
    const { data: studentData } = await adminClient
      .from('students')
      .select('*, user:users(*)')
      .eq('id', invoiceRaw.student_id)
      .single();

    const invoice = { ...invoiceRaw, student: studentData };

    // 2. Fetch Payments
    const { data: payments } = await adminClient
      .from('fee_payments')
      .select('*')
      .eq('invoice_id', invoice_id)
      .order('payment_date', { ascending: true });

    // 3. Fetch School Settings
    const { data: settings } = await adminClient
      .from('system_settings')
      .select('*')
      .single();

    // 4. Generate PDF
    const doc = new jsPDF();
    const schoolName = settings?.school_name || 'Smart School System';
    const schoolAddress = settings?.school_address || 'School Address';
    const schoolPhone = settings?.school_phone || 'Phone Number';
    const schoolEmail = settings?.school_email || 'Email Address';
    const currency = settings?.currency || 'USD';
    const logoUrl = settings?.logo_url;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(schoolName, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(schoolAddress, 105, 27, { align: 'center' });
    doc.text(`${schoolPhone} | ${schoolEmail}`, 105, 33, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 40, 190, 40);

    // Invoice Info
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('FEE INVOICE', 20, 55);
    
    doc.setFontSize(10);
    doc.text(`Invoice #: INV-${invoice.id.substring(0, 8).toUpperCase()}`, 20, 62);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, 67);
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 20, 72);

    // Student Info
    doc.text('BILL TO:', 140, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.student?.user?.name || 'Walk-in Student', 140, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID: ${invoice.student?.roll_number || 'N/A'}`, 140, 67);
    doc.text(`Grade: ${invoice.student?.grade || 'N/A'}`, 140, 72);

    // Items Table
    autoTable(doc, {
      startY: 85,
      head: [['Description', 'Amount']],
      body: [
        [invoice.title || invoice.description, `${currency} ${invoice.amount.toLocaleString()}`]
      ],
      headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255] },
      margin: { left: 20, right: 20 }
    });

    // Payments Table (if any)
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    if (payments && payments.length > 0) {
      doc.text('PAYMENT HISTORY:', 20, finalY);
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Date', 'Method', 'Reference', 'Amount']],
        body: payments.map(p => [
          new Date(p.payment_date).toLocaleDateString(),
          p.payment_method,
          p.reference_number || '-',
          `${currency} ${p.amount.toLocaleString()}`
        ]),
        headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255] },
        margin: { left: 20, right: 20 }
      });
      finalY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Summary
    const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const balanceDue = invoice.amount - totalPaid;

    doc.setFontSize(12);
    doc.text(`Total Amount: ${currency} ${invoice.amount.toLocaleString()}`, 190, finalY, { align: 'right' });
    doc.text(`Total Paid: ${currency} ${totalPaid.toLocaleString()}`, 190, finalY + 7, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(balanceDue > 0 ? 200 : 0, 0, 0);
    doc.text(`Balance Due: ${currency} ${balanceDue.toLocaleString()}`, 190, finalY + 14, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for choosing our school.', 105, 280, { align: 'center' });
    doc.text('This is a computer generated invoice and does not require a signature.', 105, 285, { align: 'center' });

    const pdfBuffer = doc.output('arraybuffer');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Invoice-${invoice_id}.pdf`,
      },
    });
  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
