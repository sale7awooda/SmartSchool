'use client';

import { useRouter } from 'next/navigation';
import { ChevronDown, User, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfileDropdownProps {
  show: boolean;
  onToggle: () => void;
  user: { name: string; email: string; role?: string };
  onShowProfile?: () => void;
  onLogout: () => void;
  t: (key: string) => string;
  isRTL: boolean;
}

export function UserProfileDropdown({
  show,
  onToggle,
  user,
  onShowProfile,
  onLogout,
  t,
  isRTL
}: UserProfileDropdownProps) {
  const router = useRouter();

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted transition-all border border-transparent hover:border-border"
      >
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-md shadow-primary/20">
          {user.name.charAt(0)}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold text-foreground leading-none truncate max-w-[100px]">{user.name}</p>
          <p className="text-[10px] font-medium text-muted-foreground truncate mt-1">{user.email}</p>
        </div>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${show ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {show && (
          <>
            <div className="fixed inset-0 z-40" onClick={onToggle} />
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
                      onToggle();
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
                    onToggle();
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
                  onClick={onLogout}
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
  );
}
