import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Search, Plus, Calendar, MapPin, UserCircle, Phone, Mail, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown, Camera, UserPlus, Settings, Trash2, Edit, ChevronRight, GraduationCap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-purple-500/20 text-purple-500 border-purple-500/20';
    case 'teacher': return 'bg-primary/20 text-primary border-primary/20';
    case 'accountant': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
    case 'staff': return 'bg-muted text-foreground border-border';
    default: return 'bg-muted text-foreground border-border';
  }
};

import { Student, User } from '@/types';
import { DollarSign, FileText, CheckCircle } from 'lucide-react';

interface StudentProfileModalProps {
  selectedPerson: Student | User | null;
  setSelectedPerson: (person: Student | User | null) => void;
  activeProfileTab: 'overview' | 'payments' | 'assessments';
  setActiveProfileTab: (tab: 'overview' | 'payments' | 'assessments') => void;
  paymentRecords: any[];
  assessmentRecords: any[];
  t: (key: string) => string;
  isStudent: (person: any) => person is Student;
  handleCloseProfile: () => void;
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
  handleCloseProfile 
}: StudentProfileModalProps) {
  return (
    <AnimatePresence>
        {selectedPerson && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 dark:bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-card dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-border dark:border-slate-800 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 sm:p-8 border-b border-border dark:border-slate-800 flex items-center gap-5 relative bg-muted/50 dark:bg-slate-800/50 shrink-0">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-bold text-3xl shrink-0 shadow-inner ${
                  'role' in selectedPerson && selectedPerson.role === 'parent' ? 'bg-amber-500/100/10 text-amber-500 border border-amber-500/20' :
                  isStudent(selectedPerson) ? 'bg-emerald-500/100/10 text-emerald-500 border border-emerald-500/20' :
                  'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {selectedPerson.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">{selectedPerson.name}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      'role' in selectedPerson ? getRoleBadgeColor(selectedPerson.role) : 'bg-emerald-500/100/10 text-emerald-500 border-emerald-500/20'
                    }`}>
                      {'role' in selectedPerson ? selectedPerson.role.replace(/([A-Z])/g, ' $1').trim() : 'Student'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleCloseProfile}
                  className="absolute top-6 right-6 p-2 bg-card rounded-xl border border-border text-muted-foreground hover:text-muted-foreground dark:hover:text-slate-300 transition-colors"
                >
                  <ChevronRight size={20} className="rotate-90 sm:rotate-0" />
                </button>
              </div>
              
              {/* Tabs */}
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
                    {t('overview') || 'Overview'}
                  </button>
                  
                  <button
                    onClick={() => setActiveProfileTab('assessments')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'assessments' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    {t('assessments') || 'Assessments'}
                  </button>
                  <button
                    onClick={() => setActiveProfileTab('payments')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'payments' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    {t('payments') || 'Payments'}
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
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gender</p>
                                <p className="text-sm font-bold text-foreground mt-0.5 capitalize">{selectedPerson.gender}</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm sm:col-span-2">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><UserPlus size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Parent/Guardian</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{(selectedPerson as any).parentNames || 'N/A'}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {isStudent(selectedPerson) && selectedPerson.address && (
                      <div className="flex items-start gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                        <div className="p-3 bg-muted rounded-xl text-muted-foreground"><MapPin size={20} /></div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('address') || 'Address'}</p>
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
                        {assessmentRecords.map((submission: any) => (
                          <div key={submission.id} className="bg-card dark:bg-slate-900 p-5 rounded-2xl border border-border dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-bold text-foreground">{submission.assessment?.title || 'Unknown Assessment'}</h3>
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                submission.status === 'graded' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                submission.status === 'submitted' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              }`}>
                                {submission.status}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mb-4">
                              <p><span className="font-medium text-foreground">Subject:</span> {submission.assessment?.subject_id || 'N/A'}</p>
                              <p><span className="font-medium text-foreground">Date:</span> {new Date(submission.submitted_at || submission.created_at).toLocaleDateString()}</p>
                            </div>
                            {submission.status === 'graded' && submission.score !== null && (
                              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                                <span className="text-sm font-bold text-muted-foreground uppercase">Score</span>
                                <span className="text-xl font-black text-primary">{submission.score} / {submission.assessment?.total_marks || 100}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
                        <FileText size={40} className="mb-3 opacity-20" />
                        <p>{t('no_assessments') || 'No assessments found for this student.'}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Student Payments Tab */}
                {activeProfileTab === 'payments' && isStudent(selectedPerson) && (
                  <div className="space-y-6">
                    {paymentRecords && paymentRecords.length > 0 ? (
                      <div className="space-y-4">
                        {paymentRecords.map((invoice: any) => (
                          <div key={invoice.id} className="bg-card dark:bg-slate-900 p-5 rounded-2xl border border-border dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-foreground text-lg">{invoice.term || 'Invoice'}</h4>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                    invoice.status === 'paid' ? 'bg-emerald-500/100/20 text-emerald-500' : 
                                    invoice.status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                                    'bg-amber-500/100/20 text-amber-500'
                                  }`}>
                                    {invoice.status}
                                  </span>
                               </div>
                               <p className="text-sm text-muted-foreground">{t('due_date') || 'Due Date'}: {new Date(invoice.due_date || invoice.dueDate).toLocaleDateString()}</p>
                            </div>
                            <div className="text-left sm:text-right flex flex-col justify-center">
                               <p className="text-sm font-bold text-muted-foreground uppercase">{t('amount') || 'Amount'}</p>
                               <p className="text-2xl font-black text-foreground">${invoice.amount}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                       <div className="text-center py-10 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
                        <DollarSign size={40} className="mb-3 opacity-20" />
                        <p>{t('no_payments') || 'No payment records found for this student.'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-border dark:border-slate-800 bg-muted/50 dark:bg-slate-800/50">
                <button 
                  onClick={handleCloseProfile}
                  className="w-full px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-card border border-border hover:bg-muted transition-all active:scale-[0.98] shadow-sm"
                >
                  {t('close_profile')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
    </AnimatePresence>
  );
}
