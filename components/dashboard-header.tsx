'use client';

import { useState } from 'react';
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
  Menu
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'motion/react';
import useSWR from 'swr';
import { getNotices, getAcademicYears } from '@/lib/supabase-db';
import { Logo } from '@/components/logo';

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

  const { data: notices } = useSWR('notices', getNotices);
  const { data: academicYears } = useSWR('academic_years', getAcademicYears);
  
  const activeYear = academicYears?.find(y => y.is_active);

  const notifications = notices?.slice(0, 5).map(notice => ({
    id: notice.id,
    title: notice.title,
    message: notice.content,
    time: new Date(notice.created_at).toLocaleDateString(),
    type: notice.is_important ? 'error' : 'info',
    icon: notice.is_important ? AlertCircle : Bell,
    color: notice.is_important ? 'text-rose-500 bg-destructive/10' : 'text-primary bg-primary/10'
  })) || [];

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
            <span className={`absolute top-2 w-2 h-2 bg-destructive rounded-full border-2 border-card ${isRTL ? 'left-2' : 'right-2'}`} />
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
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-foreground">{t('notifications')}</h3>
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">{notifications.length} {t('new')}</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        onClick={() => {
                          setShowNotifications(false);
                          router.push('/dashboard/communication');
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
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
