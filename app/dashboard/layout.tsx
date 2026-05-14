'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { useLanguage } from '@/lib/language-context';
import { useSettings } from '@/lib/settings-context';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  CalendarCheck, 
  Bell, 
  LogOut,
  BookOpen,
  Settings,
  CalendarDays,
  FileText,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bus,
  MessageSquare,
  TrendingUp,
  UserCog,
  UserCheck,
  Package
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import StaffProfileModal from '@/components/StaffProfileModal';
import { DashboardHeader } from '@/components/dashboard-header';
import { AnimatePresence } from 'motion/react';
import { Logo } from '@/components/logo';

// Mock data for the profile modal
const MOCK_LEAVE_REQUESTS = [
  { id: 'L1', staff: 'Edna Krabappel', type: 'Sick Leave', startDate: '2023-11-10', endDate: '2023-11-11', status: 'Approved', days: 2 },
];
const MOCK_PAYSLIPS = [
  { id: 'P1', staff: 'Edna Krabappel', month: 'October 2023', amount: '$4,200.00', status: 'Paid', date: '2023-10-28' },
];
const MOCK_FINANCIALS = [
  { id: 'F1', staff: 'Edna Krabappel', type: 'Bonus', amount: '$500.00', date: '2023-12-15', status: 'Approved', description: 'Year-end performance bonus' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, switchStudent, isLoading } = useAuth();
  const { settings } = useSettings();
  const { can } = usePermissions();
  const { t, isRTL } = useLanguage();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'qualifications' | 'schedule' | 'leave' | 'payroll' | 'financials'>('overview');

  // Automatically collapse on smaller desktop screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else if (window.innerWidth >= 1024) {
        setIsCollapsed(false);
      }
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in auth-context
  }

  const getNavItems = () => {
    const items = [
      { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard, show: true },
      { name: t('students'), href: '/dashboard/students', icon: Users, show: can('view', 'students') },
      { name: t('exams'), href: '/dashboard/assessments', icon: FileText, show: can('view', 'assessments') },
      { name: t('schedule'), href: '/dashboard/schedule', icon: CalendarDays, show: can('view', 'schedule') },
      { name: t('attendance'), href: '/dashboard/attendance', icon: CalendarCheck, show: can('view', 'attendance') },
      { name: t('fees'), href: '/dashboard/fees', icon: CreditCard, show: can('view', 'fees') },
      { name: t('hr'), href: '/dashboard/hr', icon: UserCog, show: can('view', 'hr') },
      { name: t('transport'), href: '/dashboard/transport', icon: Bus, show: can('view', 'transport') },
      { name: t('visitors'), href: '/dashboard/visitors', icon: UserCheck, show: can('view', 'visitors') },
      { name: t('inventory'), href: '/dashboard/inventory', icon: Package, show: can('view', 'inventory') },
      { name: t('analytics'), href: '/dashboard/analytics', icon: TrendingUp, show: can('view', 'analytics') },
      { name: t('communication'), href: '/dashboard/communication', icon: MessageSquare, show: can('view', 'communication') },
      { name: t('settings'), href: '/dashboard/settings', icon: Settings, show: can('view', 'settings') },
    ];
    return items.filter(item => item.show);
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen w-full bg-muted/30 dark:bg-background flex flex-col md:flex-row font-sans transition-colors">
      
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex flex-col bg-card border-border fixed h-full z-20 shadow-sm transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-56'
        } ${isRTL ? 'right-0 border-l' : 'left-0 border-r'}`}
      >
        <div className="p-4 border-b border-border/50 flex items-center justify-center h-24 relative">
          <div className={`flex items-center justify-center gap-4 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
            <Logo withText size={42} className="w-full justify-center" />
          </div>
          
          {isCollapsed && (
            <div className="mx-auto flex items-center justify-center shrink-0">
              <Logo size={42} />
            </div>
          )}

          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`absolute top-6 bg-card border border-border rounded-full p-1 text-muted-foreground hover:text-primary hover:border-primary/50 shadow-sm transition-all z-30 ${
              isRTL ? '-left-3 rotate-0' : '-right-3 rotate-0'
            } ${isCollapsed ? (isRTL ? 'rotate-0' : 'rotate-180') : (isRTL ? 'rotate-180' : 'rotate-0')}`}
          >
            {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {navItems.map((item) => {
            const isActive = item.href === '/dashboard' 
              ? pathname === '/dashboard' 
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-semibold transition-all group relative ${
                  isActive 
                    ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <item.icon size={24} className={`shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                
                {!isCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className={`absolute ml-4 px-2.5 py-1.5 bg-foreground text-background text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 ${isRTL ? 'right-full mr-4' : 'left-full ml-4'}`}>
                    {item.name}
                    <div className={`absolute top-1/2 -translate-y-1/2 border-4 border-transparent ${isRTL ? '-right-1 border-l-foreground' : '-left-1 border-r-foreground'}`} />
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/50">
          {user.role === 'parent' && user.studentIds && user.studentIds.length > 1 && !isCollapsed && (
            <div className="mb-4 px-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Switch Student</label>
              <select 
                value={user.studentId} 
                onChange={(e) => switchStudent(e.target.value)}
                className="w-full bg-background border border-border text-foreground text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {user.studentIds.map(id => (
                  <option key={id} value={id}>Student: {id}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="px-2 py-1 flex flex-col justify-center items-center gap-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Smart School v1.0</p>
            {!isCollapsed && (
              <p 
                className="text-[9px] text-muted-foreground inline-flex items-center justify-center gap-1"
                dangerouslySetInnerHTML={{ 
                  __html: (t('built_with_love') || 'Built with ❤️ by AwoodaTech™')
                    .replace('❤️', '<span class="text-red-500">❤️</span>')
                    .replace('AwoodaTech™', '<span class="font-semibold text-foreground">AwoodaTech™</span>')
                }} 
              />
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={`md:hidden fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} w-72 bg-card shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`}>
        <div className="p-6 border-b border-border flex items-center justify-center relative">
          <Logo withText size={48} />
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className={`absolute ${isRTL ? 'left-5' : 'right-5'} p-2 text-muted-foreground hover:bg-muted rounded-full`}
          >
            {isRTL ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === '/dashboard' 
              ? pathname === '/dashboard' 
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                  isActive 
                    ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon size={24} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col transition-all duration-300 md:pb-0 pb-16 ${isCollapsed ? (isRTL ? 'md:mr-20' : 'md:ml-20') : (isRTL ? 'md:mr-56' : 'md:ml-56')}`}>
        <DashboardHeader 
          onShowProfile={() => setShowProfileModal(true)} 
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />
        <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation (Quick Links - 2026 PWA Spec) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-border z-50 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {[
            { id: 'dashboard', name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard },
            { id: 'classes', name: t('attendance'), href: '/dashboard/attendance', icon: CalendarCheck },
            { id: 'messages', name: t('communication'), href: '/dashboard/communication', icon: MessageSquare },
            { id: 'profile', name: t('settings'), href: '/dashboard/settings', icon: Settings },
          ].map((item) => {
            const isActive = item.href === '/dashboard' 
              ? pathname === '/dashboard' 
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-primary/10 scale-110' : 'active:scale-95'}`}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <AnimatePresence>
        {showProfileModal && (
          <StaffProfileModal 
            selectedStaff={{
              id: user.id,
              name: user.name,
              role: user.role,
              department: user.staffProfile?.department || 'N/A',
              email: user.email || user.staffProfile?.email || 'N/A',
              phone: user.phone || user.staffProfile?.phone || 'N/A',
              status: 'Active',
              designation: user.staffProfile?.designation || 'N/A',
              joinDate: user.staffProfile?.joinDate || 'N/A',
              qualifications: user.staffProfile?.qualifications || [],
              subjects: user.staffProfile?.subjects || []
            }} 
            handleCloseProfile={() => setShowProfileModal(false)}
            activeProfileTab={activeProfileTab}
            setActiveProfileTab={setActiveProfileTab}
            MOCK_LEAVE_REQUESTS={MOCK_LEAVE_REQUESTS}
            MOCK_PAYSLIPS={MOCK_PAYSLIPS}
            MOCK_FINANCIALS={MOCK_FINANCIALS}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
