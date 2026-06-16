'use client';

import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';
import { getPaginatedStudents, getClasses, getFeeItems } from '@/lib/supabase-db';
import { Search, Send, DollarSign, Loader2, Users, CheckCircle, AlertCircle, MessageSquare, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { syncStudentAuthAction } from '@/app/actions/students';

export function BulkOperationsTab({ activeAcademicYear, t }: any) {
  const [operation, setOperation] = useState<'fees' | 'message' | 'sync'>('fees');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;

  // Fee Assignment State
  const [selectedFeeItem, setSelectedFeeItem] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Message Sending State
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sendPush, setSendPush] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);

  const { data: studentsResponse, isLoading } = useSWR(
    ['bulk_students', page, searchQuery, selectedGrade, activeAcademicYear?.name],
    () => getPaginatedStudents(page, limit, searchQuery, activeAcademicYear?.name, selectedGrade || undefined)
  );

  const { data: classesData } = useSWR('classes', getClasses);
  const classesList = useMemo(() => classesData?.map((c: any) => c.name) || [], [classesData]);

  const { data: feeItems } = useSWR('fee_items', getFeeItems);

  const students = studentsResponse?.data || [];
  const totalPages = studentsResponse?.totalPages || 1;

  const handleCheckAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSet = new Set(selectedStudents);
      students.forEach((s: any) => newSet.add(s.id));
      setSelectedStudents(newSet);
    } else {
      const newSet = new Set(selectedStudents);
      students.forEach((s: any) => newSet.delete(s.id));
      setSelectedStudents(newSet);
    }
  };

  const handleToggleStudent = (id: string) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudents(newSet);
  };

  const handleBulkAssignFees = async () => {
    if (selectedStudents.size === 0 || !selectedFeeItem) {
      toast.error(t('please_select_students_fee'));
      return;
    }

    const feeItem = feeItems?.find((f: any) => f.id === selectedFeeItem);
    if (!feeItem) return;

    setIsSubmitting(true);
    try {
      const studentIds = Array.from(selectedStudents);
      const invoices = studentIds.map(studentId => ({
        student_id: studentId,
        fee_item_id: selectedFeeItem,
        amount: feeItem.amount,
        due_date: dueDate,
        status: 'pending',
        academic_year_id: activeAcademicYear?.id,
        title: feeItem.name,
        description: `${t('bulk_assignment')}: ${feeItem.name}`
      }));

      const { error } = await supabase.from('fee_invoices').insert(invoices);
      if (error) throw error;

      toast.success(t('assigned_fee_to_count').replace('{fee}', feeItem.name).replace('{count}', studentIds.length.toString()));
      setSelectedStudents(new Set());
    } catch (error: any) {
      toast.error(error.message || t('failed_to_assign_fees'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSendMessage = async () => {
    if (selectedStudents.size === 0 || !messageTitle || !messageBody) {
      toast.error(t('please_complete_all_fields'));
      return;
    }

    setIsSubmitting(true);
    try {
      const studentIds = Array.from(selectedStudents);
      
      // Get user IDs for notifications
      const { data: studentsData } = await supabase
        .from('students')
        .select('user_id')
        .in('id', studentIds);
      
      const userIds = studentsData?.map(s => s.user_id) || [];

      // Create notifications
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title: messageTitle,
        message: messageBody,
        type: 'broadcast'
      }));

      const { error } = await supabase.from('user_notifications').insert(notifications);
      if (error) throw error;

      if (sendPush) {
        // Trigger push via API
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userIds,
            title: messageTitle,
            body: messageBody,
          }),
        });
      }

      if (sendEmail) {
        // Get emails
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .in('id', userIds);
        
        const emails = userData?.map(u => u.email).filter(Boolean) || [];

        if (emails.length > 0) {
          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: emails,
              subject: messageTitle,
              html: `<div style="font-family: sans-serif; line-height: 1.5; color: #333;">
                <h2 style="color: #0f172a;">${messageTitle}</h2>
                <p>${messageBody}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #999;">${t('automated_notification_footer')}</p>
              </div>`,
            }),
          });
        }
      }

      toast.success(t('message_sent_to_count').replace('{count}', studentIds.length.toString()));
      setMessageTitle('');
      setMessageBody('');
      setSelectedStudents(new Set());
    } catch (error: any) {
      toast.error(error.message || t('failed_to_send_messages'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSyncAuth = async () => {
    if (selectedStudents.size === 0) {
      toast.error(t('please_select_students_sync'));
      return;
    }

    setIsSubmitting(true);
    try {
      const studentIds = Array.from(selectedStudents);
      const result = await syncStudentAuthAction(studentIds);
      
      if (result.success) {
        toast.success(result.message);
        setSelectedStudents(new Set());
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || t('failed_to_sync_auth'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
      <div className="bg-card dark:bg-slate-900 p-6 rounded-[2rem] border border-border dark:border-slate-800 shadow-sm shrink-0">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex gap-2 p-1 bg-muted rounded-2xl w-full sm:w-auto">
               <button 
                 onClick={() => setOperation('fees')}
                 className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${operation === 'fees' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
               >
                 <DollarSign size={16} className="inline mr-2" />
                 {t('fee_assignment')}
               </button>
               <button 
                 onClick={() => setOperation('message')}
                 className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${operation === 'message' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
               >
                 <MessageSquare size={16} className="inline mr-2" />
                 {t('messaging')}
               </button>
               <button 
                 onClick={() => setOperation('sync')}
                 className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${operation === 'sync' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
               >
                 <ShieldCheck size={16} className="inline mr-2" />
                 {t('registry_sync')}
               </button>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
               <div className="relative flex-1 sm:w-64">
                 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                 <input 
                   type="text" 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   placeholder={t('search_students')}
                   className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                 />
               </div>
               <select 
                 value={selectedGrade}
                 onChange={e => setSelectedGrade(e.target.value)}
                 className="px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm outline-none"
               >
                 <option value="">{t('all_grades')}</option>
                 {classesList.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
         </div>

         {operation === 'fees' ? (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end animate-fadeIn">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">{t('select_fee_item')}</label>
                <select 
                  value={selectedFeeItem}
                  onChange={e => setSelectedFeeItem(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none text-sm font-medium"
                >
                  <option value="">{t('choose_fee')}</option>
                  {feeItems?.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name} (${f.amount})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">{t('payment_due_date')}</label>
                <input 
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none text-sm font-medium" 
                />
              </div>
              <button 
                onClick={handleBulkAssignFees}
                disabled={isSubmitting || selectedStudents.size === 0}
                className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin inline mr-2" size={18} /> : <DollarSign className="inline mr-2" size={18} />}
                {t('assign_to_count').replace('{count}', selectedStudents.size.toString())}
              </button>
           </div>
         ) : operation === 'message' ? (
           <div className="space-y-4 animate-fadeIn">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text"
                  placeholder={t('subject_title')}
                  value={messageTitle}
                  onChange={e => setMessageTitle(e.target.value)}
                  className="px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none text-sm font-medium" 
                />
                <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-muted/30 border border-border rounded-2xl">
                   <div className="flex items-center gap-2">
                     <input 
                       type="checkbox" 
                       id="push" 
                       checked={sendPush} 
                       onChange={e => setSendPush(e.target.checked)} 
                       className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                     />
                     <label htmlFor="push" className="text-sm font-medium text-muted-foreground select-none cursor-pointer">{t('push_alert')}</label>
                   </div>
                   <div className="flex items-center gap-2">
                     <input 
                       type="checkbox" 
                       id="email" 
                       checked={sendEmail} 
                       onChange={e => setSendEmail(e.target.checked)} 
                       className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                     />
                     <label htmlFor="email" className="text-sm font-medium text-muted-foreground select-none cursor-pointer">{t('email_alert')}</label>
                   </div>
                </div>
             </div>
             <div className="flex gap-4 items-end">
               <textarea 
                 placeholder={t('compose_message')}
                 value={messageBody}
                 onChange={e => setMessageBody(e.target.value)}
                 className="flex-1 px-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none text-sm font-medium h-12 focus:h-32 transition-all"
               />
               <button 
                onClick={handleBulkSendMessage}
                disabled={isSubmitting || selectedStudents.size === 0}
                className="w-48 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin inline mr-2" size={18} /> : <Send className="inline mr-2" size={18} />}
                {t('send_to_count').replace('{count}', selectedStudents.size.toString())}
              </button>
             </div>
           </div>
         ) : (
           <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-amber-500/5 border border-amber-500/20 rounded-[2rem] animate-fadeIn">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600">
                    <AlertCircle size={24} />
                 </div>
                 <div>
                    <p className="font-black text-foreground text-sm">{t('registry_auth_sync')}</p>
                    <p className="text-xs text-muted-foreground font-medium max-w-md">{t('registry_sync_desc')}</p>
                 </div>
              </div>
              <button 
               onClick={handleBulkSyncAuth}
               disabled={isSubmitting || selectedStudents.size === 0}
               className="w-full md:w-64 py-3 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
             >
               {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
               {t('sync_count_students').replace('{count}', selectedStudents.size.toString())}
             </button>
           </div>
         )}
      </div>

      <div className="flex-1 bg-card dark:bg-slate-900 rounded-[2rem] border border-border dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
             <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-md text-muted-foreground text-[10px] font-black uppercase tracking-widest border-b border-border">
                  <tr>
                    <th className="px-6 py-4 w-12">
                       <input 
                         type="checkbox" 
                         className="rounded border-border text-primary focus:ring-primary"
                         onChange={handleCheckAll}
                         checked={students.length > 0 && students.every(s => selectedStudents.has(s.id))}
                       />
                    </th>
                    <th className="px-6 py-4">{t('student')}</th>
                    <th className="px-6 py-4">{t('student_id_label')}</th>
                    <th className="px-6 py-4">{t('grade')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                   {isLoading ? (
                     <tr><td colSpan={4} className="p-12 text-center opacity-30 animate-pulse"><Loader2 size={32} className="mx-auto mb-2 animate-spin" /> {t('fetching_registry')}</td></tr>
                   ) : students.length === 0 ? (
                     <tr><td colSpan={4} className="p-12 text-center text-muted-foreground italic">{t('no_students_matched')}</td></tr>
                   ) : (
                     students.map((student: any) => (
                       <tr key={student.id} className={`hover:bg-muted/30 transition-colors ${selectedStudents.has(student.id) ? 'bg-primary/[0.03]' : ''}`}>
                         <td className="px-6 py-4">
                            <input 
                              type="checkbox" 
                              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                              checked={selectedStudents.has(student.id)}
                              onChange={() => handleToggleStudent(student.id)}
                            />
                         </td>
                         <td className="px-6 py-4">
                           <div className="font-bold flex items-center gap-2">
                             {student.name}
                             {selectedStudents.has(student.id) && <CheckCircle size={12} className="text-primary" />}
                           </div>
                         </td>
                         <td className="px-6 py-4 font-mono text-xs">{student.roll_number || student.rollNumber}</td>
                         <td className="px-6 py-4">
                           <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold border border-border uppercase">{student.grade}</span>
                         </td>
                       </tr>
                     ))
                   )}
                </tbody>
             </table>
          </div>
          
          <div className="p-4 border-t border-border flex items-center justify-between shrink-0">
             <p className="text-xs text-muted-foreground font-medium">{t('selected_count_students_batch').replace('{count}', selectedStudents.size.toString())}</p>
             <div className="flex gap-2">
               <button 
                 disabled={page === 1}
                 onClick={() => setPage(p => p - 1)}
                 className="px-4 py-2 rounded-lg bg-muted text-xs font-bold disabled:opacity-50"
                >
                  {t('previous')}
                </button>
               <button 
                 disabled={page === totalPages}
                 onClick={() => setPage(p => p + 1)}
                 className="px-4 py-2 rounded-lg bg-muted text-xs font-bold disabled:opacity-50"
                >
                  {t('next')}
                </button>
             </div>
          </div>
      </div>
    </div>
  );
}
