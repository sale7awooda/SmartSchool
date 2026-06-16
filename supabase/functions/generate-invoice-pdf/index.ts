import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Handle CORS Preflight Options Request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Auth Check: Verify authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: 'invoice_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase Client using local Deno env credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Fetch data: Invoice + Payments
    const { data: invoice, error: invoiceError } = await supabase
      .from('fee_invoices_view')
      .select('*')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found: ' + (invoiceError?.message ?? '') }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('invoice_id', invoice_id)
      .order('payment_date', { ascending: true });

    if (paymentsError) {
      return new Response(JSON.stringify({ error: 'Error fetching payments: ' + paymentsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Generate PDF using jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Color Palette
    const primaryColor = [31, 41, 55]; // Gray-800
    const accentColor = [13, 148, 136]; // Teal-600
    const lightGray = [243, 244, 246]; // Gray-100
    const borderGray = [229, 231, 235]; // Gray-200
    const darkGray = [75, 85, 99]; // Gray-600

    // Set font style
    doc.setFont("helvetica", "normal");

    // Header Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("INVOICE", 14, 25);

    // School Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("SMART SCHOOL", 140, 20);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text("100 Education Way, Suite A", 140, 25);
    doc.text("Springfield, OR 97477", 140, 29);
    doc.text("billing@smartschool.edu", 140, 33);

    // Horizontal Line separator
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(14, 38, 196, 38);

    // Columns for Bill To & Invoice Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("BILL TO:", 14, 48);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    if (invoice.student_id) {
      doc.text(`Student: ${invoice.student_name || 'N/A'}`, 14, 53);
      doc.text(`Grade: ${invoice.student_grade || 'N/A'}`, 14, 58);
      doc.text(`Academic Year: ${invoice.academic_year || 'N/A'}`, 14, 63);
    } else {
      doc.text("General Invoice / Unlinked", 14, 53);
      doc.text("Academic Year: Active", 14, 58);
    }

    // Invoice details (Right Column)
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("INVOICE DETAILS:", 110, 48);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(`Invoice ID: INV-${invoice.id.substring(0, 8).toUpperCase()}`, 110, 53);
    doc.text(`Issue Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 110, 58);
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 110, 63);

    // Invoice Status Badge
    const statusText = invoice.status.toUpperCase();
    doc.setFont("helvetica", "bold");
    if (invoice.status === 'paid') {
      doc.setTextColor(16, 185, 129); // Emerald-500
    } else if (invoice.status === 'partially_paid') {
      doc.setTextColor(59, 130, 246); // Blue-500
    } else if (invoice.status === 'void') {
      doc.setTextColor(239, 68, 68); // Red-500
    } else {
      doc.setTextColor(245, 158, 11); // Amber-500
    }
    doc.text(`STATUS: ${statusText}`, 110, 68);

    // Table Header
    let currentY = 80;
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(14, currentY, 182, 8, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("DESCRIPTION / ITEM", 16, currentY + 5.5);
    doc.text("AMOUNT", 160, currentY + 5.5);

    // Table Row
    currentY += 8;
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(14, currentY, 196, currentY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(invoice.title || "Fee Payment Invoice", 16, currentY + 6);
    doc.text(`$${parseFloat(invoice.amount).toFixed(2)}`, 160, currentY + 6);

    // Description text wrapping
    if (invoice.description) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139); // Slate-500
      const splitDesc = doc.splitTextToSize(invoice.description, 130);
      doc.text(splitDesc, 16, currentY + 11);
      currentY += (splitDesc.length * 4) + 8;
    } else {
      currentY += 10;
    }

    doc.line(14, currentY, 196, currentY);

    // Calculation Summary Block
    currentY += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text("Total Invoiced:", 120, currentY + 4);
    doc.text(`$${parseFloat(invoice.amount).toFixed(2)}`, 165, currentY + 4);

    const amountPaid = parseFloat(invoice.amount) - (invoice.balance_due ? parseFloat(invoice.balance_due) : 0);
    doc.text("Total Paid:", 120, currentY + 9);
    doc.text(`$${amountPaid.toFixed(2)}`, 165, currentY + 9);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Balance Due:", 120, currentY + 15);
    doc.text(`$${(invoice.balance_due ? parseFloat(invoice.balance_due) : 0).toFixed(2)}`, 165, currentY + 15);

    doc.line(120, currentY + 17, 196, currentY + 17);

    // Payment History Table (If any payments exist)
    if (payments && payments.length > 0) {
      currentY += 28;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("PAYMENTS TRANSACTION LOG", 14, currentY);

      currentY += 4;
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(14, currentY, 182, 7, "F");

      doc.setFontSize(8);
      doc.text("DATE", 16, currentY + 4.5);
      doc.text("METHOD", 60, currentY + 4.5);
      doc.text("REFERENCE / NOTES", 100, currentY + 4.5);
      doc.text("AMOUNT PAID", 160, currentY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

      payments.forEach((p: any) => {
        currentY += 7;
        doc.line(14, currentY, 196, currentY);
        doc.text(new Date(p.payment_date).toLocaleDateString(), 16, currentY + 4.5);
        doc.text(p.payment_method, 60, currentY + 4.5);
        doc.text(p.reference_number || 'N/A', 100, currentY + 4.5);
        doc.text(`$${parseFloat(p.amount).toFixed(2)}`, 160, currentY + 4.5);
      });
      currentY += 11;
    } else {
      currentY += 25;
    }

    // Footer note
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("Thank you for your prompt payment! For billing questions, email billing@smartschool.edu", 14, currentY);

    // Return the generated PDF array buffer directly
    const pdfArrayBuffer = doc.output("arraybuffer");
    return new Response(pdfArrayBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice_id}.pdf"`,
      },
    });

  } catch (err) {
    console.error("PDF generation failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
