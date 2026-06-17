'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  LayoutDashboard, School, CreditCard, Database, HeartPulse, Users,
  Megaphone, Shield, ChevronLeft, ChevronRight, LogOut, Menu, X,
} from 'lucide-react';

const navItems = [
  { href: '/super-admin', icon: LayoutDashboard, key: 'super_admin_dashboard', exact: true },
  { href: '/super-admin/schools', icon: School, key: 'super_admin_schools' },
  { href: '/super-admin/subscriptions', icon: CreditCard, key: 'super_admin_subscriptions' },
  { href: '/super-admin/backups', icon: Database, key: 'super_admin_backups' },
  { href: '/super-admin/health', icon: HeartPulse, key: 'super_admin_health' },
  { href: '/super-admin/users', icon: Users, key: 'super_admin_users' },
  { href: '/super-admin/announcements', icon: Megaphone, key: 'super_admin_announcements' },
  { href: '/super-admin/audit', icon: Shield, key: 'super_admin_audit' },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user || user.role !== 'super_admin') {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Access denied</div>;
  }

  const isActive = (item: typeof navItems[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const sidebarContent = (closeNav?: () => void) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
          SA
        </div>
        {!isCollapsed && <span className="font-bold text-foreground truncate">{t('super_admin')}</span>}
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link key={item.href} href={item.href} onClick={closeNav}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? t(item.key) : undefined}>
              <item.icon size={20} className="shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium truncate">{t(item.key)}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-2 space-y-1">
        <button onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          {isRTL ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!isCollapsed && <span className="text-sm font-medium">{t('collapse')}</span>}
        </button>
        <button onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <LogOut size={20} />
          {!isCollapsed && <span className="text-sm font-medium">{t('logout')}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />}
      {/* Mobile sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50 md:hidden transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${isRTL ? 'left-auto right-0' : ''}`}>
        {sidebarContent(() => setMobileOpen(false))}
      </aside>
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col bg-card border-border fixed h-full z-20 shadow-sm transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-56'
      } ${isRTL ? 'right-0 border-l' : 'left-0 border-r'}`}>
        {sidebarContent()}
      </aside>
      {/* Main content */}
      <div className={`transition-all duration-300 ${isCollapsed ? (isRTL ? 'md:mr-20' : 'md:ml-20') : (isRTL ? 'md:mr-56' : 'md:ml-56')}`}>
        <header className="sticky top-0 z-10 h-16 bg-background/80 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 lg:px-6">
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 text-muted-foreground hover:text-foreground">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground hidden sm:inline">{language === 'ar' ? 'ar' : 'en'}</span>
          </div>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
