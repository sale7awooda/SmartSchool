'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { useLanguage } from '@/lib/language-context';
import { getPaginatedAssessments, getActiveAcademicYear } from '@/lib/supabase-db';
import { motion } from 'motion/react';
import { 
  FileText, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  Search,
  Filter,
  PlayCircle,
  BarChart
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

// Mock Data
const EXAMS = [
  {
    id: 'e1',
    title: 'Mid-Term Mathematics',
    subject: 'Mathematics',
    grade: 'Grade 4',
    date: '2026-03-10',
    duration: 60, // minutes
    status: 'upcoming', // upcoming, active, completed
    totalMarks: 100,
    questionsCount: 20,
  },
  {
    id: 'e2',
    title: 'Science Quiz: Ecosystems',
    subject: 'Science',
    grade: 'Grade 4',
    date: '2026-03-07',
    duration: 30,
    status: 'active',
    totalMarks: 50,
    questionsCount: 10,
  },
  {
    id: 'e3',
    title: 'English Literature Test',
    subject: 'English',
    grade: 'Grade 4',
    date: '2026-02-28',
    duration: 45,
    status: 'completed',
    totalMarks: 50,
    questionsCount: 15,
    score: 42, // For student view
  }
];

export default function ExamsPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const { can, isRole } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 9; // 3 columns, so 9 is a good number

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: examsResponse, isLoading } = useSWR(
    ['exams', page, debouncedSearch, statusFilter, activeAcademicYear?.name],
    ([_, p, s, status, a]) => getPaginatedAssessments(p, limit, s, status)
  );

  const exams = examsResponse?.data || [];
  const totalPages = examsResponse?.totalPages || 1;
  const totalCount = examsResponse?.count || 0;

  if (!user) return null;

  if (!can('view', 'assessments')) {
    return <div className="p-4">{t('no_permission')}</div>;
  }

  const isStudent = isRole('student');
  const isTeacherOrAdmin = can('manage', 'assessments') || can('create', 'assessments');

  const filteredExams = exams.map((exam: any) => ({
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    grade: exam.grade || 'All Grades',
    date: exam.due_date || 'TBD',
    duration: exam.duration || 60,
    status: exam.status || 'upcoming',
    totalMarks: exam.total_marks || 100,
    questionsCount: exam.questions_count || 0,
    type: exam.type || 'exam',
    score: exam.score,
  }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-500 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {t('live_now')}</span>;
      case 'upcoming':
        return <span className="px-2.5 py-1 bg-amber-500/20 text-amber-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">{t('upcoming')}</span>;
      case 'completed':
        return <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-lg text-[10px] font-bold uppercase tracking-wider">{t('completed')}</span>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      exam: 'bg-red-500/10 text-red-500 border-red-500/20',
      quiz: 'bg-primary/10 text-primary border-primary/20',
      homework: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      project: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      essay: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    };
    return (
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${colors[type] || 'bg-muted text-muted-foreground'}`}>
        {type}
      </span>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('online_exams')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {isStudent ? t('exams_student_desc') : t('exams_admin_desc')}
          </p>
        </div>
        
        {can('create', 'assessments') && (
          <Link 
            href="/dashboard/exams/create"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus size={18} />
            {t('create_exam')}
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 rtl:left-auto rtl:right-3" size={20} />
          <input 
            type="text" 
            placeholder={t('search_exams_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rtl:pl-4 rtl:pr-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 rtl:left-auto rtl:right-3" size={16} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm appearance-none font-medium text-foreground rtl:pl-8 rtl:pr-9"
            >
              <option value="all">{t('all_status')}</option>
              <option value="active">{t('live_now')}</option>
              <option value="upcoming">{t('upcoming')}</option>
              <option value="completed">{t('completed')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm flex flex-col h-[280px]">
              <div className="flex justify-between items-start mb-4">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <Skeleton className="w-20 h-6 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-6" />
              <div className="space-y-3 mt-auto">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="mt-6 pt-4 border-t border-border flex justify-between">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground font-medium">{t('no_exams_found')}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredExams.map((exam: any) => (
            <div key={exam.id} className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-2">
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl w-fit">
                    <FileText size={24} />
                  </div>
                  {getTypeBadge(exam.type)}
                </div>
                {getStatusBadge(exam.status)}
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{exam.title}</h3>
              <p className="text-sm font-medium text-primary mb-4">{exam.subject} • {exam.grade}</p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar size={16} className="text-muted-foreground" />
                  <span className="font-medium">{new Date(exam.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock size={16} className="text-muted-foreground" />
                  <span className="font-medium">{exam.duration} {t('minutes')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 size={16} className="text-muted-foreground" />
                  <span className="font-medium">{exam.questionsCount} {t('questions')} • {exam.totalMarks} {t('marks')}</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              {exam.status === 'active' && isStudent && (
                <Link href={`/dashboard/exams/${exam.id}/take`} className="w-full py-2.5 bg-emerald-500 text-primary-foreground rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                  <PlayCircle size={18} />
                  {t('start_exam')}
                </Link>
              )}
              {exam.status === 'active' && isTeacherOrAdmin && (
                <Link href={`/dashboard/exams/${exam.id}/monitor`} className="w-full py-2.5 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
                  <BarChart size={18} />
                  {t('monitor_live')}
                </Link>
              )}
              {exam.status === 'upcoming' && (
                <button disabled className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                  <Clock size={18} />
                  {t('starts_soon')}
                </button>
              )}
              {exam.status === 'completed' && (
                <Link href={`/dashboard/exams/${exam.id}/results`} className="w-full py-2.5 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2">
                  <BarChart size={18} />
                  {isStudent ? `${t('view_results')} (${exam.score}/${exam.totalMarks})` : t('view_analytics')}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card rounded-xl shadow-sm mt-auto">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-bold text-foreground bg-background border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            {t('previous')}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">
              {t('page_label')} <span className="text-foreground font-bold">{page}</span> {t('of_label')} <span className="text-foreground font-bold">{totalPages}</span>
            </span>
            <span className="text-sm font-medium text-muted-foreground border-l border-border pl-4 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-4">
              {t('total_label')}: <span className="text-foreground font-bold">{totalCount}</span>
            </span>
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-bold text-foreground bg-background border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            {t('next')}
          </button>
        </div>
      )}
    </motion.div>
  );
}
