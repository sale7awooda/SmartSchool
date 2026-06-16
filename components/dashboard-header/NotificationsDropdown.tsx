'use client';

import { useRouter } from 'next/navigation';
import { Bell, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { markNotificationAsRead } from '@/lib/api/notifications';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: string;
  icon: any;
  color: string;
  authorName: string;
  authorRole: string;
  targetAudience: string;
  isPersonal: boolean;
  status?: string;
}

interface NotificationsDropdownProps {
  show: boolean;
  onToggle: () => void;
  onSelect: (notification: NotificationItem) => void;
  notifications: NotificationItem[];
  combinedList: any[];
  mutateUserNotifications: () => void;
  t: (key: string) => string;
  isRTL: boolean;
  pushSupported: boolean;
  isPushSubscribed: boolean;
  isMounted: boolean;
}

export function NotificationsDropdown({
  show,
  onToggle,
  onSelect,
  notifications,
  combinedList,
  mutateUserNotifications,
  t,
  isRTL,
  pushSupported,
  isPushSubscribed,
  isMounted
}: NotificationsDropdownProps) {
  const router = useRouter();

  const unreadCount = combinedList.filter(
    (n: any) => !n.isPersonal || n.status === 'unread'
  ).length;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors relative"
        title={t('notifications')}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={`absolute top-1.5 w-4 h-4 bg-destructive rounded-full border-2 border-card flex items-center justify-center text-[8px] font-black text-white ${isRTL ? 'left-1' : 'right-1'}`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {show && (
          <>
            <div className="fixed inset-0 z-40" onClick={onToggle} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`absolute top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-card rounded-2xl shadow-xl border border-border z-50 overflow-hidden ${isRTL ? 'left-0' : 'right-0'}`}
            >
              <div className="p-4 border-b border-border flex items-center justify-between col-span-1">
                <h3 className="font-bold text-foreground">{t('notifications')}</h3>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">{notifications.length} {t('new')}</span>
              </div>

              {isMounted && pushSupported && typeof window !== 'undefined' && window.Notification?.permission === 'denied' && !isPushSubscribed && (
                <div className="p-3 mx-4 my-2.5 bg-destructive/5 dark:bg-destructive/10 rounded-xl border border-destructive/10 flex flex-col gap-1.5 select-none text-[11px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Bell size={13} className="text-destructive animate-pulse" />
                      <span className="font-bold text-foreground">{t('notifications_blocked')}</span>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal">{t('notifications_blocked_desc')}</p>
                </div>
              )}

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length > 0 ? notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={async () => {
                      onToggle();
                      onSelect(notification);
                      if (notification.isPersonal && notification.status === 'unread') {
                        try {
                          await markNotificationAsRead(notification.id);
                          mutateUserNotifications();
                        } catch (err) {
                          console.error('Failed to mark notification as read:', err);
                        }
                      }
                    }}
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border last:border-0"
                  >
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notification.color}`}>
                        <notification.icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
                        <p className="text-[10px] font-medium text-muted-foreground mt-2">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">{t('no_notifications')}</div>
                )}
              </div>
              <div className="p-3 bg-muted/30 text-center border-t border-border">
                <button
                  onClick={() => {
                    onToggle();
                    router.push('/dashboard/communication');
                  }}
                  className="text-xs font-bold text-primary hover:text-primary/80"
                >
                  {t('view_all_notifications')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
