'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from "sonner";
import { supabase } from '@/lib/supabase/client';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { getStudentDocuments, uploadStudentDocument, deleteStudentDocument } from '@/lib/api/students';

import { OverviewTab } from '@/components/dashboard/students/profile/OverviewTab';
import { AssessmentsTab } from '@/components/dashboard/students/profile/AssessmentsTab';
import { StatementTab } from '@/components/dashboard/students/profile/StatementTab';
import { DocumentsTab } from '@/components/dashboard/students/profile/DocumentsTab';
import { TransactionDetailModal } from '@/components/dashboard/students/profile/TransactionDetailModal';

import { User, Student, Parent } from '@/types';

interface StudentProfileModalProps {
  selectedPerson: Student | User | null;
  setSelectedPerson: (person: Student | User | null) => void;
  activeProfileTab: 'overview' | 'statement' | 'assessments' | 'payments' | 'documents' | 'report-card';
  setActiveProfileTab: (tab: 'overview' | 'statement' | 'assessments' | 'payments' | 'documents' | 'report-card') => void;
  paymentRecords: any[];
  assessmentRecords: any[];
  t: (key: string) => string;
  isStudent: (person: any) => person is Student;
  handleCloseProfile: () => void;
  isInline?: boolean;
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-purple-500/20 text-purple-500 border-purple-500/20';
    case 'teacher': return 'bg-primary/20 text-primary border-primary/20';
    case 'accountant': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
    case 'staff': return 'bg-muted text-foreground border-border';
    default: return 'bg-muted text-foreground border-border';
  }
};

