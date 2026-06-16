import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function POST(req: NextRequest) {
  try {
    const { payslip_id } = await req.json();

    if (!payslip_id) {
      return NextResponse.json({ error: 'Payslip ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch Payslip Details
    const { data: payslip, error: payError } = await adminClient
      .from('payslips')
      .select('*')
      .eq('id', payslip_id)
      .single();

    if (payError || !payslip) {
      console.error('Payslip fetch error:', payError);
      return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
    }

    // 2. Fetch Employee Details from users table
    const { data: employee, error: empError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', payslip.staff_id)
      .single();

    if (empError || !employee) {
      console.error('Employee fetch error:', empError);
    }

    // 3. Fetch School Settings
    const { data: settings } = await adminClient
      .from('system_settings')
      .select('*')
      .single();

    // 4. Generate PDF
    const doc = new jsPDF();
    const schoolName = settings?.school_name || 'Smart School System';
    const schoolAddress = settings?.school_address || settings?.address || 'School Address';
    const schoolPhone = settings?.school_phone || settings?.phone || 'Phone Number';
    const schoolEmail = settings?.school_email || settings?.email || 'Email Address';
    const currency = settings?.currency || 'USD';

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

    // Document Title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont('Helvetica', 'bold');
    doc.text('SALARY PAYSLIP', 20, 55);
    doc.setFont('Helvetica', 'normal');
    
    // Payslip metadata
    doc.setFontSize(10);
    doc.text(`Payslip ID: PAY-${payslip.id.substring(0, 8).toUpperCase()}`, 20, 62);
    doc.text(`Pay Period: ${payslip.month}`, 20, 67);
    doc.text(`Date Processed: ${payslip.date || new Date().toISOString().split('T')[0]}`, 20, 72);

    // Employee Info
    doc.text('EMPLOYEE DETAILS:', 130, 55);
    doc.setFont('Helvetica', 'bold');
    doc.text(employee?.name || payslip.staff || 'Registered Staff', 130, 62);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Role: ${employee?.role ? employee.role.charAt(0).toUpperCase() + employee.role.slice(1) : 'Staff'}`, 130, 67);
    doc.text(`Email: ${employee?.email || 'N/A'}`, 130, 72);
    doc.text(`Phone: ${employee?.phone || 'N/A'}`, 130, 77);

    // Salary Calculation Table
    const baseVal = Number(employee?.salary) || 3000;
    const finalAmount = Number(payslip.amount) || 0;
    const totalDeductions = Math.max(0, baseVal - finalAmount);

    autoTable(doc, {
      startY: 90,
      head: [['Salary Category / Description', 'Amount']],
      body: [
        ['Basic Base Salary', `${currency} ${baseVal.toLocaleString()}`],
        ['Deductions / Unexcused Absences', `${currency} ${totalDeductions.toLocaleString()}`],
        ['Total Net Take-Home Payout', `${currency} ${finalAmount.toLocaleString()}`],
      ],
      headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255] },
      bodyStyles: { textColor: [50, 50, 50] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;

    // Status Summary Box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(20, finalY, 170, 25, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.text('Payment Status Card:', 25, finalY + 10);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Status of Payout: ${payslip.status === 'Paid' ? 'PAID / DISBURSED' : 'PENDING'}`, 25, finalY + 18);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${currency} ${finalAmount.toLocaleString()}`, 180, finalY + 15, { align: 'right' });
    doc.setFont('Helvetica', 'normal');

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Smart School Employee Payroll System.', 105, 280, { align: 'center' });
    doc.text('This is an official transaction document and does not require a physical signature.', 105, 285, { align: 'center' });

    const pdfBuffer = doc.output('arraybuffer');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Payslip-${payslip_id.substring(0, 8)}.pdf`,
      },
    });
  } catch (error: any) {
    console.error('Payslip PDF Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
