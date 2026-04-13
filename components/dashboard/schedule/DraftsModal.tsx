import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Search, Plus, Calendar, MapPin, UserCircle, Phone, Mail, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown, Camera, UserPlus, Settings, Trash2, Edit, Save, Play, CheckCircle2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function DraftsModal({ isDraftModalOpen, setIsDraftModalOpen, drafts, loadDraft, handleDeleteDraft, isSubmitting }: any) {
  return (
    <AnimatePresence>
        {isDraftModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">Saved Drafts</h3>
                <button onClick={() => setIsDraftModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>
              
              <div className="overflow-y-auto space-y-3 pr-2">
                {drafts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No saved drafts found.
                  </div>
                ) : (
                  drafts.map((draft) => (
                    <div 
                      key={draft.id}
                      className="p-4 bg-muted/50 border border-border rounded-xl flex items-center justify-between hover:bg-muted transition-colors group"
                    >
                      <div>
                        <h4 className="font-bold text-foreground">{draft.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          Last updated: {new Date(draft.updated_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleLoadDraft(draft)}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors"
                        >
                          Load
                        </button>
                        <button 
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}
