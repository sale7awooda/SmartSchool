import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Search, Plus, Calendar, MapPin, UserCircle, Phone, Mail, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown, Camera, UserPlus, Settings, Trash2, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { createStudent, createFeeItem, getStudentCountForAcademicYear } from '@/lib/supabase-db';
import { processCreateStudentAction, processUpdateStudentAction } from '@/app/actions/students';
import { useAuth } from '@/lib/auth-context';

import { AcademicEnrollment, Student, User } from '@/types';

interface ManualFeeItem {
  name: string;
  amount: string;
  frequency: string;
  category: string;
}

interface FormData {
  name: string;
  studentId: string;
  grade: string;
  dob: string;
  gender: string;
  parentEmail: string;
  address: string;
  parentName: string;
  parentPhone: string;
  parentRelation: string;
  feeType: 'predefined' | 'manual';
  feeStructure: string;
  manualFeeItem: ManualFeeItem;
  additionalInfo: string;
}

type FormErrors = Record<string, string>;

interface AddStudentModalProps {
  isAddStudentOpen: boolean;
  setIsAddStudentOpen: (open: boolean) => void;
  isEditing: boolean;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleSaveStudent: () => Promise<void>;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  classesList: string[];
  feeItems: any[];
  parentSearch: string;
  setParentSearch: (search: string) => void;
  foundParents: User[];
  t: (key: string) => string;
  validateForm: () => boolean;
  formErrors: FormErrors;
  setFormErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
  activeAcademicYear: { name: string } | null;
  editingStudent: Student | null;
  mutateStudents: () => Promise<any>;
}

