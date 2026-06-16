'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Languages, 
  Moon, 
  Sun, 
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  User,
  Settings as SettingsIcon,
  ChevronDown,
  Menu,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'motion/react';
import useSWR from 'swr';
import { getNotices, getAcademicYears, getBroadcasts } from '@/lib/supabase-db';
import { getUserNotifications, markNotificationAsRead, UserNotification } from '@/lib/api/notifications';
import { supabase } from '@/lib/supabase/client';
import { Logo } from '@/components/logo';
import { getOfflineQueueCount } from '@/lib/offline-db';
import { toast } from 'sonner';

interface DashboardHeaderProps {
  onShowProfile?: () => void;
  onMenuClick?: () => void;
}

export function DashboardHeader({ onShowProfile, onMenuClick }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);

  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncs, setPendingSyncs] = useState(0);

  // Web Push states
  const [pushSupported, setPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    if (typeof window === 'undefined') return;
    
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setPendingSyncs(getOfflineQueueCount());
    }, 2000);

    // Dynamic push notification support checker
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsPushSubscribed(!!sub);
        }).catch(err => {
          console.warn('Could not read existing subscription:', err);
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const { data: notices, mutate: mutateNotices } = useSWR('notices', getNotices);
  const { data: broadcasts, mutate: mutateBroadcasts } = useSWR('broadcasts', getBroadcasts);
  const { data: userNotifications, mutate: mutateUserNotifications } = useSWR(user?.id ? ['user-notifications', user.id] : null, () => getUserNotifications(user!.id));
  const { data: academicYears } = useSWR('academic_years', getAcademicYears);

  useEffect(() => {
    // Realtime channel to listen to notices, broadcasts and personal notifications
    const channel = supabase
      .channel('header-notices-broadcasts-personal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        mutateNotices();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts' }, () => {
        mutateBroadcasts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user?.id}` }, () => {
        mutateUserNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutateNotices, mutateBroadcasts, mutateUserNotifications, user?.id]);
  
  const activeYear = academicYears?.find(y => y.is_active);

  // Merge notices, broadcasts, and personal notifications, sort chronologically (newest first)
  const combinedList = [
    ...(notices || []).filter((notice: any) => !notice.isDeleted).map(notice => ({
      id: notice.id,
      title: notice.title,
      message: notice.content,
      created_at: notice.created_at,
      type: notice.is_important ? 'error' : 'info',
      icon: notice.is_important ? AlertCircle : Bell,
      color: notice.is_important ? 'text-rose-500 bg-destructive/10' : 'text-primary bg-primary/10',
      authorName: notice.authorName || 'System Admin',
      authorRole: notice.authorRole || 'admin',
      targetAudience: notice.targetAudience || 'all',
      isPersonal: false,
      status: undefined as string | undefined
    })),
    ...(broadcasts || []).filter((broadcast: any) => !broadcast.isDeleted).map((broadcast: any) => ({
      id: broadcast.id,
      title: broadcast.title || 'Broadcast Alert',
      message: broadcast.message || broadcast.content,
      created_at: broadcast.created_at,
      type: 'error',
      icon: AlertCircle,
      color: 'text-amber-500 bg-amber-500/10',
      authorName: broadcast.authorName || 'System Admin',
      authorRole: broadcast.authorRole || 'admin',
      targetAudience: broadcast.targetAudience || 'all',
      isPersonal: false,
      status: undefined as string | undefined
    })),
    ...(userNotifications || []).map(un => ({
      id: un.id,
      title: un.title,
      message: un.message,
      created_at: un.created_at,
      type: un.type,
      icon: un.type === 'error' ? AlertCircle : un.type === 'success' ? CheckCircle2 : Bell,
      color: un.type === 'error' ? 'text-rose-500 bg-destructive/10' : un.type === 'success' ? 'text-emerald-500 bg-emerald-500/10' : 'text-blue-500 bg-blue-500/10',
      authorName: 'System',
      authorRole: 'system',
      targetAudience: 'you',
      status: un.status,
      isPersonal: true
    }))
  ];

  // Sort by newest first
  combinedList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Show only 10 newest notifications in the dropdown
  const notifications = combinedList.slice(0, 10).map(item => ({
    id: item.id,
    title: item.title,
    message: item.message,
    time: new Date(item.created_at).toLocaleDateString() + ' ' + new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: item.type,
    icon: item.icon,
    color: item.color,
    authorName: item.authorName,
    authorRole: item.authorRole,
    targetAudience: item.targetAudience,
    isPersonal: item.isPersonal,
    status: item.status
  }));

  if (!user) return null;

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 transition-colors">
      <div className="flex-1 flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
        <Logo size={32} className="md:hidden" />
      </div>

      <div className="flex items-center gap-1 sm:gap-4">

        {/* Network Status & Outbox Sync Monitor */}
        <div 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold select-none shrink-0 transition-colors ${
            isOnline 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse'
          }`}
          title={isOnline ? t('system_online_msg') : t('offline_mode_msg')}
        >
          {isOnline ? (
            <>
              <Wifi size={14} className="shrink-0" />
              <span className="text-[10px] font-bold hidden sm:inline shrink-0">{t('online_sync')}</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="shrink-0" />
              <span className="text-[10px] font-bold hidden sm:inline shrink-0">{t('offline_local')}</span>
            </>
          )}

          {pendingSyncs > 0 && (
            <div className="flex items-center gap-1 bg-amber-500/20 px-1.5 py-0.5 rounded-md">
              <RefreshCw size={10} className="animate-spin" />
              <span className="text-[9px] font-black">{pendingSyncs}</span>
            </div>
          )}
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors flex items-center gap-2"
          title={t('switch_language')}
        >
          <Languages size={20} />
          <span className="text-xs font-bold uppercase hidden sm:inline">{language}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
          title={t('toggle_theme')}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors relative"
            title={t('notifications')}
          >
            <Bell size={20} />
            {combinedList.some(n => !n.isPersonal || n.status === 'unread') && (
              <span className={`absolute top-1.5 w-4 h-4 bg-destructive rounded-full border-2 border-card flex items-center justify-center text-[8px] font-black text-white ${isRTL ? 'left-1' : 'right-1'}`}>
                {combinedList.filter(n => !n.isPersonal || n.status === 'unread').length > 9 ? '9+' : combinedList.filter(n => !n.isPersonal || n.status === 'unread').length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowNotifications(false)} 
                />
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

                  {/* Dynamic Web Push subscription action inside the bell dropdown */}
                  {isMounted && pushSupported && window.Notification?.permission === 'denied' && !isPushSubscribed && (
                    <div className="p-3 mx-4 my-2.5 bg-destructive/5 dark:bg-destructive/10 rounded-xl border border-destructive/10 flex flex-col gap-1.5 select-none text-[11px]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Bell size={13} className={'text-destructive animate-pulse'} />
                          <span className="font-bold text-foreground">
                            {t('notifications_blocked')}
                          </span>
                        </div>
                        <div className={`w-2 h-2 rounded-full bg-destructive`} />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        {t('notifications_blocked_desc')}
                      </p>
                    </div>
                  )}

                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        onClick={async () => {
                          setShowNotifications(false);
                          setSelectedNotification(notification);
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
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        {t('no_notifications')}
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-muted/30 text-center border-t border-border">
                    <button 
                      onClick={() => {
                        setShowNotifications(false);
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

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted transition-all border border-transparent hover:border-border"
          >
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-md shadow-primary/20">
              {user.name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-foreground leading-none truncate max-w-[100px]">{user.name}</p>
              <p className="text-[10px] font-medium text-muted-foreground truncate mt-1">{user.email}</p>
            </div>
            <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowProfileMenu(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={`absolute top-full mt-2 w-56 bg-card rounded-2xl shadow-xl border border-border z-50 overflow-hidden ${isRTL ? 'left-0' : 'right-0'}`}
                >
                  <div className="p-4 border-b border-border bg-muted/30">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{t('account')}</p>
                    <p className="text-sm font-bold text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  
                  <div className="p-2">
                    {user?.role && !['student', 'parent'].includes(user.role) && (
                      <button 
                        onClick={() => {
                          setShowProfileMenu(false);
                          onShowProfile?.();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        <User size={18} className="text-muted-foreground" />
                        {t('profile')}
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setShowProfileMenu(false);
                        router.push('/dashboard/settings');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                      <SettingsIcon size={18} className="text-muted-foreground" />
                      {t('settings')}
                    </button>
                  </div>
                  
                  <div className="p-2 border-t border-border">
                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut size={18} />
                      {t('sign_out')}
                    </button>
                    <div className="pt-3 pb-1 text-center">
                      <p 
                        className="text-[9px] text-muted-foreground inline-flex items-center justify-center gap-1"
                        dangerouslySetInnerHTML={{ 
                          __html: (t('built_with_love') || 'Built with ❤️ by AwoodaTech™')
                            .replace('❤️', '<span class="text-red-500">❤️</span>')
                            .replace('AwoodaTech™', '<span class="font-semibold text-foreground">AwoodaTech™</span>')
                        }} 
                      />
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Selected Notice/Broadcast Details Dialog */}
      <AnimatePresence>
        {selectedNotification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div 
              className="absolute inset-0 bg-transparent" 
              onClick={() => setSelectedNotification(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-card text-foreground rounded-[2rem] border border-border shadow-2xl p-6 sm:p-8 w-full max-w-lg z-10 relative space-y-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selectedNotification.color}`}>
                    <selectedNotification.icon size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-md">
                      {selectedNotification.type === 'error' ? t('alert') : t('notice_board')}
                    </span>
                    <p className="text-xs font-semibold text-muted-foreground mt-1">
                      {selectedNotification.time}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedNotification(null)}
                  className="p-1 px-3 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted font-mono"
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground leading-snug">
                  {selectedNotification.title}
                </h3>
                <p className="text-muted-foreground font-medium text-sm sm:text-base leading-relaxed mt-4 whitespace-pre-wrap">
                  {selectedNotification.message}
                </p>
              </div>

              <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-muted-foreground">
                <div>
                  {t('publisher')}: <span className="text-foreground">{selectedNotification.authorName}</span>
                </div>
                <div>
                  {t('audience')}: <span className="bg-primary/5 text-primary px-2 py-1 rounded border border-primary/10">{t(selectedNotification.targetAudience) || selectedNotification.targetAudience}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  onClick={() => setSelectedNotification(null)}
                  className="flex-1 py-3 text-center bg-muted text-foreground text-sm font-bold rounded-xl active:scale-[0.98] transition-all hover:bg-muted/80"
                >
                  {t('close')}
                </button>
                <button 
                  onClick={() => {
                    setSelectedNotification(null);
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
    </header>
  );
}
