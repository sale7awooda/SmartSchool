'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { supabase } from '@/lib/supabase/client';
import { getActiveAcademicYear } from '@/lib/supabase-db';
import { 
  Users, CalendarCheck, CreditCard, TrendingUp, ArrowRight, 
  AlertCircle, BookOpen, CheckCircle2, Bell, Loader2, Clock,
  Activity, ShieldCheck, Zap, BarChart3, Building2, Plus, ArrowUpRight,
  UserPlus, FileText, Settings, Search
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useLanguage } from '@/lib/language-context';
import { useSettings, formatAmount } from '@/lib/settings-context';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function DashboardHome() {
  const { user } = useAuth();
  const { isRole } = usePermissions();
  const { t } = useLanguage();
  const { settings } = useSettings();

  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);

  const fetchDashboardData = async () => {
    if (!user) return null;
    let stats = { 
      totalStudents: 0, 
      attendanceToday: 0, 
      feeCollected: 0, 
      pendingFees: 0, 
      totalStaff: 0, 
      feeCollectedToday: 0,
      activeClasses: 0,
      activeNotices: 0,
      presentCount: 0,
      absentCount: 0
    };
    let notices = [];
    let recentActivities = [];

    try {
      if (isRole(['admin', 'accountant'])) {
        // Basic counts
        const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_deleted', false);
        const { count: staffCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['teacher', 'staff', 'accountant', 'admin']);
        const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });
        const { count: noticeCount } = await supabase.from('notices').select('*', { count: 'exact', head: true });
        
        // Attendance
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: attendanceData } = await supabase.from('attendance').select('status').eq('date', todayStr);
        const present = attendanceData?.filter((a: any) => a.status === 'present').length || 0;
        const totalAtt = attendanceData?.length || 0;
        const attendanceRate = studentCount ? Math.round((present / studentCount) * 100) : 0;

        // Fees
        let feeQuery = supabase.from('fee_invoices').select('amount, status');
        if (activeAcademicYear) {
          const { data: studentsInYear } = await supabase.from('students').select('id').eq('academic_year', activeAcademicYear.name);
          const sIds = studentsInYear?.map(s => s.id) || [];
          if (sIds.length > 0) feeQuery = feeQuery.in('student_id', sIds);
          else feeQuery = feeQuery.eq('student_id', '00000000-0000-0000-0000-000000000000');
        }
        const { data: feeData } = await feeQuery;
        const collected = feeData?.filter((f: any) => f.status === 'paid').reduce((acc, f) => acc + Number(f.amount), 0) || 0;
        const pending = feeData?.filter((f: any) => ['pending', 'overdue'].includes(f.status)).reduce((acc, f) => acc + Number(f.amount), 0) || 0;

        const { data: todayPayments } = await supabase.from('fee_payments').select('amount').gte('payment_date', `${todayStr}T00:00:00`);
        const collectedToday = todayPayments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;

        stats = {
          totalStudents: studentCount || 0,
          attendanceToday: attendanceRate,
          feeCollected: collected,
          pendingFees: pending,
          totalStaff: staffCount || 0,
          feeCollectedToday: collectedToday,
          activeClasses: classCount || 0,
          activeNotices: noticeCount || 0,
          presentCount: present,
          absentCount: (studentCount || 0) - present
        };
        
        // Safely try to fetch audit logs securely created by new system integrations
        try {
          const { data: auditData, error: auditError } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (!auditError && auditData) {
            recentActivities = auditData;
          }
        } catch (e) {
          console.warn('Audit logs table may not exist yet or failed to fetch');
        }
      }

      const { data: noticesData } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (noticesData) notices = noticesData;
    } catch (error: any) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('Supabase connection failed. Using empty dashboard data.');
      } else {
        console.error('Dashboard fetch error:', error);
      }
    }

    return { stats, notices, recentActivities };
  };

  const { data, isLoading: isMainLoading } = useSWR(
    user ? `dashboard-${user.id}-${user.role}-${activeAcademicYear?.name}` : null, 
    fetchDashboardData
  );

  const { data: teacherStats, isLoading: isTeacherLoading } = useSWR(
    user && isRole('teacher') ? `teacher-stats-${user.id}` : null,
    async () => {
      if (!user) return { studentCount: 0, attendanceRate: 0, upcomingTasksCount: 0, schedules: [] };
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false);
      
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('date', new Date().toISOString().split('T')[0]);
      
      const presentCount = attendanceData?.filter((a: any) => a.status === 'present').length || 0;
      const attendanceRate = studentCount ? Math.round((presentCount / studentCount) * 100) : 0;

      // Count assessments (upcoming alerts/tasks)
      const { count: assessmentCount } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch teacher's schedules for today
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = days[new Date().getDay()];
      
      const { data: rawSchedules } = await supabase
        .from('schedules')
        .select('*, class:classes(name), subject:subjects(name)')
        .eq('teacher_id', user.id);

      const teacherSchedules = rawSchedules?.filter((s: any) => s.day_of_week === todayDay) || [];

      return { 
        studentCount: studentCount || 0, 
        attendanceRate, 
        upcomingTasksCount: assessmentCount || 0,
        schedules: teacherSchedules 
      };
    }
  );

  if (!user) return null;

  const isLoading = isMainLoading || (isRole('teacher') && isTeacherLoading);

  if (isLoading) {
    return (
      <div className="space-y-8 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-14 w-32 rounded-xl" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card p-6 rounded-[2rem] border border-border shadow-sm flex flex-col justify-between min-h-[160px] animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-4 flex-1 pr-4">
                  <div className="h-2 w-28 bg-muted-foreground/20 rounded"></div>
                  <div className="h-8 w-32 bg-muted-foreground/20 rounded"></div>
                </div>
                <div className="h-10 w-10 rounded-xl shrink-0 bg-muted-foreground/10"></div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                 <div className="h-6 w-32 rounded-full bg-muted-foreground/10"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8">
              <Skeleton className="h-6 w-40 mb-6" />
              <div className="space-y-4">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats || { totalStudents: 0, attendanceToday: 0, feeCollected: 0, pendingFees: 0, totalStaff: 0 };
  const notices = data?.notices || [];
  const recentActivities = data?.recentActivities || [];

  if (isRole('parent') || isRole('student')) return <ParentDashboard notices={notices} />;
  if (isRole('teacher')) return <TeacherDashboard notices={notices} teacherStats={teacherStats} />;
  if (isRole('accountant')) return <AccountantDashboard stats={stats} notices={notices} />;
  return <AdminDashboard stats={stats} notices={notices} recentActivities={recentActivities} />;
}

function AdminDashboard({ stats: realStats, notices, recentActivities }: { stats: any, notices: any[], recentActivities: any[] }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { settings } = useSettings();
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  
  const mainStats = [
    { 
      label: t('total_students'), 
      value: (realStats.totalStudents || 0).toLocaleString(), 
      sub: `${realStats.activeClasses || 0} ${t('active_classes_count')}`,
      icon: Users, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      path: '/dashboard/students'
    },
    { 
      label: t('attendance_today'), 
      value: `${realStats.attendanceToday || 0}%`, 
      sub: `${realStats.presentCount || 0} ${t('students_present_count')}`,
      icon: CalendarCheck, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10',
      path: '/dashboard/attendance'
    },
    { 
      label: t('fees_collected') || t('revenue'), 
      value: formatAmount(realStats.feeCollected || 0, settings?.currency), 
      sub: `${formatAmount(realStats.feeCollectedToday || 0, settings?.currency)} ${t('today')}`,
      icon: Zap, 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-500/10',
      path: '/dashboard/fees'
    },
    { 
      label: t('collection_gap'), 
      value: formatAmount(realStats.pendingFees || 0, settings?.currency), 
      sub: t('pending_receivables'),
      icon: TrendingUp, 
      color: 'text-amber-500', 
      bg: 'bg-amber-500/10',
      path: '/dashboard/fees'
    },
  ];

  const formatActionType = (action: string) => {
    switch(action) {
      case 'STUDENT_ENROLLED': return t('student_enrolled');
      case 'STAFF_CREATED': return t('staff_created');
      case 'FEE_INVOICE_CREATED': return t('fee_invoice_generated');
      case 'FEE_INVOICE_VOIDED': return t('fee_invoice_voided');
      case 'FEE_PAYMENT_RECORDED': return t('payment_recorded');
      case 'ASSESSMENT_CREATED': return t('assessment_created');
      case 'ATTENDANCE_RECORDED': return t('bulk_attendance_saved');
      default: return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  };

  const formatTimeAgo = (isoString: string) => {
    const diff = new Date().getTime() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}${t('m')} ${t('ago')}`;
    if (hours < 24) return `${hours}${t('h')} ${t('ago')}`;
    return `${days}${t('d')} ${t('ago')}`;
  };

  const feeData = [
    { name: 'Collected', value: realStats.feeCollected || 0, color: '#6366f1' },
    { name: 'Pending', value: realStats.pendingFees || 0, color: '#f59e0b' },
  ];

  const attendanceRateVal = Math.max(0, Math.min(100, realStats.attendanceToday || 0));
  const attData = [
    { name: 'Present', value: realStats.presentCount || 0, color: '#10b981' },
    { name: 'Absent', value: realStats.absentCount || 0, color: '#f43f5e' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2 pb-safe">
      {/* Dynamic Header & Extra Helpful KPIs (Replacing old Command Center) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-card/60 border border-border p-6 rounded-[2.5rem] backdrop-blur-md shrink-0">
        <div className="lg:col-span-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
            {settings?.logo_url ? (
              <Image src={settings.logo_url} alt="Logo" width={40} height={40} className="w-10 h-10 object-contain rounded-lg" />
            ) : (
              <Building2 size={24} />
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">
              {settings?.school_name || 'Smart School'} {t('dashboard')}
            </h1>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1 opacity-70">
              {activeAcademicYear?.name || t('academic_years')} • {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Highlight Extra KPIs */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 bg-muted/30 border border-border/50 p-4 rounded-2xl">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <CreditCard size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">{t('today_revenue')}</span>
              <span className="text-sm font-bold text-foreground">
                {formatAmount(realStats.feeCollectedToday || 0, settings?.currency)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-muted/30 border border-border/50 p-4 rounded-2xl">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Users size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">{t('staff_faculty')}</span>
              <span className="text-sm font-bold text-foreground">
                {realStats.totalStaff || 0} {t('active_members')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-muted/30 border border-border/50 p-4 rounded-2xl">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
              <Bell size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">{t('live_notices')}</span>
              <span className="text-sm font-bold text-foreground">
                {realStats.activeNotices || 0} {t('publications')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 @[1200px]:grid-cols-4 gap-6">
        {mainStats.map((stat, i) => (
          <Link href={stat.path} key={i} className="block active:scale-98 transition-all duration-100">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-card p-6 h-full rounded-[2rem] border border-border hover:border-primary/35 shadow-sm hover:shadow-md transition-all group relative overflow-hidden cursor-pointer"
            >
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</p>
                  <h3 className="text-3xl font-black text-foreground mt-1 tracking-tighter">{stat.value}</h3>
                  <p className="text-xs font-bold text-muted-foreground/60 mt-1">{stat.sub}</p>
                </div>
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon size={22} />
                </div>
              </div>
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.03] ${stat.bg.replace('/10', '')}`} />
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Operations & Intelligence Section */}
      <div className="grid grid-cols-1 @[1200px]:grid-cols-3 gap-6">
        {/* Real-time Collections */}
        <div className="@[1200px]:col-span-2 bg-card rounded-[2.5rem] border border-border shadow-sm p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                <BarChart3 className="text-primary" size={20} />
                {t('financial_pulse')}
              </h3>
              <p className="text-xs font-bold text-muted-foreground/60 mt-1 uppercase tracking-wider">{t('revenue_analysis')}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-black uppercase text-muted-foreground">{t('collected_label')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[10px] font-black uppercase text-muted-foreground">{t('pending')}</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Jan', collected: realStats.feeCollected * 0.7, pending: realStats.pendingFees * 0.3 },
                { name: 'Feb', collected: realStats.feeCollected * 0.75, pending: realStats.pendingFees * 0.25 },
                { name: 'Mar', collected: realStats.feeCollected * 0.82, pending: realStats.pendingFees * 0.18 },
                { name: 'Apr', collected: realStats.feeCollected * 0.88, pending: realStats.pendingFees * 0.12 },
                { name: 'May', collected: realStats.feeCollected * 0.92, pending: realStats.pendingFees * 0.08 },
                { name: 'Jun', collected: realStats.feeCollected, pending: realStats.pendingFees },
              ]}>
                <defs>
                  <linearGradient id="colorColl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#888' }} />
                <YAxis hide />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 900 }}
                  formatter={(val: any) => formatAmount(Number(val) || 0, settings?.currency)}
                />
                <Area type="monotone" dataKey="collected" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorColl)" />
                <Area type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={4} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Presence Circle */}
        <div className="bg-card rounded-[2.5rem] border border-border shadow-sm p-8 flex flex-col items-center">
          <h3 className="text-xl font-black text-foreground mb-1">{t('attendance_pulse')}</h3>
          <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-8">{t('daily_flow_stats')}</p>
          
          <div className="relative w-full aspect-square max-w-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={attData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={10} strokeWidth={0}>
                  {attData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <p className="text-4xl font-black text-foreground tracking-tighter">{attendanceRateVal}%</p>
               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('present')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 w-full mt-8">
            <div className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">{t('on_campus')}</p>
              <p className="text-xl font-black text-emerald-500">{realStats.presentCount || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">{t('absent')}</p>
              <p className="text-xl font-black text-rose-500">{realStats.absentCount || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Activity & Quick Command Hub */}
      <div className="grid grid-cols-1 @[1000px]:grid-cols-3 gap-6 pb-6">
        {/* Recent Operations Log */}
        <div className="bg-card rounded-[2.5rem] border border-border shadow-sm p-8 @[1000px]:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-foreground flex items-center gap-3">
              <Clock className="text-primary" size={20} />
              {t('operations_log')}
            </h3>
            <span className="px-3 py-1 bg-muted/50 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('live_feed')}</span>
          </div>
          
          <div className="space-y-4">
            {recentActivities.length > 0 ? recentActivities.map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-muted/20 border border-border/50 hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="font-black text-sm text-foreground">{formatActionType(activity.action_type || activity.action)}</p>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">System User • {activity.user_role || 'Admin'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase">{formatTimeAgo(activity.created_at)}</p>
                </div>
              </div>
            )) : (
              <div className="p-12 text-center rounded-[2rem] border border-dashed border-border">
                <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">No Recent Operations Detected</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Hub & Intelligence */}
        <div className="space-y-6">
          {/* Quick Command Card */}
          <div className="bg-primary p-8 rounded-[2.5rem] text-primary-foreground shadow-xl shadow-primary/20">
             <h3 className="text-xl font-black mb-6">{t('quick_hub')}</h3>
             <div className="grid grid-cols-2 gap-4">
                <Link href="/dashboard/students?add=true" className="flex flex-col items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95 text-center group">
                   <UserPlus size={24} className="mb-2" />
                   <span className="text-[10px] font-black uppercase tracking-widest">{t('students')}</span>
                </Link>
                <Link href="/dashboard/hr" className="flex flex-col items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95 text-center group">
                   <ShieldCheck size={24} className="mb-2" />
                   <span className="text-[10px] font-black uppercase tracking-widest">{t('hr')}</span>
                </Link>
                <Link href="/dashboard/fees" className="flex flex-col items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95 text-center group">
                   <CreditCard size={24} className="mb-2" />
                   <span className="text-[10px] font-black uppercase tracking-widest">{t('billing')}</span>
                </Link>
                <Link href="/dashboard/communication?new=notice" className="flex flex-col items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95 text-center group">
                   <Bell size={24} className="mb-2" />
                   <span className="text-[10px] font-black uppercase tracking-widest">{t('alert')}</span>
                </Link>
             </div>
          </div>

          {/* Urgent Priority Feed */}
          <div className="bg-card border border-border p-8 rounded-[2.5rem]">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">{t('high_priority')}</h3>
                <AlertCircle size={16} className="text-amber-500" />
             </div>
             <div className="space-y-6">
                {notices.filter(n => n.is_important).slice(0, 3).map((notice) => (
                  <div key={notice.id}>
                    <p className="text-xs font-black text-foreground hover:text-primary transition-colors cursor-pointer mb-1 leading-relaxed">
                      {notice.title}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                       {new Date(notice.created_at).toLocaleDateString()} • {notice.author_name}
                    </p>
                  </div>
                ))}
                {notices.filter(n => n.is_important).length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase opacity-40">{t('no_critical_alerts')}</p>
                  </div>
                )}
             </div>
             <button className="w-full mt-8 py-3 bg-muted/50 hover:bg-muted border border-border rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                {t('full_systems_audit')}
             </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TeacherDashboard({ notices, teacherStats }: { notices: any[], teacherStats: any }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const stats = [
    { label: t('active_students') || t('students'), value: teacherStats?.studentCount || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: t('attendance_rate') || t('engagement'), value: `${teacherStats?.attendanceRate || 0}%`, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t('pending_tasks') || t('tasks'), value: teacherStats?.upcomingTasksCount || 0, icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  ];

  const PERIOD_TIMES: Record<number, string> = {
    1: '08:00 AM', 2: '09:00 AM', 3: '10:00 AM', 4: '11:20 AM',
    5: '12:20 PM', 6: '01:20 PM', 7: '02:20 PM',
  };

  const realSchedules = teacherStats?.schedules || [];
  const scheduleList = realSchedules.length > 0 ? realSchedules.map((s: any, i: number) => ({
    class: s.class?.name || 'Class',
    subject: s.subject?.name || 'Subject',
    time: PERIOD_TIMES[s.period] || 'TBD',
    room: s.room || 'Room TBD',
    color: i % 2 === 0 ? 'text-primary bg-primary/10' : 'text-indigo-500 bg-indigo-500/10'
  })) : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2 pb-safe">
      <div className="bg-card/50 border border-border p-8 rounded-[2.5rem] backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 rounded-3xl bg-indigo-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              <Zap size={32} />
           </div>
           <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">{t('classroom_intelligence') || 'Classroom Intelligence'}</h1>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest mt-1 opacity-70">
                Lector Room • {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
           </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/attendance" className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-tighter hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center gap-2">
            <CalendarCheck size={20} />
            {t('take_attendance') || 'Attendance'}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card p-8 rounded-[2rem] border border-border shadow-sm flex flex-col items-center text-center group">
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform`}>
              <stat.icon size={28} />
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-foreground tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
        <div className="lg:col-span-2 bg-card rounded-[2.5rem] border border-border p-8 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-foreground">{t('todays_agenda')}</h3>
              <Link href="/dashboard/schedule" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">{t('full_schedule')}</Link>
           </div>
           
           <div className="space-y-4">
              {scheduleList.length > 0 ? scheduleList.map((cls: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-6 rounded-[2rem] bg-muted/20 border border-border/50 hover:border-primary/30 transition-all group">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl ${cls.color} flex items-center justify-center font-black text-lg shrink-0`}>
                      {cls.time.split(':')[0]}
                    </div>
                    <div>
                      <p className="font-extrabold text-foreground text-base tracking-tight mb-1">{cls.class} • {cls.subject}</p>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{cls.time} • {t('none')}</p>
                    </div>
                  </div>
                  <Link href={`/dashboard/schedule`} className="ml-6 shrink-0 p-3 bg-card border border-border rounded-xl text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm">
                    <ArrowUpRight size={20} />
                  </Link>
                </div>
              )) : (
                <div className="w-full p-16 text-center border-2 border-dashed border-border rounded-[2.5rem]">
                  <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">{t('no_classes_scheduled')}</p>
                  <p className="text-xs font-bold text-muted-foreground/50 mt-2">{t('enjoy_prep_time')}</p>
                </div>
              )}
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-card rounded-[2.5rem] border border-border p-8 shadow-sm">
              <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-8">{t('intelligence_feed')}</h3>
              <div className="space-y-6">
                {notices.slice(0, 3).map((notice) => (
                  <div key={notice.id} className="flex gap-4 group cursor-pointer">
                    <div className={`w-2.5 h-2.5 mt-1.5 rounded-full ${notice.is_important ? 'bg-rose-500 animate-pulse' : 'bg-primary/40'} shrink-0`} />
                    <div>
                      <p className="font-black text-sm text-foreground group-hover:text-primary transition-colors leading-tight">{notice.title}</p>
                      <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mt-1">{new Date(notice.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           <div className="bg-primary p-8 rounded-[2.5rem] text-primary-foreground shadow-xl shadow-primary/20 flex flex-col justify-center">
              <h3 className="text-lg font-black mb-6">{t('quick_actions')}</h3>
              <div className="grid grid-cols-2 gap-4">
                 <Link href="/dashboard/communication?new=notice" className="flex flex-col items-center justify-center p-6 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-center">
                    <Bell size={28} className="mb-3" />
                    <span className="text-xs font-black uppercase tracking-widest">{t('broadcast')}</span>
                 </Link>
                 <Link href="/dashboard/assessments?new=true" className="flex flex-col items-center justify-center p-6 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-center">
                    <BookOpen size={28} className="mb-3" />
                    <span className="text-xs font-black uppercase tracking-widest">{t('assign') || 'Assign'}</span>
                 </Link>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function AccountantDashboard({ stats: realStats, notices }: { stats: any, notices: any[] }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { settings } = useSettings();
  
  const financialStats = [
    { label: t('collected_today') || t('today'), value: formatAmount(realStats.feeCollectedToday || 0, settings?.currency), color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t('total_ytd'), value: formatAmount(realStats.feeCollected || 0, settings?.currency), color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: t('pending_fees') || t('outstanding'), value: formatAmount(realStats.pendingFees || 0, settings?.currency), color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2 pb-safe">
      <div className="bg-card/50 border border-border p-8 rounded-[2.5rem] backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{t('financial_command')}</h1>
          <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest mt-1 opacity-70">
            {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Link href="/dashboard/fees" className="flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-tighter hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95">
          <Plus size={20} />
          {t('record_payment') || 'Record Payment'}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {financialStats.map((stat, i) => (
          <div key={i} className="bg-card p-8 rounded-[2rem] border border-border shadow-sm flex flex-col items-center text-center group">
            <div className={`w-16 h-16 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <BarChart3 size={32} />
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <p className={`text-3xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 pb-6">
        <div className="bg-card rounded-[2.5rem] border border-border p-8 shadow-sm">
           <h3 className="text-xl font-black text-foreground mb-8 flex items-center gap-3">
              <Clock className="text-primary" size={20} />
              {t('recent_notices')}
           </h3>
           <div className="space-y-6">
            {notices.slice(0, 4).map((notice) => (
              <div key={notice.id} className="flex gap-5 pb-6 border-b border-border/50 last:border-0 last:pb-0 group">
                <div className={`w-3 h-3 mt-1.5 rounded-full ${notice.is_important ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'} shrink-0 shadow-sm`} />
                <div>
                  <p className="font-black text-foreground text-base group-hover:text-primary transition-colors leading-tight">{notice.title}</p>
                  <p className="text-xs font-bold text-muted-foreground/60 mt-1 line-clamp-2">{notice.content}</p>
                </div>
              </div>
            ))}
            {notices.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-[2rem]">
                <p className="text-sm font-black text-muted-foreground uppercase tracking-wider">{t('no_financial_directives')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-[2.5rem] border border-border p-8 shadow-sm flex flex-col">
           <h3 className="text-xl font-black text-foreground mb-8 flex items-center gap-3">
              <Zap className="text-primary" size={20} />
              {t('quick_actions')}
           </h3>
           <div className="grid grid-cols-1 gap-4 flex-1">
              <Link href="/dashboard/fees?tab=invoices" className="flex items-center justify-between p-6 rounded-2xl bg-muted/30 border border-border hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-card rounded-xl text-primary border border-border group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <FileText size={20} />
                   </div>
                   <span className="font-black text-sm uppercase tracking-tight">{t('run_invoice_audit')}</span>
                </div>
                <ArrowUpRight size={16} className="text-muted-foreground" />
              </Link>
              <Link href="/dashboard/fees?tab=structure" className="flex items-center justify-between p-6 rounded-2xl bg-muted/30 border border-border hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-card rounded-xl text-primary border border-border group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <Settings size={20} />
                   </div>
                   <span className="font-black text-sm uppercase tracking-tight">{t('configure_fee_tiers')}</span>
                </div>
                <ArrowUpRight size={16} className="text-muted-foreground" />
              </Link>
              <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/10 mt-auto">
                 <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">{t('security_note')}</p>
                 <p className="text-xs font-bold text-muted-foreground leading-relaxed">{t('payment_integrity_msg')}</p>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function ParentDashboard({ notices }: { notices: any[] }) {
  const { user, switchStudent } = useAuth();
  const { t } = useLanguage();
  const { settings } = useSettings();
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States for child-specific data
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [totalClasses, setTotalClasses] = useState<number>(0);
  const [nextFee, setNextFee] = useState<{ amount: number; description: string; relativeDue: string } | null>(null);
  const [pendingAssignments, setPendingAssignments] = useState<any[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [isChildDataLoading, setIsChildDataLoading] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      let queryIds: string[] = [];
      if (user?.role === 'student' && user.studentId) {
        queryIds = [user.studentId];
      } else if (user?.studentIds && user.studentIds.length > 0) {
        queryIds = user.studentIds;
      }
      
      if (queryIds.length > 0) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .in('id', queryIds);
        
        if (!error && data) {
          setStudents(data);
          if (user && !user.studentId && data.length > 0) {
            switchStudent(data[0].id);
          }
        }
      }
      setIsLoading(false);
    };
    fetchStudents();
  }, [user, switchStudent]);

  const activeStudent = students.find(s => s.id === user?.studentId) || students[0];

  useEffect(() => {
    if (!activeStudent) return;

    const fetchChildData = async () => {
      setIsChildDataLoading(true);
      try {
        // 1. Fetch Attendance Rate
        const { data: attData } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', activeStudent.id);

        if (attData && attData.length > 0) {
          const presentCount = attData.filter((r: any) => r.status === 'present' || r.status === 'late').length;
          setAttendanceRate(Math.round((presentCount / attData.length) * 100));
          setTotalClasses(attData.length);
        } else {
          setAttendanceRate(null);
          setTotalClasses(0);
        }

        // 2. Fetch Next Unpaid Fee Invoice
        const { data: feeInvoices } = await supabase
          .from('fee_invoices')
          .select('*')
          .eq('student_id', activeStudent.id)
          .neq('status', 'paid')
          .neq('status', 'void')
          .order('due_date', { ascending: true })
          .limit(1);

        if (feeInvoices && feeInvoices.length > 0) {
          const inv = feeInvoices[0];
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const due = new Date(inv.due_date);
          due.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          let relative = `Due in ${diffDays} days`;
          if (diffDays === 0) relative = 'Due today!';
          else if (diffDays === 1) relative = 'Due tomorrow';
          else if (diffDays < 0) relative = `${Math.abs(diffDays)} days overdue!`;

          setNextFee({
            amount: Number(inv.amount),
            description: inv.title || inv.description || 'School Fee',
            relativeDue: relative,
          });
        } else {
          setNextFee(null);
        }

        // 3. Fetch Assignments for Active Class
        const { data: classData } = await supabase
          .from('classes')
          .select('id')
          .ilike('name', activeStudent.grade)
          .maybeSingle();

        if (classData) {
          const { data: assessments } = await supabase
            .from('assessments')
            .select('*, subject:subjects(name)')
            .eq('class_id', classData.id)
            .eq('status', 'active');

          const { data: submissions } = await supabase
            .from('submissions')
            .select('assessment_id')
            .eq('student_id', activeStudent.id);

          const submittedIds = submissions?.map((s: any) => s.assessment_id) || [];
          const pending = (assessments || []).filter((a: any) => !submittedIds.includes(a.id));
          
          setPendingAssignments(pending.map((a: any) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(a.date);
            due.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            let relative = `${diffDays} days left`;
            if (diffDays === 0) relative = 'Due today';
            else if (diffDays === 1) relative = 'Tomorrow';
            else if (diffDays < 0) relative = `${Math.abs(diffDays)} days overdue`;

            return {
              title: a.title,
              due: relative,
              type: a.type || 'Assessment',
              subject: a.subject?.name || 'Class',
            };
          }));

          // 4. Fetch Today's Schedule
          const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const todayName = daysOfWeek[new Date().getDay()];
          const { data: scheduleData } = await supabase
            .from('schedules')
            .select('*, subject:subjects(name), teacher:users(name)')
            .eq('class_id', classData.id)
            .eq('day_of_week', todayName)
            .order('start_time', { ascending: true });
          
          if (scheduleData) {
            setTodaySchedule(scheduleData);
          } else {
            setTodaySchedule([]);
          }
        } else {
          setPendingAssignments([]);
          setTodaySchedule([]);
        }
      } catch (err) {
        console.error('Error fetching child dashboard metrics:', err);
      } finally {
        setIsChildDataLoading(false);
      }
    };

    fetchChildData();
  }, [activeStudent]);

  if (isLoading) {
    return (
      <div className="space-y-8 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-80" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-[2rem]" />
          <Skeleton className="h-64 w-full rounded-[2rem]" />
        </div>
      </div>
    );
  }
  if (!activeStudent) return <div className="p-16 text-center font-black uppercase text-muted-foreground opacity-40">{t('no_data')}</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2 pb-safe">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{t('welcome')}, {user?.name}</h1>
          <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest mt-1 opacity-70">
            {user?.role === 'student' ? "Personal Success Hub" : "Family Engagement Portal"}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-3 bg-gradient-to-br from-indigo-600 via-primary to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-primary/30 relative overflow-hidden group">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <p className="text-white/60 text-[10px] font-black tracking-[0.2em] uppercase mb-3">Academic Identity</p>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tighter mb-4">{activeStudent.name}</h2>
              <div className="flex items-center gap-4">
                <span className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-sm border border-white/10">{activeStudent.grade}</span>
                <span className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-sm border border-white/10">#{activeStudent.roll_number || activeStudent.id.substring(0, 8)}</span>
              </div>
            </div>
            <div className="flex items-center gap-8">
               <div className="text-center">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1 text-center">Engagement</p>
                  <p className="text-3xl font-black">{attendanceRate !== null ? `${attendanceRate}%` : '-'}</p>
               </div>
               <div className="w-[2px] h-12 bg-white/10" />
               <div className="text-center">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1 text-center">{t('assignments')}</p>
                  <p className="text-3xl font-black">{pendingAssignments.length}</p>
               </div>
            </div>
          </div>
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:bg-white/20 transition-all duration-1000" />
          <Users className="absolute -right-12 -bottom-12 opacity-5 text-white" size={320} />
        </div>
        
        {/* Schedule Strip */}
        <div className="md:col-span-3 lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-[2.5rem] border border-border p-8 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-foreground tracking-tight">{t('todays_schedule')}</h3>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
             </div>
             <div className="space-y-4 pb-4">
              {todaySchedule.length > 0 ? todaySchedule.map((period, idx) => {
                  const isCurrent = (() => {
                    const now = new Date();
                    const currentTime = now.getHours() * 60 + now.getMinutes();
                    const formatTime = (t: string) => {
                      if (!t) return 0;
                      const parts = t.split(':');
                      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                    };
                    return formatTime(period.start_time) <= currentTime && currentTime <= formatTime(period.end_time);
                  })();
  
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all group ${isCurrent ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted/20 border-border/50 hover:border-primary/30'}`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${isCurrent ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                          {period.start_time?.substring(0,2) || '08'}
                        </div>
                        <div>
                          <p className={`font-extrabold text-base tracking-tight mb-1 ${isCurrent ? 'text-white' : 'text-foreground'}`}>
                            {period.subject?.name || period.subject}
                          </p>
                          <p className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isCurrent ? 'text-white/80' : 'text-muted-foreground'}`}>
                            <span>{period.start_time?.substring(0,5)} - {period.end_time?.substring(0,5)}</span>
                            <span>•</span>
                            <span>{period.teacher?.name ? `${t('by')} ${period.teacher.name}` : t('none')}</span>
                            {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-2"></span>}
                          </p>
                        </div>
                      </div>
                      <Link href={`/dashboard/schedule`} className={`ml-6 shrink-0 p-3 rounded-xl transition-all shadow-sm ${isCurrent ? 'bg-white/20 text-white hover:bg-white hover:text-primary' : 'bg-card border border-border text-primary hover:bg-primary hover:text-primary-foreground'}`}>
                        <ArrowUpRight size={20} />
                      </Link>
                    </div>
                  );
                }) : (
                 <div className="w-full p-16 text-center border-2 border-dashed border-border rounded-[2.5rem]">
                    <CalendarCheck className="w-10 h-10 mx-auto opacity-20 mb-3 text-muted-foreground" />
                    <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">{t('free_day')}</p>
                    <p className="text-xs font-bold text-muted-foreground/50 mt-2">{t('no_scheduled_classes')}</p>
                 </div>
              )}
             </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-all group h-[calc(50%-12px)]">
               <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <CalendarCheck size={32} />
               </div>
               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t('live_presence')}</p>
               <h4 className="text-xl font-black text-foreground mb-4">{t('status_active')}</h4>
               <Link href="/dashboard/attendance" className="w-full max-w-[200px] py-2.5 bg-muted/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-emerald-500 hover:text-white transition-all">{t('view')}</Link>
            </div>
            <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-all group h-[calc(50%-12px)]">
               <div className="w-16 h-16 rounded-[1.5rem] bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen size={32} />
               </div>
               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t('next_milestone')}</p>
               <h4 className="text-xl font-black text-foreground mb-4">{pendingAssignments.length} {t('pending')}</h4>
               <Link href="/dashboard/assessments" className="w-full max-w-[200px] py-2.5 bg-muted/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-blue-500 hover:text-white transition-all">{t('take_task')}</Link>
            </div>
          </div>
        </div>

        {/* Detailed Logs */}
        <div className="md:col-span-3 bg-card rounded-[2.5rem] border border-border p-8 shadow-sm">
           <h3 className="text-xl font-black text-foreground mb-8">{t('academic_trajectory')}</h3>
           <div className="space-y-4">
              {pendingAssignments.length > 0 ? pendingAssignments.slice(0, 4).map((a, i) => (
                <div key={i} className="flex items-center justify-between p-6 rounded-2xl bg-muted/20 border border-border/50 hover:border-primary/50 transition-all group">
                  <div>
                    <p className="font-black text-foreground tracking-tight">{a.subject}: {a.title}</p>
                    <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mt-1">{a.type}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded-full uppercase tracking-tighter group-hover:bg-rose-500 group-hover:text-white transition-all">{a.due}</span>
                  </div>
                </div>
              )) : (
                <div className="p-16 text-center border-2 border-dashed border-border rounded-[2.5rem]">
                  <Zap className="mx-auto text-primary mb-4" size={32} />
                  <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">{t('growth_in_progress')}</p>
                  <p className="text-xs font-bold text-muted-foreground/40 mt-2">{t('milestones_achieved')}</p>
                </div>
              )}
           </div>
        </div>

        <div className="bg-card rounded-[2.5rem] border border-border p-8 shadow-sm">
           <h3 className="text-xl font-black text-foreground mb-8">{t('directives')}</h3>
           <div className="space-y-6">
              {notices.slice(0, 3).map((notice) => (
                <div key={notice.id} className="pb-6 border-b border-border/50 last:border-0 last:pb-0 group">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`w-2 h-2 rounded-full ${notice.is_important ? 'bg-rose-500 animate-pulse' : 'bg-primary'}`} />
                    <p className="font-black text-sm text-foreground group-hover:text-primary transition-colors leading-tight">{notice.title}</p>
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest pl-5">{new Date(notice.created_at).toLocaleDateString()}</p>
                </div>
              ))}
              {notices.length === 0 && (
                <p className="text-[10px] font-black text-muted-foreground uppercase text-center opacity-40 py-12 tracking-widest">{t('no_active_directives')}</p>
              )}
           </div>
        </div>
       </div>
    </motion.div>
  );
}
