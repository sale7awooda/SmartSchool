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

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: 'New Grade Posted',
    message: 'Mathematics Mid-term results are now available.',
    time: '2 mins ago',
    type: 'success',
    icon: CheckCircle2,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
  },
  {
    id: 2,
    title: 'Attendance Alert',
    message: 'Student ID #1234 was marked absent for the first period.',
    time: '1 hour ago',
    type: 'warning',
    icon: Clock,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'
  },
  {
    id: 3,
    title: 'Fee Reminder',
    message: 'Term 2 tuition fees are due by next Friday.',
    time: '5 hours ago',
    type: 'error',
    icon: AlertCircle,
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10'
  }
];

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

  if (!user) return null;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 transition-colors">
      <div className="flex-1 flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
        
        <div className="relative max-w-md w-full hidden md:block">
          <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} size={18} />
          <input 
            type="text" 
            placeholder={t('search')}
            className={`w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 dark:text-slate-200 transition-all ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-4">
        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-2"
          title={t('switch_language')}
        >
          <Languages size={20} />
          <span className="text-xs font-bold uppercase hidden sm:inline">{language}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          title={t('toggle_theme')}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors relative"
            title={t('notifications')}
          >
            <Bell size={20} />
            <span className={`absolute top-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 ${isRTL ? 'left-2' : 'right-2'}`} />
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
                  className={`absolute top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden ${isRTL ? 'left-0' : 'right-0'}`}
                >
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white">{t('notifications')}</h3>
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-full">3 {t('new')}</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {MOCK_NOTIFICATIONS.map((notification) => (
                      <div 
                        key={notification.id}
                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                      >
                        <div className="flex gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notification.color}`}>
                            <notification.icon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{notification.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{notification.message}</p>
                            <p className="text-[10px] font-medium text-slate-400 mt-2">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 text-center border-t border-slate-100 dark:border-slate-700">
                    <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700">{t('view_all_notifications')}</button>
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
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-indigo-600/20">
              {user.name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-none truncate max-w-[100px]">{user.name}</p>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 capitalize mt-1">{user.role.replace(/([A-Z])/g, ' $1').trim()}</p>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
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
                  className={`absolute top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden ${isRTL ? 'left-0' : 'right-0'}`}
                >
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('account')}</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email || user.studentId}</p>
                  </div>
                  
                  <div className="p-2">
                    <button 
                      onClick={() => {
                        setShowProfileMenu(false);
                        onShowProfile?.();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <User size={18} className="text-slate-400" />
                      {t('profile')}
                    </button>
                    <button 
                      onClick={() => {
                        setShowProfileMenu(false);
                        router.push('/dashboard/settings');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <SettingsIcon size={18} className="text-slate-400" />
                      {t('settings')}
                    </button>
                  </div>
                  
                  <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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
