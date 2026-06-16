'use client';

import { useState, useEffect } from 'react';
import { Languages, Moon, Sun, Menu, Bell, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import useSWR from 'swr';
import { getNotices, getAcademicYears, getBroadcasts } from '@/lib/supabase-db';
import { getUserNotifications } from '@/lib/api/notifications';
import { supabase } from '@/lib/supabase/client';
import { Logo } from '@/components/logo';
import { getOfflineQueueCount } from '@/lib/offline-db';
import { NetworkStatus } from '@/components/dashboard-header/NetworkStatus';
import { NotificationsDropdown } from '@/components/dashboard-header/NotificationsDropdown';
import { NotificationDetailModal } from '@/components/dashboard-header/NotificationDetailModal';
import { UserProfileDropdown } from '@/components/dashboard-header/UserProfileDropdown';

interface DashboardHeaderProps {
  onShowProfile?: () => void;
  onMenuClick?: () => void;
}

export function DashboardHeader({ onShowProfile, onMenuClick }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { user, logout } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);

  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncs, setPendingSyncs] = useState(0);

  const [pushSupported, setPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
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

  combinedList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
        <NetworkStatus isOnline={isOnline} pendingSyncs={pendingSyncs} t={t} />

        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors flex items-center gap-2"
          title={t('switch_language')}
        >
          <Languages size={20} />
          <span className="text-xs font-bold uppercase hidden sm:inline">{language}</span>
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
          title={t('toggle_theme')}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <NotificationsDropdown
          show={showNotifications}
          onToggle={() => setShowNotifications(!showNotifications)}
          onSelect={(n) => setSelectedNotification(n)}
          notifications={notifications}
          combinedList={combinedList}
          mutateUserNotifications={mutateUserNotifications}
          t={t}
          isRTL={isRTL}
          pushSupported={pushSupported}
          isPushSubscribed={isPushSubscribed}
          isMounted={isMounted}
        />

        <UserProfileDropdown
          show={showProfileMenu}
          onToggle={() => setShowProfileMenu(!showProfileMenu)}
          user={user}
          onShowProfile={onShowProfile}
          onLogout={logout}
          t={t}
          isRTL={isRTL}
        />
      </div>

      <NotificationDetailModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        t={t}
      />
    </header>
  );
}
