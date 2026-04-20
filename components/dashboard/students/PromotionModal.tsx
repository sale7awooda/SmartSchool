import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Search, Plus, Calendar, MapPin, UserCircle, Phone, Mail, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown, Camera, UserPlus, Settings, Trash2, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

import { Student } from '@/types';

interface PromotionModalProps {
  isPromotionModalOpen: boolean;
  setIsPromotionModalOpen: (open: boolean) => void;
  promotionType: 'grade' | 'class' | 'manual';
  setPromotionType: (type: 'grade' | 'class' | 'manual') => void;
  promotionValue: string;
  setPromotionValue: (value: string) => void;
  targetGrade: string;
  setTargetGrade: (grade: string) => void;
  isSubmitting: boolean;
  handlePromoteStudents: (type: 'grade' | 'class' | 'manual', value?: string) => Promise<void>;
  classesList: string[];
  t: (key: string) => string;
}

export function PromotionModal({ 
  isPromotionModalOpen, 
  setIsPromotionModalOpen, 
  promotionType, 
  setPromotionType, 
  promotionValue, 
  setPromotionValue, 
  targetGrade, 
  setTargetGrade, 
  isSubmitting, 
  handlePromoteStudents, 
  classesList, 
  t 
}: PromotionModalProps) {
  return (
    <AnimatePresence>
        {isPromotionModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">{t('promote_students')}</h2>
                  <p className="text-sm font-medium text-muted-foreground mt-2">
                    {promotionType === 'grade' ? t('promote_students_grade_desc') : 
                     promotionType === 'class' ? t('promote_students_class_desc') : 
                     t('promote_students_manual_desc')}
                  </p>
                </div>
                <button 
                  onClick={() => setIsPromotionModalOpen(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">
                      {promotionType === 'grade' ? t('select_current_grade') : 
                       promotionType === 'class' ? t('select_current_class') : 
                       t('search_student')}
                    </label>
                    {promotionType === 'manual' ? (
                      <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
                        <input 
                          type="text"
                          placeholder={t('search_student_placeholder')}
                          value={promotionValue}
                          onChange={(e) => setPromotionValue(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary outline-none transition-all font-medium rtl:pl-4 rtl:pr-10"
                        />
                      </div>
                    ) : (
                      <select 
                        value={promotionValue}
                        onChange={(e) => setPromotionValue(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary outline-none transition-all font-medium"
                      >
                        <option value="">{t('select')} {promotionType === 'grade' ? t('grade') : t('class')}</option>
                        {classesList.map((c: string) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">{t('target_grade')}</label>
                    <select 
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary outline-none transition-all font-medium"
                    >
                      <option value="">{t('select_target_grade')}</option>
                      {classesList.map((c: string) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Graduated">{t('graduated_completed')}</option>
                    </select>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
                    <AlertCircle size={20} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-primary font-medium leading-relaxed">
                      {t('promotion_warning')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsPromotionModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-border rounded-xl font-bold hover:bg-muted transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={() => handlePromoteStudents(promotionType, promotionValue)}
                    disabled={isSubmitting || !promotionValue || !targetGrade}
                    className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : t('confirm')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
    </AnimatePresence>
  );
}
