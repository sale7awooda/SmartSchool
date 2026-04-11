'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { supabase } from '@/lib/supabase/client';
import { getActiveAcademicYear } from '@/lib/supabase-db';
import { Users, CalendarCheck, CreditCard, TrendingUp, ArrowRight, AlertCircle, BookOpen, CheckCircle2, Bell } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardHome() {
  const { user } = useAuth();
  const { isRole } = usePermissions();

  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);

  const fetchDashboardData = async () => {
    if (!user) return null;
    let stats = { totalStudents: 0, attendanceToday: 0, feeCollected: 0, pendingFees: 0 };
    let notices = [];

    try {
      if (isRole(['admin', 'accountant'])) {
        // Filter students by academic year
        let studentQuery = supabase
          .from('students')
          .select('*', { count: 'exact', head: true });
        
        if (activeAcademicYear) {
          studentQuery = studentQuery.eq('academic_year', activeAcademicYear.name);
        }

        const { count: studentCount } = await studentQuery;
        
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('status')
          .eq('date', new Date().toISOString().split('T')[0]);
        
        const presentCount = attendanceData?.filter((a: any) => a.status === 'present').length || 0;
        const attendanceRate = studentCount ? Math.round((presentCount / studentCount) * 100) : 0;

        // Filter fee invoices by academic year via student relation
        let feeQuery = supabase
          .from('fee_invoices')
          .select(`
            amount, 
            status,
            student:students!inner(academic_year)
          `);
        
        if (activeAcademicYear) {
          feeQuery = feeQuery.eq('student.academic_year', activeAcademicYear.name);
        }

        const { data: feeData } = await feeQuery;
        
        const collected = feeData?.filter((f: any) => f.status === 'paid').reduce((acc: number, f: any) => acc + Number(f.amount), 0) || 0;
        const pending = feeData?.filter((f: any) => f.status === 'pending').reduce((acc: number, f: any) => acc + Number(f.amount), 0) || 0;

        stats = {
          totalStudents: studentCount || 0,
          attendanceToday: attendanceRate,
          feeCollected: collected,
          pendingFees: pending
        };
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

    return { stats, notices };
  };

  const { data, isLoading } = useSWR(
    user ? `dashboard-${user.id}-${user.role}-${activeAcademicYear?.name}` : null, 
    fetchDashboardData
  );

  const { data: teacherStats } = useSWR(
    user && isRole('teacher') ? `teacher-stats-${user.id}` : null,
    async () => {
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('date', new Date().toISOString().split('T')[0]);
      
      const presentCount = attendanceData?.filter((a: any) => a.status === 'present').length || 0;
      const attendanceRate = studentCount ? Math.round((presentCount / studentCount) * 100) : 0;

      return { studentCount: studentCount || 0, attendanceRate };
    }
  );

  if (!user) return null;

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
            <div key={i} className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm">
              <Skeleton className="w-12 h-12 rounded-2xl mb-5" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
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

  const stats = data?.stats || { totalStudents: 0, attendanceToday: 0, feeCollected: 0, pendingFees: 0 };
  const notices = data?.notices || [];

  if (isRole('parent')) return <ParentDashboard notices={notices} />;
  if (isRole('teacher')) return <TeacherDashboard notices={notices} />;
  if (isRole('accountant')) return <AccountantDashboard stats={stats} notices={notices} />;
  return <AdminDashboard stats={stats} notices={notices} />;
}

function AdminDashboard({ stats: realStats, notices }: { stats: any, notices: any[] }) {
  const { user } = useAuth();
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  
  const stats = [
    { label: 'Total Students', value: realStats.totalStudents.toLocaleString(), icon: Users, color: 'bg-blue-500', shadow: 'shadow-blue-500/20' },
    { label: 'Attendance Today', value: `${realStats.attendanceToday}%`, icon: CalendarCheck, color: 'bg-emerald-500', shadow: 'shadow-emerald-500/20' },
    { label: 'Fees Collected', value: `$${realStats.feeCollected.toLocaleString()}`, icon: CreditCard, color: 'bg-indigo-500', shadow: 'shadow-indigo-500/20' },
    { label: 'Pending Dues', value: `$${realStats.pendingFees.toLocaleString()}`, icon: TrendingUp, color: 'bg-amber-500', shadow: 'shadow-amber-500/20' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Welcome back, {user?.name}</h1>
          <p className="text-muted-foreground mt-2 font-medium">Here is what&apos;s happening with your school today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-card border border-border rounded-xl shadow-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Academic Year</p>
            <p className="text-sm font-bold text-foreground">{activeAcademicYear?.name || 'Loading...'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            key={i} 
            className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all"
          >
            <div className={`w-12 h-12 rounded-2xl ${stat.color} text-white flex items-center justify-center mb-5 shadow-lg ${stat.shadow}`}>
              <stat.icon size={32} />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">{stat.label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-bold text-foreground mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: 'New student enrolled', time: '10 mins ago' },
              { action: 'Fee payment received', time: '1 hour ago' },
              { action: 'Attendance report generated', time: '3 hours ago' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/30">
                <span className="font-semibold text-foreground">{activity.action}</span>
                <span className="text-xs font-medium text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-bold text-foreground mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link 
              href="/dashboard/students?add=true" 
              className="flex items-center justify-center gap-2 p-4 bg-primary/10 text-primary hover:bg-primary/20 rounded-2xl font-bold transition-all active:scale-[0.98]"
            >
              <Users size={20} />
              Register Student
            </Link>
            <Link 
              href="/dashboard/fees" 
              className="flex items-center justify-center gap-2 p-4 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 rounded-2xl font-bold transition-all active:scale-[0.98]"
            >
              <CreditCard size={20} />
              Manage Fees
            </Link>
          </div>
        </div>

        <div className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-bold text-foreground mb-6">Urgent Alerts</h3>
          <div className="space-y-5">
            {notices.filter(n => n.is_important).slice(0, 3).map((notice) => (
              <div key={notice.id} className="flex gap-4 pb-5 border-b border-border/80 last:border-0 last:pb-0">
                <div className="w-2.5 h-2.5 mt-2 rounded-full bg-amber-500 shrink-0 shadow-sm shadow-amber-500/50" />
                <div>
                  <p className="font-bold text-foreground text-sm sm:text-base">{notice.title}</p>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">Posted {new Date(notice.created_at).toLocaleDateString()} by {notice.author_name}</p>
                </div>
              </div>
            ))}
            {notices.filter(n => n.is_important).length === 0 && (
              <p className="text-sm text-muted-foreground">No urgent alerts.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TeacherDashboard({ notices }: { notices: any[] }) {
  const { user } = useAuth();
  const { data: teacherStats } = useSWR(`teacher-stats-${user?.id}`, null); // Using cached data from above
  
  const stats = [
    { label: 'Total Students', value: teacherStats?.studentCount || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Attendance Rate', value: `${teacherStats?.attendanceRate || 0}%`, icon: CalendarCheck, color: 'bg-emerald-500' },
    { label: 'Upcoming Tasks', value: '4', icon: BookOpen, color: 'bg-indigo-500' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Hello, {user?.name}</h1>
          <p className="text-muted-foreground mt-2 font-medium">You have 3 classes today.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/attendance" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2">
            <CalendarCheck size={18} />
            Take Attendance
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${stat.color} text-white flex items-center justify-center mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">Today&apos;s Schedule</h3>
            <Link href="/dashboard/schedule" className="text-sm font-bold text-primary hover:underline">View Full Schedule</Link>
          </div>
          
          <div className="space-y-4">
            {[
              { class: 'Grade 10 - Mathematics', time: '09:00 AM', room: 'Room 302', color: 'bg-blue-500/10 text-blue-500' },
              { class: 'Grade 11 - Physics', time: '11:00 AM', room: 'Room 405', color: 'bg-emerald-500/10 text-emerald-500' },
              { class: 'Grade 9 - Science', time: '01:30 PM', room: 'Lab 1', color: 'bg-amber-500/10 text-amber-500' }
            ].map((cls, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-border bg-muted/30 hover:bg-muted transition-all gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${cls.color} flex items-center justify-center font-bold text-sm`}>
                    {cls.time.split(':')[0]}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{cls.class}</p>
                    <p className="text-xs font-medium text-muted-foreground">{cls.time} • {cls.room}</p>
                  </div>
                </div>
                <Link 
                  href={`/dashboard/attendance?class=${cls.class}`}
                  className="px-5 py-2.5 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted hover:border-primary/50 transition-all text-center"
                >
                  Mark Attendance
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8">
            <h3 className="text-xl font-bold text-foreground mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              <Link href="/dashboard/communication?new=notice" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted transition-all group">
                <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Bell size={18} />
                </div>
                <span className="font-bold text-sm">Post Notice</span>
              </Link>
              <Link href="/dashboard/assessments?new=true" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted transition-all group">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg group-hover:bg-indigo group-hover:text-indigo-foreground transition-colors">
                  <BookOpen size={18} />
                </div>
                <span className="font-bold text-sm">Add Assessment</span>
              </Link>
            </div>
          </div>

          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8">
            <h3 className="text-xl font-bold text-foreground mb-6">Recent Notices</h3>
            <div className="space-y-5">
              {notices.slice(0, 3).map((notice) => (
                <div key={notice.id} className="flex gap-4 pb-5 border-b border-border/80 last:border-0 last:pb-0">
                  <div className={`w-2 h-2 mt-2 rounded-full ${notice.is_important ? 'bg-red-500' : 'bg-blue-500'} shrink-0`} />
                  <div>
                    <p className="font-bold text-foreground text-sm leading-tight">{notice.title}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{new Date(notice.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {notices.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent notices.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AccountantDashboard({ stats: realStats, notices }: { stats: any, notices: any[] }) {
  const { user } = useAuth();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Hello, {user?.name}</h1>
        <p className="text-muted-foreground mt-2 font-medium">Financial overview for today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-card p-6 sm:p-8 rounded-[1.5rem] border border-border shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Collected Today</p>
          <p className="text-4xl font-bold text-emerald-500 mt-2">${realStats.feeCollected.toLocaleString()}</p>
        </div>
        <div className="bg-card p-6 sm:p-8 rounded-[1.5rem] border border-border shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Fees</p>
          <p className="text-4xl font-bold text-amber-500 mt-2">${realStats.pendingFees.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-bold text-foreground mb-6">Quick Actions</h3>
          <Link href="/dashboard/fees" className="flex items-center justify-center gap-2 w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all active:scale-[0.98] shadow-md shadow-primary/20">
            <CreditCard size={24} />
            Record New Payment
          </Link>
        </div>

        <div className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-bold text-foreground mb-6">Recent Notices</h3>
          <div className="space-y-5">
            {notices.slice(0, 3).map((notice) => (
              <div key={notice.id} className="flex gap-4 pb-5 border-b border-border/80 last:border-0 last:pb-0">
                <div className={`w-2.5 h-2.5 mt-2 rounded-full ${notice.is_important ? 'bg-red-500' : 'bg-blue-500'} shrink-0 shadow-sm`} />
                <div>
                  <p className="font-bold text-foreground text-sm sm:text-base">{notice.title}</p>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">{notice.content.substring(0, 60)}...</p>
                </div>
              </div>
            ))}
            {notices.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent notices.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ParentDashboard({ notices }: { notices: any[] }) {
  const { user, switchStudent } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      if (user?.studentIds && user.studentIds.length > 0) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .in('id', user.studentIds);
        
        if (!error && data) {
          setStudents(data);
          if (!user.studentId && data.length > 0) {
            switchStudent(data[0].id);
          }
        }
      }
      setIsLoading(false);
    };
    fetchStudents();
  }, [user?.studentIds, user?.studentId, switchStudent]);

  const activeStudent = students.find(s => s.id === user?.studentId) || students[0];

  if (isLoading) {
    return (
      <div className="space-y-8 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8">
            <Skeleton className="h-6 w-40 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8">
            <Skeleton className="h-6 w-40 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!activeStudent) return <div className="p-8 text-center">No student data found. Please link a student to your account.</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Hello, {user?.name}</h1>
        <p className="text-muted-foreground mt-2 font-medium">Here is the latest update for your child.</p>
      </div>

      {students.length > 1 && (
        <div className="flex gap-2 p-1 bg-muted rounded-2xl">
          {students.map(student => (
            <button
              key={student.id}
              onClick={() => switchStudent(student.id)}
              className={`flex-1 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeStudent.id === student.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {student.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Student Card */}
        <div className="md:col-span-3 bg-gradient-to-br from-primary to-primary/80 rounded-[2rem] p-8 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-primary-foreground/80 text-sm font-semibold tracking-wider uppercase mb-2">Student Profile</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{activeStudent.name}</h2>
            <p className="text-primary-foreground/90 mt-2 font-medium text-lg">{activeStudent.grade} • ID: {activeStudent.roll_number || activeStudent.id.substring(0, 8)}</p>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10">
            <Users size={160} />
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Stats */}
        <div className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 shadow-inner">
            <CalendarCheck size={32} />
          </div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Attendance</p>
          <p className="text-2xl font-bold text-foreground mt-1">Present</p>
          <p className="text-sm font-medium text-emerald-500 mt-1 bg-emerald-500/10 px-3 py-1 rounded-full">98% this month</p>
        </div>
        
        <div className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 shadow-inner">
            <CreditCard size={32} />
          </div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Next Fee Due</p>
          <p className="text-2xl font-bold text-foreground mt-1">$450</p>
          <p className="text-sm font-medium text-muted-foreground mt-1 bg-muted px-3 py-1 rounded-full">Due in 5 days</p>
        </div>

        <div className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 shadow-inner">
            <BookOpen size={32} />
          </div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
          <p className="text-2xl font-bold text-foreground mt-1">3</p>
          <p className="text-sm font-medium text-blue-500 mt-1 bg-blue-500/10 px-3 py-1 rounded-full">Assignments due</p>
        </div>

        {/* Assignments & Grades */}
        <div className="md:col-span-2 bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-bold text-foreground mb-6">Upcoming Assignments</h3>
          <div className="space-y-4">
            {[
              { title: 'Math: Fractions Worksheet', due: 'Tomorrow', type: 'Worksheet' },
              { title: 'Science: Solar System Model', due: '3 days', type: 'Project' },
              { title: 'English: Book Report', due: '1 week', type: 'Essay' },
            ].map((a, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/30">
                <div>
                  <p className="font-bold text-foreground">{a.title}</p>
                  <p className="text-xs font-medium text-muted-foreground">{a.type}</p>
                </div>
                <span className="text-sm font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full">Due: {a.due}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-bold text-foreground mb-6">Recent Notices</h3>
          <div className="space-y-5">
            {notices.slice(0, 3).map((notice) => (
              <div key={notice.id} className="flex gap-4 pb-5 border-b border-border/80 last:border-0 last:pb-0">
                <div className={`w-2.5 h-2.5 mt-2 rounded-full ${notice.is_important ? 'bg-red-500' : 'bg-blue-500'} shrink-0 shadow-sm`} />
                <div>
                  <p className="font-bold text-foreground text-sm sm:text-base">{notice.title}</p>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">{notice.content.substring(0, 40)}...</p>
                </div>
              </div>
            ))}
            {notices.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent notices.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
