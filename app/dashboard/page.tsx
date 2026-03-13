'use client';

import { useAuth } from '@/lib/auth-context';
import { MOCK_STATS, MOCK_NOTICES } from '@/lib/mock-db';
import { Users, CalendarCheck, CreditCard, TrendingUp, ArrowRight, AlertCircle, BookOpen, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';

export default function DashboardHome() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === 'parent') return <ParentDashboard />;
  if (user.role === 'teacher') return <TeacherDashboard />;
  if (user.role === 'accountant') return <AccountantDashboard />;
  return <AdminDashboard />;
}

function AdminDashboard() {
  const { user } = useAuth();
  
  const stats = [
    { label: 'Total Students', value: MOCK_STATS.totalStudents.toLocaleString(), icon: Users, color: 'bg-blue-500', shadow: 'shadow-blue-500/20' },
    { label: 'Attendance Today', value: `${MOCK_STATS.attendanceToday}%`, icon: CalendarCheck, color: 'bg-emerald-500', shadow: 'shadow-emerald-500/20' },
    { label: 'Fees Collected', value: `$${MOCK_STATS.feeCollected.toLocaleString()}`, icon: CreditCard, color: 'bg-indigo-500', shadow: 'shadow-indigo-500/20' },
    { label: 'Pending Dues', value: `$${MOCK_STATS.pendingFees.toLocaleString()}`, icon: TrendingUp, color: 'bg-amber-500', shadow: 'shadow-amber-500/20' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Welcome back, {user?.name.split(' ')[0]}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Here&apos;s what&apos;s happening at your school today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            key={i} 
            className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all"
          >
            <div className={`w-12 h-12 rounded-2xl ${stat.color} text-white flex items-center justify-center mb-5 shadow-lg ${stat.shadow}`}>
              <stat.icon size={32} />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: 'New student enrolled', time: '10 mins ago' },
              { action: 'Fee payment received', time: '1 hour ago' },
              { action: 'Attendance report generated', time: '3 hours ago' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{activity.action}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Urgent Alerts</h3>
          <div className="space-y-5">
            {MOCK_NOTICES.filter(n => n.isImportant).slice(0, 3).map((notice) => (
              <div key={notice.id} className="flex gap-4 pb-5 border-b border-slate-100/80 dark:border-slate-800 last:border-0 last:pb-0">
                <div className="w-2.5 h-2.5 mt-2 rounded-full bg-amber-500 shrink-0 shadow-sm shadow-amber-500/50" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{notice.title}</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Posted {new Date(notice.date).toLocaleDateString()} by {notice.author}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TeacherDashboard() {
  const { user } = useAuth();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Hello, {user?.name}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">You have 3 classes today.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Today&apos;s Schedule</h3>
            <Link href="/dashboard/attendance" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 rounded-xl transition-colors">Take Attendance</Link>
          </div>
          
          <div className="space-y-4">
            {['Grade 10 - Mathematics (09:00 AM, Room 302)', 'Grade 11 - Physics (11:00 AM, Room 405)', 'Grade 9 - Science (01:30 PM, Lab 1)'].map((cls, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shadow-inner">
                    G{10 + i}
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{cls}</span>
                </div>
                <button className="w-full sm:w-auto px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm">
                  Mark Attendance
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Pending Grading</h3>
          <div className="space-y-4">
            {[
              { title: 'Grade 10 Math Quiz', count: 12, due: 'Due: Mar 10' },
              { title: 'Grade 11 Physics Lab', count: 8, due: 'Due: Mar 12' },
              { title: 'Grade 9 Science Essay', count: 15, due: 'Due: Mar 15' },
            ].map((task, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{task.title}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{task.count} submissions pending • {task.due}</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">Grade</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AccountantDashboard() {
  const { user } = useAuth();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Hello, {user?.name}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Financial overview for today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Collected Today</p>
          <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">$1,250</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Invoices</p>
          <p className="text-4xl font-bold text-amber-600 dark:text-amber-400 mt-2">42</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h3>
        <Link href="/dashboard/fees" className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all active:scale-[0.98] shadow-md shadow-indigo-600/20">
          <CreditCard size={24} />
          Record New Payment
        </Link>
      </div>
    </motion.div>
  );
}

function ParentDashboard() {
  const { user } = useAuth();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Hello, {user?.name}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Here is the latest update for your child.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Student Card */}
        <div className="md:col-span-3 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-indigo-200 text-sm font-semibold tracking-wider uppercase mb-2">Student Profile</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Bart Simpson</h2>
            <p className="text-indigo-100 mt-2 font-medium text-lg">Grade 4 • ID: {user?.studentId}</p>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10">
            <Users size={160} />
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Stats */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-inner">
            <CalendarCheck size={32} />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attendance</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Present</p>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">98% this month</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 shadow-inner">
            <CreditCard size={32} />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Next Fee Due</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">$450</p>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">Due in 5 days</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-inner">
            <BookOpen size={32} />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Upcoming</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">3</p>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full">Assignments due</p>
        </div>

        {/* Assignments & Grades */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Upcoming Assignments</h3>
          <div className="space-y-4">
            {[
              { title: 'Math: Fractions Worksheet', due: 'Tomorrow', type: 'Worksheet' },
              { title: 'Science: Solar System Model', due: '3 days', type: 'Project' },
              { title: 'English: Book Report', due: '1 week', type: 'Essay' },
            ].map((a, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{a.title}</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{a.type}</p>
                </div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1 rounded-full">Due: {a.due}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Recent Grades</h3>
          <div className="space-y-4">
            {[
              { subject: 'Math', grade: 'A', score: '95%' },
              { subject: 'Science', grade: 'B+', score: '88%' },
              { subject: 'English', grade: 'A-', score: '91%' },
            ].map((g, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <span className="font-bold text-slate-700 dark:text-slate-200">{g.subject}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{g.score}</span>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{g.grade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
