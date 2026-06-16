'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Search, Plus, Calendar, MapPin, UserCircle, Phone, Mail, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown, Camera, UserPlus, Settings, Trash2, Edit, ChevronRight, GraduationCap, DollarSign, FileText, CheckCircle, Printer, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from "sonner";
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-purple-500/20 text-purple-500 border-purple-500/20';
    case 'teacher': return 'bg-primary/20 text-primary border-primary/20';
    case 'accountant': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
    case 'staff': return 'bg-muted text-foreground border-border';
    default: return 'bg-muted text-foreground border-border';
  }
};

import { User, Student, Parent } from '@/types';
import { getStudentDocuments, uploadStudentDocument, deleteStudentDocument } from '@/lib/api/students';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';

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
        .select(`
          parent:users ( name )
        `)
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

      await uploadStudentDocument(
        selectedPerson.id,
        file.name,
        file.type.split('/')[1].toUpperCase() || 'DOCUMENT',
        publicUrl,
        currentUser.id
      );

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

  // Dynamic calculations from paymentRecords to solve stale calculation issues
  const currentPayments = paymentRecords || [];
  const totalPaid = currentPayments
    .filter((inv: any) => inv.status === 'paid')
    .reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
  
  const totalDue = currentPayments
    .filter((inv: any) => inv.status !== 'void')
    .reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);

  // Sorting: Most recent transaction first
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
              
              {/* Tabs (excluding Payments tab per user request) */}
              {isStudent(selectedPerson) && (
                <div className="flex border-b border-border dark:border-slate-800 px-6 sm:px-8 overflow-x-auto scrollbar-hide shrink-0">
                  <button
                    onClick={() => setActiveProfileTab('overview')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'overview' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    {t('overview')}
                  </button>
                  
                  <button
                    onClick={() => setActiveProfileTab('statement')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                      activeProfileTab === 'statement' || activeProfileTab === 'payments'
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    <FileText size={16} />
                    {t('statement_of_account')}
                  </button>

                  <button
                    onClick={() => setActiveProfileTab('assessments')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'assessments' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    {t('assessments')}
                  </button>
                  
                  <button
                    onClick={() => setActiveProfileTab('documents')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'documents' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    {t('documents')}
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="p-6 sm:p-8 overflow-y-auto">
                {/* Overview Tab */}
                {activeProfileTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Contact Info */}
                      {'email' in selectedPerson && selectedPerson.email && (
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                          <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Mail size={20} /></div>
                          <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('email_address')}</p>
                            <p className="text-sm font-bold text-foreground mt-0.5 break-all">{selectedPerson.email}</p>
                          </div>
                        </div>
                      )}

                      {'phone' in selectedPerson && selectedPerson.phone && (
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                          <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Phone size={20} /></div>
                          <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('phone_number')}</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.phone}</p>
                          </div>
                        </div>
                      )}

                      {/* Student Specific Overview */}
                      {isStudent(selectedPerson) && (
                        <>
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><GraduationCap size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('grade')}</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.grade || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><UserCircle size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('roll_no')}</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.rollNumber || selectedPerson.roll_number || 'N/A'}</p>
                            </div>
                          </div>
                          {selectedPerson.dob && (
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                              <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Calendar size={20} /></div>
                              <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('date_of_birth')}</p>
                                <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.dob}</p>
                              </div>
                            </div>
                          )}
                          {selectedPerson.gender && (
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                              <div className="p-3 bg-muted rounded-xl text-muted-foreground"><UserCircle size={20} /></div>
                              <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('gender')}</p>
                                <p className="text-sm font-bold text-foreground mt-0.5 capitalize">{selectedPerson.gender}</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm sm:col-span-2">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><UserPlus size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('parent_guardian')}</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{fetchParentInfo && fetchParentInfo !== 'N/A' ? fetchParentInfo : ((selectedPerson as any).parentNames || (selectedPerson as any).parentName || 'N/A')}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {isStudent(selectedPerson) && selectedPerson.address && (
                      <div className="flex items-start gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                        <div className="p-3 bg-muted rounded-xl text-muted-foreground"><MapPin size={20} /></div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('address')}</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Student Assessments Tab */}
                {activeProfileTab === 'assessments' && isStudent(selectedPerson) && (
                  <div className="space-y-6">
                    {assessmentRecords.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assessmentRecords.map((submission: any, idx: number) => (
                          <div key={`${submission.id || 'assessment'}-${idx}`} className="bg-card dark:bg-slate-900 p-5 rounded-2xl border border-border dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-bold text-foreground">{submission.assessment?.title || t('unknown_assessment')}</h3>
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                submission.status === 'graded' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                submission.status === 'submitted' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              }`}>
                                {t(submission.status)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mb-4">
                              <p><span className="font-medium text-foreground">{t('subject')}:</span> {submission.assessment?.subject?.name || submission.assessment?.subject_id || 'N/A'}</p>
                              <p><span className="font-medium text-foreground">{t('date')}:</span> {new Date(submission.submitted_at || submission.created_at || new Date().toISOString()).toLocaleDateString()}</p>
                            </div>
                            {submission.status === 'graded' && submission.score !== null && (
                              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                                <span className="text-sm font-bold text-muted-foreground uppercase">{t('score')}</span>
                                <span className="text-xl font-black text-primary">{submission.score} / {submission.assessment?.total_marks || 100}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
                        <FileText size={40} className="mb-3 opacity-20" />
                        <p>{t('no_assessments')}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Statement of Account Tab */}
                {(activeProfileTab === 'statement' || activeProfileTab === 'payments') && isStudent(selectedPerson) && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 rounded-xl border border-border bg-muted/30">
                         <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('total')} {t('balance_due')}</p>
                         <p className="text-xl sm:text-2xl font-black text-foreground">${totalDue}</p>
                       </div>
                       <div className="p-4 rounded-xl border border-border bg-emerald-500/10 dark:bg-emerald-500/5">
                         <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t('total')} {t('collected_label')}</p>
                         <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">${totalPaid}</p>
                       </div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-muted/10 p-3 rounded-lg border border-border/40">
                      <h3 className="font-bold text-foreground">{t('transaction_ledger')}</h3>
                      <p className="text-[11px] text-muted-foreground font-semibold invisible sm:visible">{t('tapped_transaction_details_desc')}</p>
                    </div>

                    {sortedTransactions.length > 0 ? (
                      <div className="space-y-3">
                        {sortedTransactions.map((invoice: any, idx: number) => (
                          <div 
                            key={`${invoice.id || 'invoice'}-${idx}`} 
                            onClick={() => setSelectedTransaction(invoice)}
                            className="bg-card dark:bg-slate-900 p-4 rounded-xl border border-border flex flex-col sm:flex-row justify-between items-center gap-4 cursor-pointer hover:bg-muted/30 dark:hover:bg-slate-800 transition-all hover:scale-[1.01] active:scale-[0.99] group"
                          >
                            <div className="flex items-center gap-4 w-full">
                               <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                                 invoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' : 
                                 invoice.status === 'partially_paid' ? 'bg-blue-500/20 text-blue-500' : 
                                 invoice.status === 'overdue' ? 'bg-destructive/20 text-destructive' : 
                                 'bg-amber-500/20 text-amber-500'
                               }`}>
                                  {invoice.status === 'paid' || invoice.status === 'partially_paid' ? <CheckCircle size={20} /> : <FileText size={20} />}
                               </div>
                               <div>
                                  <h4 className="font-bold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">{invoice.title || invoice.term || invoice.description || 'Tuition Fee Installment'}</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {invoice.status === 'paid' ? t('paid_on') : t('due_by')}: {' '}
                                    {new Date(invoice.paid_at || invoice.due_date || invoice.dueDate).toLocaleDateString()}
                                  </p>
                               </div>
                            </div>
                            <div className="text-right whitespace-nowrap min-w-[120px] flex items-center sm:block gap-2 justify-between w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
                               {invoice.status === 'paid' ? (
                                 <p className="text-lg font-black text-emerald-500">${invoice.amount}</p>
                               ) : invoice.status === 'partially_paid' ? (
                                 <div>
                                   <p className="text-lg font-black text-foreground">${invoice.balance_due !== undefined ? invoice.balance_due : invoice.amount}</p>
                                   <p className="text-[9px] font-medium text-muted-foreground mt-0.5">
                                     {t('paid_so_far')}: <span className="text-emerald-500 font-bold">${invoice.amount - (invoice.balance_due ?? 0)}</span> {t('of')} ${invoice.amount}
                                   </p>
                                 </div>
                               ) : (
                                 <p className="text-lg font-black text-foreground">${invoice.balance_due !== undefined ? invoice.balance_due : invoice.amount}</p>
                               )}
                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                 invoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 
                                 invoice.status === 'partially_paid' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 
                                 invoice.status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                                 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                               }`}>
                                 {invoice.status === 'partially_paid' ? t('partial') : t(invoice.status)}
                               </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                       <div className="text-center py-10 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
                         <DollarSign size={40} className="mb-3 opacity-20" />
                         <p>{t('no_payments')}</p>
                       </div>
                    )}
                  </div>
                )}

                {/* Documents Tab */}
                {activeProfileTab === 'documents' && isStudent(selectedPerson) && (
                  <div className="space-y-6 animate-fadeIn pb-10">
                    <div className="flex justify-between items-center bg-muted/10 p-3 rounded-lg border border-border/40">
                      <h3 className="font-bold text-foreground">{t('file_attachment_library')}</h3>
                      {(isRole(['admin', 'staff', 'teacher'])) && (
                        <label className="cursor-pointer bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/95 transition-all active:scale-95 flex items-center gap-2">
                          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                          {t('upload_document')}
                          <input type="file" className="hidden" onChange={handleUploadDocument} disabled={isUploading} />
                        </label>
                      )}
                    </div>

                    {documents && documents.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {documents.map((doc: any) => (
                          <div key={doc.id} className="p-4 bg-card dark:bg-slate-900 border border-border rounded-xl flex items-center justify-between group">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground shrink-0">
                                <FileText size={20} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">{doc.name}</p>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                                  <span className="bg-primary/5 text-primary px-1.5 py-0.5 rounded uppercase font-bold">{doc.type}</span>
                                  • {new Date(doc.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <a 
                                href={doc.file_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                title={t('download')}
                              >
                                <Download size={18} />
                              </a>
                              {isRole(['admin']) && (
                                <button 
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                  title={t('delete')}
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[2rem] text-muted-foreground opacity-50">
                        <FileText size={48} className="mb-4" />
                        <p className="font-bold">{t('registry_empty')}</p>
                        <p className="text-xs">{t('registry_empty_desc')}</p>
                      </div>
                    )}
                  </div>
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

      {/* Transaction Details Overlay Modal */}
      <AnimatePresence key="transaction-presence">
        {selectedTransaction && (
          <div key="transaction-detail-overlay" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/90 dark:bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card dark:bg-slate-900 border border-border dark:border-slate-800 rounded-[2rem] shadow-2xl p-6 sm:p-8 w-full max-w-md relative flex flex-col gap-6"
            >
              <button 
                onClick={() => setSelectedTransaction(null)}
                className="absolute top-6 right-6 p-2 bg-muted hover:bg-muted/80 rounded-xl transition-all text-muted-foreground"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-4 border-b border-border dark:border-slate-800 pb-4">
                <div className={`p-3 rounded-2xl ${
                  selectedTransaction.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                  selectedTransaction.status === 'partially_paid' ? 'bg-blue-500/10 text-blue-500' :
                  selectedTransaction.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                  'bg-amber-500/10 text-amber-500'
                }`}>
                  <DollarSign size={24} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t('transaction_details')}</p>
                  <h3 className="font-bold text-lg text-foreground mt-0.5">{selectedTransaction.title || selectedTransaction.term || selectedTransaction.description || 'General Tuition Installment'}</h3>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">{t('status')}</span>
                    <span className={`text-xs font-black uppercase inline-block mt-0.5 ${
                      selectedTransaction.status === 'paid' ? 'text-emerald-500' :
                      selectedTransaction.status === 'partially_paid' ? 'text-blue-500' :
                      selectedTransaction.status === 'overdue' ? 'text-destructive' :
                      'text-amber-500'
                    }`}>
                      {selectedTransaction.status === 'partially_paid' ? t('partial') : t(selectedTransaction.status)}
                    </span>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      {selectedTransaction.status === 'partially_paid' ? t('balance_due') : t('amount_details')}
                    </span>
                    <span className="text-sm font-black text-foreground inline-block mt-0.5">
                      ${selectedTransaction.status === 'partially_paid' 
                        ? (selectedTransaction.balance_due !== undefined ? selectedTransaction.balance_due : selectedTransaction.amount)
                        : selectedTransaction.amount}
                    </span>
                  </div>
                </div>

                <div className="bg-muted/20 p-4 rounded-xl border border-border/40 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>{t('invoice_id')}:</span>
                    <span className="font-mono text-[11px] text-foreground font-bold">{selectedTransaction.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>{t('due_date')}:</span>
                    <span className="text-foreground font-bold">
                      {new Date(selectedTransaction.due_date || selectedTransaction.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedTransaction.status === 'partially_paid' && (
                    <>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>{t('original_amount')}:</span>
                        <span className="text-foreground font-bold">${selectedTransaction.amount}</span>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>{t('paid_so_far')}:</span>
                        <span className="text-emerald-500 font-bold">${selectedTransaction.amount - (selectedTransaction.balance_due ?? 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>{t('remaining_balance')}:</span>
                        <span className="text-primary font-bold">${selectedTransaction.balance_due ?? 0}</span>
                      </div>
                    </>
                  )}
                  {selectedTransaction.status === 'paid' && (
                    <>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>{t('paid_on')}:</span>
                        <span className="text-emerald-500 font-bold">
                          {new Date(selectedTransaction.paid_at || selectedTransaction.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {selectedTransaction.payment_method && (
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>{t('payment_method')}:</span>
                          <span className="text-foreground font-bold">{selectedTransaction.payment_method}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between gap-3 border-t border-border dark:border-slate-800 pt-6 mt-2">
                <button 
                  onClick={() => handleDownloadInvoice(selectedTransaction)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-muted hover:bg-muted/80 text-foreground text-sm font-bold rounded-xl transition-all active:scale-[0.98]"
                >
                  <Download size={16} />
                  Download
                </button>
                <button 
                  onClick={() => handlePrintInvoice(selectedTransaction)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-bold rounded-xl transition-all active:scale-[0.98] shadow-md shadow-primary/10"
                >
                  <Printer size={16} />
                  Print Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
