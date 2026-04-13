import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Search, Plus, Calendar, MapPin, UserCircle, Phone, Mail, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown, Camera, UserPlus, Settings, Trash2, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

export function DeleteModal({ isDeleteModalOpen, setIsDeleteModalOpen, deleteReason, setDeleteReason, isSubmitting, handleDeleteStudent, t }: any) {
  return (
    <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border p-8"
            >
              <div className="flex items-center gap-4 text-red-500 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{t('delete_student')}</h2>
                  <p className="text-sm font-medium text-muted-foreground">{t('delete_student_desc')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">{t('reason_for_deletion')}</label>
                  <textarea 
                    required
                    placeholder={t('delete_reason_placeholder')}
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-red-500 outline-none transition-all font-medium min-h-[100px]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setStudentToDelete(null);
                      setDeleteReason('');
                    }}
                    className="flex-1 px-6 py-3 border border-border rounded-xl font-bold hover:bg-muted transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={handleDeleteStudent}
                    disabled={isSubmitting || !deleteReason}
                    className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : t('delete')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
    </AnimatePresence>
  );
}