export function StudentProfileModal({
  selectedPerson,
  setSelectedPerson,
  activeProfileTab,
  setActiveProfileTab,
  paymentRecords,
  assessmentRecords,
  t,
  isStudent,
  handleCloseProfile,
  isInline = false
}: StudentProfileModalProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const { user: currentUser } = useAuth();
  const { isRole } = usePermissions();

  const { data: fetchParentInfo } = useSWR(
    selectedPerson && isStudent(selectedPerson) ? `parentOf_${selectedPerson.id}` : null,
    async () => {
      const { data } = await supabase
        .from('parent_student')
        .select(`parent:users ( name )`)
        .eq('student_id', selectedPerson!.id);

      if (!data || data.length === 0) return 'N/A';
      return data.map((row: any) => row.parent?.name || 'Unknown').filter((n: string) => n !== 'Unknown').join(', ') || 'N/A';
    }
  );

  const { data: documents, mutate: mutateDocuments } = useSWR(
    selectedPerson && isStudent(selectedPerson) && activeProfileTab === 'documents' ? `documents-${selectedPerson.id}` : null,
    () => getStudentDocuments(selectedPerson!.id)
  );

  const [isUploading, setIsUploading] = useState(false);

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPerson || !isStudent(selectedPerson) || !currentUser) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedPerson.id}/${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('student-documents')
        .getPublicUrl(fileName);

      await uploadStudentDocument(selectedPerson.id, file.name, file.type.split('/')[1].toUpperCase() || 'DOCUMENT', publicUrl, currentUser.id);

      toast.success(t('document_uploaded_success'));
      mutateDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || t('failed_to_upload_document'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm(t('confirm_delete_document'))) return;
    try {
      await deleteStudentDocument(id);
      toast.success(t('document_deleted_success'));
      mutateDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error(error.message || t('failed_to_delete_document'));
    }
  };

  const currentPayments = paymentRecords || [];
  const totalPaid = currentPayments
    .filter((inv: any) => inv.status === 'paid')
    .reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);

  const totalDue = currentPayments
    .filter((inv: any) => inv.status !== 'void')
    .reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);

  const sortedTransactions = [...currentPayments].sort((a: any, b: any) => {
    const dareA = new Date(a.paid_at || a.due_date || a.created_at || 0).getTime();
    const dareB = new Date(b.paid_at || b.due_date || b.created_at || 0).getTime();
    return dareB - dareA;
  });

  const handlePrintInvoice = (invoice: any) => {
    if (!invoice || !selectedPerson) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked! Enable popups to print invoices.");
      return;
    }

    const isPaid = invoice.status === 'paid';
    const formattedDate = new Date().toLocaleDateString();
    const formattedDueDate = new Date(invoice.due_date || invoice.dueDate || invoice.dueDate).toLocaleDateString();
    const formattedPaidDate = invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : 'N/A';

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${invoice.id}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-b: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .school-info { text-align: left; }
            .invoice-info { text-align: right; }
            .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
            .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
            .meta-grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .meta-box h4 { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin: 0 0 8px 0; }
            .meta-box p { font-size: 14px; font-weight: 600; margin: 0; color: #0f172a; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .table th { background: #f8fafc; text-align: left; padding: 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            .table td { padding: 16px 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
            .total-section { display: flex; justify-content: flex-end; margin-top: 30px; }
            .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
            .badge.paid { background: #dcfce7; color: #15803d; }
            .badge.pending { background: #fef9c3; color: #a16207; }
            .badge.overdue { background: #fee2e2; color: #b91c1c; }
            .badge.void { background: #f1f5f9; color: #64748b; }
            .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 80px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-info">
              <h1 class="title">${t('school_finance_department')}</h1>
              <p class="subtitle">${t('official_academic_tuition_bill')}</p>
            </div>
            <div class="invoice-info">
              <div class="badge ${invoice.status}">${t(invoice.status)}</div>
              <p style="margin: 8px 0 0 0; font-size: 12px; font-weight: bold; color: #64748b;">${t('invoice_id').toUpperCase()}: <span style="color: #0f172a;">${invoice.id}</span></p>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-box">
              <h4>${t('billed_to')}</h4>
              <p>${selectedPerson.name}</p>
              <p style="font-size: 12px; color: #64748b; font-weight: normal; margin-top: 4px;">${t('student_id_label')}: ${(selectedPerson as any).roll_number || (selectedPerson as any).rollNumber || 'N/A'}</p>
              <p style="font-size: 12px; color: #64748b; font-weight: normal;">${t('grade')}: ${(selectedPerson as any).grade || 'N/A'}</p>
            </div>
            <div class="meta-box" style="text-align: right;">
              <h4>${t('important_dates')}</h4>
              <p>${t('due_date')}: ${formattedDueDate}</p>
              ${isPaid ? `<p style="font-size: 12px; margin-top: 4px; color: #15803d;">${t('paid_on')}: ${formattedPaidDate}</p>` : ''}
              ${invoice.payment_method ? `<p style="font-size: 12px; color: #64748b;">${t('payment_method')}: ${invoice.payment_method}</p>` : ''}
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>${t('description')}</th>
                <th style="text-align: right;">${t('amount')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight: 600;">${invoice.title || invoice.term || invoice.description || t('general_tuition_installment')}</td>
                <td style="text-align: right; font-weight: 700;">$${invoice.amount}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <table style="width: 300px; font-weight: bold;">
              <tr style="color: #64748b;">
                <td style="padding: 8px 0;">${t('subtotal')}:</td>
                <td style="text-align: right; padding: 8px 0;">$${invoice.amount}</td>
              </tr>
              <tr style="color: #64748b;">
                <td style="padding: 8px 0;">${t('discounts')}:</td>
                <td style="text-align: right; padding: 8px 0;">$0.00</td>
              </tr>
              <tr style="font-size: 20px; color: #0f172a; border-top: 2px solid #e2e8f0;">
                <td style="padding: 12px 0;">${t('amount_due_label')}:</td>
                <td style="text-align: right; padding: 12px 0;">$${invoice.amount}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>${t('thank_you_payment_contact')}</p>
            <p style="font-size: 10px; margin-top: 10px;">${t('generated_automatically_on')} ${formattedDate}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadInvoice = async (invoice: any) => {
    if (!invoice) return;
    const toastId = toast.loading(t('generating_pdf_invoice'));

    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoice_id: invoice.id }
      });

      if (error) throw error;

      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.id.substring(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(t('invoice_pdf_downloaded_success'), { id: toastId });
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast.error(error.message || t('failed_download_pdf_invoice'), { id: toastId });
    }
  };

  return (
    <AnimatePresence>
      {selectedPerson && (
        <div key="student-profile-overlay" className={isInline ? "w-full" : "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 dark:bg-slate-950/60 backdrop-blur-sm"}>
          <motion.div
            initial={isInline ? undefined : { opacity: 0, y: 100 }}
            animate={isInline ? undefined : { opacity: 1, y: 0 }}
            exit={isInline ? undefined : { opacity: 0, y: 100 }}
            className={isInline ? "bg-card dark:bg-slate-900 rounded-[2rem] border border-border dark:border-slate-800 w-full flex flex-col overflow-hidden" : "bg-card dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-border dark:border-slate-800 max-h-[90vh] flex flex-col"}
          >
            {/* Header */}
            {!isInline && (
              <div className="p-6 sm:p-8 border-b border-border dark:border-slate-800 flex items-center gap-5 relative bg-muted/50 dark:bg-slate-800/50 shrink-0">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-bold text-3xl shrink-0 shadow-inner ${
                  'role' in selectedPerson && selectedPerson.role === 'parent' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                  isStudent(selectedPerson) ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                  'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {selectedPerson.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">{selectedPerson.name}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      'role' in selectedPerson ? getRoleBadgeColor(selectedPerson.role) : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    }`}>
                      {'role' in selectedPerson ? t(selectedPerson.role) : t('student')}
                    </span>
                  </div>
                </div>
                {!isInline && (
                  <button
                    onClick={handleCloseProfile}
                    className="absolute top-6 right-6 p-2 bg-card rounded-xl border border-border text-muted-foreground hover:text-muted-foreground dark:hover:text-slate-300 transition-colors"
                  >
                    <ChevronRight size={20} className="rotate-90 sm:rotate-0" />
                  </button>
                )}
              </div>
            )}

            {/* Tabs */}
            {isStudent(selectedPerson) && (
              <div className="flex border-b border-border dark:border-slate-800 px-6 sm:px-8 overflow-x-auto scrollbar-hide shrink-0">
                {(['overview', 'statement', 'assessments', 'documents'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveProfileTab(tab)}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      (activeProfileTab === tab || (tab === 'statement' && (activeProfileTab === 'payments')))
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    {tab === 'statement' ? (
                      <span className="flex items-center gap-2"><FileText size={16} /> {t('statement_of_account')}</span>
                    ) : (
                      t(tab)
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="p-6 sm:p-8 overflow-y-auto">
              {activeProfileTab === 'overview' && (
                <OverviewTab selectedPerson={selectedPerson} isStudent={isStudent} fetchParentInfo={fetchParentInfo} t={t} />
              )}

              {activeProfileTab === 'assessments' && isStudent(selectedPerson) && (
                <AssessmentsTab assessmentRecords={assessmentRecords} t={t} />
              )}

              {(activeProfileTab === 'statement' || activeProfileTab === 'payments') && isStudent(selectedPerson) && (
                <StatementTab
                  sortedTransactions={sortedTransactions}
                  totalPaid={totalPaid}
                  totalDue={totalDue}
                  onSelectTransaction={setSelectedTransaction}
                  t={t}
                />
              )}

              {activeProfileTab === 'documents' && isStudent(selectedPerson) && (
                <DocumentsTab
                  documents={documents}
                  isUploading={isUploading}
                  isRole={isRole}
                  handleUploadDocument={handleUploadDocument}
                  handleDeleteDocument={handleDeleteDocument}
                  t={t}
                />
              )}
            </div>

            {!isInline && (
              <div className="p-6 border-t border-border dark:border-slate-800 bg-muted/50 dark:bg-slate-800/50">
                <button
                  onClick={handleCloseProfile}
                  className="w-full px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-card border border-border hover:bg-muted transition-all active:scale-[0.98] shadow-sm"
                >
                  {t('close_profile')}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDownloadInvoice={handleDownloadInvoice}
        onPrintInvoice={handlePrintInvoice}
        t={t}
      />
    </AnimatePresence>
  );
}
