'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationDetailModalProps {
  notification: any;
  onClose: () => void;
  t: (key: string) => string;
}

export function NotificationDetailModal({ notification, onClose, t }: NotificationDetailModalProps) {
  const router = useRouter();

  return (
    <AnimatePresence>
      {notification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-transparent" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-card text-foreground rounded-[2rem] border border-border shadow-2xl p-6 sm:p-8 w-full max-w-lg z-10 relative space-y-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${notification.color}`}>
                  <notification.icon size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-md">
                    {notification.type === 'error' ? t('alert') : t('notice_board')}
                  </span>
                  <p className="text-xs font-semibold text-muted-foreground mt-1">{notification.time}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 px-3 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted font-mono"
              >
                ✕
              </button>
            </div>

            <div>
              <h3 className="text-xl font-bold text-foreground leading-snug">{notification.title}</h3>
              <p className="text-muted-foreground font-medium text-sm sm:text-base leading-relaxed mt-4 whitespace-pre-wrap">
                {notification.message}
              </p>
            </div>

            <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-muted-foreground">
              <div>
                {t('publisher')}: <span className="text-foreground">{notification.authorName}</span>
              </div>
              <div>
                {t('audience')}: <span className="bg-primary/5 text-primary px-2 py-1 rounded border border-primary/10">{t(notification.targetAudience) || notification.targetAudience}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 text-center bg-muted text-foreground text-sm font-bold rounded-xl active:scale-[0.98] transition-all hover:bg-muted/80"
              >
                {t('close')}
              </button>
              <button
                onClick={() => {
                  onClose();
                  router.push('/dashboard/communication');
                }}
                className="flex-1 py-3 text-center bg-primary text-primary-foreground text-sm font-bold rounded-xl active:scale-[0.98] transition-all hover:bg-primary/90 shadow-lg shadow-primary/10"
              >
                {t('open_notice_board')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
