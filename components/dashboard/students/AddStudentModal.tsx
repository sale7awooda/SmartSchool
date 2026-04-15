import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Search, Plus, Calendar, MapPin, UserCircle, Phone, Mail, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown, Camera, UserPlus, Settings, Trash2, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { createStudent, createFeeItem } from '@/lib/supabase-db';

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
}: any) {
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
                      const { error } = await supabase
                        .from('students')
                        .update({
                          name: formData.name,
                          grade: formData.grade,
                          roll_number: formData.studentId,
                          dob: formData.dob,
                          gender: formData.gender,
                          blood_group: formData.bloodGroup,
                          fee_structure: formData.feeStructure,
                          additional_info: formData.additionalInfo
                        })
                        .eq('id', editingStudent.id);
                      
                      if (error) throw error;
                      toast.success("Student updated successfully");
                    } else {
                      // Create new student
                    const studentData = {
                      ...formData,
                      academicYear: activeAcademicYear?.name
                    };

                    // If manual fee, we might want to create a fee item first or just save the string
                    if (formData.feeType === 'manual' && formData.manualFeeItem.name) {
                      studentData.feeStructure = `${formData.manualFeeItem.name} ($${formData.manualFeeItem.amount})`;
                      
                      // Optionally create the fee item in the database so it becomes "predefined" for others
                      try {
                        await createFeeItem({
                          name: formData.manualFeeItem.name,
                          amount: parseFloat(formData.manualFeeItem.amount),
                          frequency: formData.manualFeeItem.frequency,
                          category: formData.manualFeeItem.category
                        });
                      } catch (e) {
                        console.error("Error creating manual fee item:", e);
                      }
                    }

                    await createStudent(studentData);
                    
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
                      bloodGroup: 'A+',
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
                    <label className="text-sm font-bold text-foreground">{t('full_name')}</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g., Bart Simpson" 
                      value={formData.name}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, name: e.target.value }));
                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl border bg-muted/50 focus:bg-background focus:ring-4 outline-none transition-all font-medium ${formErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`} 
                    />
                    {formErrors.name && <p className="text-xs text-red-500 font-medium">{formErrors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">{t('student_id_auto')}</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g., S26001" 
                      value={formData.studentId}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl border bg-muted/50 border-border font-medium text-muted-foreground cursor-not-allowed" 
                    />
                    {formErrors.studentId && <p className="text-xs text-red-500 font-medium">{formErrors.studentId}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">{t('grade')}</label>
                    <select 
                      required 
                      value={formData.grade}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, grade: e.target.value }));
                        if (formErrors.grade) setFormErrors(prev => ({ ...prev, grade: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl border bg-muted/50 focus:bg-background focus:ring-4 outline-none transition-all font-medium ${formErrors.grade ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`}
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
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">{t('blood_group')}</label>
                    <select 
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData(prev => ({ ...prev, bloodGroup: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
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
                                  parentPhone: p.phone || '' 
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
                    <div className="space-y-2 sm:col-span-2">
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