export function AddStudentModal({ 
  isAddStudentOpen, 
  setIsAddStudentOpen, 
  isEditing, 
  formData, 
  setFormData, 
  handleSaveStudent, 
  isSubmitting, 
  setIsSubmitting,
  classesList, 
  feeItems, 
  parentSearch, 
  setParentSearch, 
  foundParents, 
  t,
  validateForm,
  formErrors,
  setFormErrors,
  activeAcademicYear,
  editingStudent,
  mutateStudents
}: AddStudentModalProps) {
  const { user } = useAuth();
  
  return (
    <AnimatePresence>
        {isAddStudentOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">
                    {isEditing ? t('update_student_details') : t('register_new_student')}
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground mt-2">
                    {isEditing ? t('modify_student_info') : t('add_new_student_desc')}
                  </p>
                </div>
                <button 
                  onClick={() => setIsAddStudentOpen(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!validateForm()) {
                    toast.error('Please fix the errors in the form');
                    return;
                  }
                  setIsSubmitting(true);
                  
                  try {
                    if (isEditing && editingStudent) {
                      // Update existing student
                      if (!user) return;
                      const actionFormData = new FormData();
                      actionFormData.append('student_id', editingStudent.id);
                      actionFormData.append('name', formData.name);
                      actionFormData.append('studentId', formData.studentId);
                      actionFormData.append('grade', formData.grade);
                      actionFormData.append('dob', formData.dob);
                      actionFormData.append('gender', formData.gender);
                      actionFormData.append('address', formData.address);
                      actionFormData.append('feeStructure', formData.feeStructure);
                      actionFormData.append('additionalInfo', formData.additionalInfo);
                      actionFormData.append('updatedBy', user.id);

                      const result = await processUpdateStudentAction({ success: false, message: '' }, actionFormData);
                      
                      if (!result.success) {
                        toast.error("Error", { description: result.message });
                        return;
                      }

                      toast.success("Student updated successfully");
                    } else {
                      // Create new student
                      if (!user) return;
                      
                      let finalStudentId = formData.studentId;
                      
                      // Fallback generation if ID is somehow missing
                      if (!finalStudentId && activeAcademicYear) {
                        try {
                          const count = await getStudentCountForAcademicYear(activeAcademicYear.name);
                          const yearSuffix = activeAcademicYear.name.split('-')[0].slice(-2);
                          const nextNumber = String(count + 1).padStart(3, '0');
                          finalStudentId = `S${yearSuffix}${nextNumber}`;
                        } catch (e) {
                          console.error("Failed to generate fallback ID:", e);
                          toast.error("Failed to generate Student ID. Please try again.");
                          setIsSubmitting(false);
                          return;
                        }
                      }

                      if (!finalStudentId) {
                        toast.error("Student ID is missing. Please close and reopen the form.");
                        setIsSubmitting(false);
                        return;
                      }
                      
                      const actionFormData = new FormData();
                      actionFormData.append('name', formData.name);
                      actionFormData.append('studentId', finalStudentId);
                      actionFormData.append('grade', formData.grade);
                      actionFormData.append('dob', formData.dob);
                      actionFormData.append('gender', formData.gender);
                      actionFormData.append('address', formData.address);
                      actionFormData.append('parentName', formData.parentName);
                      actionFormData.append('parentPhone', formData.parentPhone);
                      actionFormData.append('parentRelation', formData.parentRelation);
                      actionFormData.append('academicYear', activeAcademicYear?.name || '2025-2026');
                      actionFormData.append('parentEmail', formData.parentEmail);
                      actionFormData.append('createdBy', user.id);

                      // If manual fee, we might want to create a fee item first or just save the string
                      if (formData.feeType === 'manual' && formData.manualFeeItem.name) {
                        actionFormData.append('feeStructure', `${formData.manualFeeItem.name} ($${formData.manualFeeItem.amount})`);
                        
                        // Optionally create the fee item in the database so it becomes "predefined" for others
                        if (formData.manualFeeItem.amount && !isNaN(parseFloat(formData.manualFeeItem.amount))) {
                          try {
                            await createFeeItem({
                              name: formData.manualFeeItem.name,
                              amount: parseFloat(formData.manualFeeItem.amount),
                              frequency: formData.manualFeeItem.frequency,
                              category: formData.manualFeeItem.category
                            });
                          } catch (e: any) {
                            console.error("Error creating manual fee item:", e);
                            if (e.message?.includes('PGRST204') || e.message?.includes('frequency')) {
                              toast.error("Database Schema Error", {
                                description: "The 'frequency' column is missing from 'fee_items'. Please run the SQL fix in your Supabase SQL Editor.",
                                duration: 10000
                              });
                            }
                          }
                        }
                      } else {
                        actionFormData.append('feeStructure', formData.feeStructure);
                      }
                      
                      actionFormData.append('additionalInfo', formData.additionalInfo);

                      const result = await processCreateStudentAction({ success: false, message: '' }, actionFormData);
                      
                      if (!result.success) {
                        if (result.errors) {
                          const firstError = Object.values(result.errors)[0][0];
                          toast.error("Validation Error", { description: firstError as string });
                        } else {
                          // Handle PGRST204 specifically if possible or just show the message
                          const isMissingColumn = result.message.includes('PGRST204') || result.message.includes('user_id');
                          toast.error(isMissingColumn ? "Database Schema Error" : "Registration Failed", { 
                            description: result.message,
                            duration: 10000
                          });
                        }
                        return;
                      }
                      
                      toast.success("Student registered successfully", {
                        description: `${formData.name} has been added to Grade ${formData.grade}.`
                      });
                    }
                    
                    // Refresh data
                    await mutateStudents();
                    
                    setIsAddStudentOpen(false);
                    // Reset form
                    setFormData({
                      name: '',
                      studentId: '',
                      grade: '',
                      dob: '',
                      gender: 'Male',
                      parentEmail: '',
                      address: '',
                      parentName: '',
                      parentPhone: '',
                      parentRelation: 'Father',
                      feeType: 'predefined',
                      feeStructure: '',
                      manualFeeItem: {
                        name: '',
                        amount: '',
                        frequency: 'Per Term',
                        category: 'Academic'
                      },
                      additionalInfo: ''
                    });
                    setFormErrors({});
                  } catch (error) {
                    console.error('Error registering student:', error);
                    toast.error('Failed to register student');
                  } finally {
                    setIsSubmitting(false);
                  }
                }} 
                className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/80 mb-1 block">{t('full_name')}</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g., Bart Simpson" 
                      value={formData.name}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, name: e.target.value }));
                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl border bg-muted/50 text-foreground focus:bg-background focus:ring-4 outline-none transition-all font-medium ${formErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`} 
                    />
                    {formErrors.name && <p className="text-xs text-red-500 font-medium">{formErrors.name}</p>}
                  </div>
                  <div className={isEditing ? "space-y-2" : "hidden"}>
                    <label className="text-sm font-bold text-foreground/80 mb-1 block">{t('student_id_auto')}</label>
                    <input 
                      type="text" 
                      placeholder="e.g., S26001" 
                      value={formData.studentId}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl border bg-muted/50 border-border font-medium text-foreground cursor-not-allowed opacity-80" 
                    />
                    {formErrors.studentId && <p className="text-xs text-red-500 font-medium">{formErrors.studentId}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/80 mb-1 block">{t('grade')}</label>
                    <select 
                      required 
                      value={formData.grade}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, grade: e.target.value }));
                        if (formErrors.grade) setFormErrors(prev => ({ ...prev, grade: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl border bg-muted/50 text-foreground focus:bg-background focus:ring-4 outline-none transition-all font-medium ${formErrors.grade ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`}
                    >
                      <option value="">{t('select_grade')}</option>
                      {classesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {formErrors.grade && <p className="text-xs text-red-500 font-medium">{formErrors.grade}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">{t('date_of_birth')}</label>
                    <input 
                      required 
                      type="date" 
                      value={formData.dob}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, dob: e.target.value }));
                        if (formErrors.dob) setFormErrors(prev => ({ ...prev, dob: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl border bg-muted/50 focus:bg-background focus:ring-4 outline-none transition-all font-medium ${formErrors.dob ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`} 
                    />
                    {formErrors.dob && <p className="text-xs text-red-500 font-medium">{formErrors.dob}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">{t('gender')}</label>
                    <select 
                      required 
                      value={formData.gender}
                      onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
                    >
                      <option value="Male">{t('male')}</option>
                      <option value="Female">{t('female')}</option>
                      <option value="Other">{t('other')}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">{t('residential_address')}</label>
                  <textarea 
                    rows={3} 
                    placeholder={t('enter_address_placeholder')} 
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium resize-none"
                  ></textarea>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="font-bold text-foreground mb-4">{t('parent_guardian_info')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2 relative">
                      <label className="text-sm font-bold text-foreground">{t('parent_name_search')}</label>
                      <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
                        <input 
                          required 
                          type="text" 
                          placeholder={t('search_parent_placeholder')} 
                          value={formData.parentName}
                          onChange={(e) => {
                            const name = e.target.value;
                            setFormData(prev => ({ ...prev, parentName: name }));
                            setParentSearch(name);
                          }}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-muted/50 focus:bg-background focus:ring-4 outline-none transition-all font-medium rtl:pl-4 rtl:pr-10 ${formErrors.parentName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`} 
                        />
                      </div>
                      {foundParents.length > 0 && parentSearch.length >= 2 && (
                        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                          {foundParents.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ 
                                  ...prev, 
                                  parentName: p.name, 
                                  parentPhone: p.phone || '',
                                  parentEmail: p.email || ''
                                }));
                                setParentSearch('');
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center justify-between rtl:text-right"
                            >
                              <span className="font-bold">{p.name}</span>
                              <span className="text-xs text-muted-foreground">{p.phone}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">{t('relation_to_student')}</label>
                      <select 
                        required 
                        value={formData.parentRelation}
                        onChange={(e) => setFormData(prev => ({ ...prev, parentRelation: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
                      >
                        <option value="Father">{t('father')}</option>
                        <option value="Mother">{t('mother')}</option>
                        <option value="Guardian">{t('guardian')}</option>
                        <option value="Brother">{t('brother')}</option>
                        <option value="Sister">{t('sister')}</option>
                        <option value="Other">{t('other')}</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">{t('parent_phone')}</label>
                      <input 
                        required 
                        type="tel" 
                        placeholder="+1 234 567 890" 
                        value={formData.parentPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, parentPhone: e.target.value }))}
                        className={`w-full px-4 py-3 rounded-xl border bg-muted/50 focus:bg-background focus:ring-4 outline-none transition-all font-medium ${formErrors.parentPhone ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`} 
                      />
                    </div>
                    <div className="space-y-2 text-foreground">
                      <label className="text-sm font-bold text-foreground/80 mb-1 block">Parent Email Address</label>
                      <input 
                        required 
                        type="email" 
                        placeholder="parent@example.com" 
                        value={formData.parentEmail}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, parentEmail: e.target.value }));
                        }}
                        className={`w-full px-4 py-3 rounded-xl border bg-muted/50 text-foreground focus:bg-background focus:ring-4 outline-none transition-all font-medium border-border focus:border-primary focus:ring-primary/20`} 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="font-bold text-foreground mb-4">{t('fee_structure')}</h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, feeType: 'predefined' }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${formData.feeType === 'predefined' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}
                      >
                        {t('predefined')}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, feeType: 'manual' }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${formData.feeType === 'manual' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}
                      >
                        {t('manual_entry')}
                      </button>
                    </div>
                    {formData.feeType === 'predefined' ? (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('select_predefined_structure')}</label>
                        <select 
                          value={formData.feeStructure}
                          onChange={(e) => setFormData(prev => ({ ...prev, feeStructure: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary outline-none transition-all font-medium"
                        >
                          <option value="">{t('select_fee_structure')}</option>
                          {feeItems.map(item => (
                            <option key={item.id} value={item.name}>{item.name} (${item.amount})</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl border border-border bg-muted/30 space-y-5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('add_fee_item')}</p>
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase">{t('manual_entry')}</span>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">{t('item_name')}</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Lab Fee"
                              value={formData.manualFeeItem.name}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                manualFeeItem: { ...prev.manualFeeItem, name: e.target.value },
                                feeStructure: e.target.value
                              }))}
                              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">{t('amount')} ($)</label>
                              <input 
                                type="number" 
                                placeholder="0.00"
                                value={formData.manualFeeItem.amount}
                                onChange={(e) => setFormData(prev => ({ 
                                  ...prev, 
                                  manualFeeItem: { ...prev.manualFeeItem, amount: e.target.value } 
                                }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">{t('frequency')}</label>
                              <select 
                                value={formData.manualFeeItem.frequency}
                                onChange={(e) => setFormData(prev => ({ 
                                  ...prev, 
                                  manualFeeItem: { ...prev.manualFeeItem, frequency: e.target.value } 
                                }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                              >
                                <option value="Per Term">{t('per_term')}</option>
                                <option value="Monthly">{t('monthly')}</option>
                                <option value="Annual">{t('annual')}</option>
                                <option value="One-time">{t('one_time')}</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">{t('category')}</label>
                            <select 
                              value={formData.manualFeeItem.category}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                manualFeeItem: { ...prev.manualFeeItem, category: e.target.value } 
                              }))}
                              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                            >
                              <option value="Academic">{t('academic')}</option>
                              <option value="Transport">{t('transport')}</option>
                              <option value="Extracurricular">{t('extracurricular')}</option>
                              <option value="Facility">{t('facility')}</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <label className="text-sm font-bold text-foreground">{t('additional_information')}</label>
                  <textarea 
                    placeholder={t('additional_info_placeholder')}
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary outline-none transition-all font-medium min-h-[100px] mt-2"
                  />
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsAddStudentOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (isEditing ? t('save') : t('register_student'))}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
    </AnimatePresence>
  );
}
