'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { getPaginatedAssessments, getActiveAcademicYear, getStudentByUserId, getStudentSubmissions } from '@/lib/supabase-db';
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
const ASSESSMENTS = [
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

export default function AssessmentsPage() {
  const { user } = useAuth();
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

  const { data: assessmentsResponse, isLoading } = useSWR(
    ['assessments', page, debouncedSearch, statusFilter, activeAcademicYear?.name],
    ([_, p, s, status, a]) => getPaginatedAssessments(p, limit, s, status)
  );

  const [studentId, setStudentId] = useState<string | null>(null);
  useEffect(() => {
    if (user?.id && isRole('student')) {
      getStudentByUserId(user.id).then(s => setStudentId(s.id));
    }
  }, [user, isRole]);

  const { data: studentSubmissions } = useSWR(
    studentId ? `student_submissions_${studentId}` : null,
    () => getStudentSubmissions(studentId!)
  );

  const assessments = assessmentsResponse?.data || [];
  const totalPages = assessmentsResponse?.totalPages || 1;
  const totalCount = assessmentsResponse?.count || 0;

  if (!user) return null;

  if (!can('view', 'assessments')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  const isStudent = isRole('student');
  const isTeacherOrAdmin = can('manage', 'assessments') || can('create', 'assessments');

  const filteredAssessments = assessments.map((assessment: any) => {
    const submission = studentSubmissions?.find((s: any) => s.assessment_id === assessment.id);
    
    return {
      id: assessment.id,
      title: assessment.title,
      subject: assessment.subject?.name || assessment.subject || 'Unknown Subject',
      grade: assessment.class?.name || assessment.grade || 'All Grades',
      date: assessment.date || assessment.due_date || 'TBD',
      duration: assessment.duration || 60,
      status: submission ? 'completed' : (assessment.status || 'upcoming'),
      totalMarks: assessment.total_marks || 100,
      questionsCount: assessment.questions_count || 0,
      type: assessment.type || 'exam',
      score: submission?.score,
    };
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-500 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Now</span>;
      case 'upcoming':
        return <span className="px-2.5 py-1 bg-amber-500/20 text-amber-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">Upcoming</span>;
      case 'completed':
        return <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-lg text-[10px] font-bold uppercase tracking-wider">Completed</span>;
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Online Assessments</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {isStudent ? 'View and take your assessments' : 'Manage online assessments'}
          </p>
        </div>
        
        {can('create', 'assessments') && (
          <Link 
            href="/dashboard/assessments/create"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus size={18} />
            Create Assessment
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search assessments by title or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm appearance-none font-medium text-foreground"
            >
              <option value="all">All Status</option>
              <option value="active">Live Now</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
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
      ) : filteredAssessments.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground font-medium">No assessments found.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAssessments.map((assessment: any) => (
            <div key={assessment.id} className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-2">
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl w-fit">
                    <FileText size={24} />
                  </div>
                  {getTypeBadge(assessment.type)}
                </div>
                {getStatusBadge(assessment.status)}
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{assessment.title}</h3>
              <p className="text-sm font-medium text-primary mb-4">{assessment.subject} • {assessment.grade}</p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar size={16} className="text-muted-foreground" />
                  <span className="font-medium">{new Date(assessment.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock size={16} className="text-muted-foreground" />
                  <span className="font-medium">{assessment.duration} Minutes</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 size={16} className="text-muted-foreground" />
                  <span className="font-medium">{assessment.questionsCount} Questions • {assessment.totalMarks} Marks</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              {assessment.status === 'active' && isStudent && (
                <Link href={`/dashboard/assessments/${assessment.id}/take`} className="w-full py-2.5 bg-emerald-500 text-primary-foreground rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                  <PlayCircle size={18} />
                  Start Assessment
                </Link>
              )}
              {assessment.status === 'active' && isTeacherOrAdmin && (
                <Link href={`/dashboard/assessments/${assessment.id}/monitor`} className="w-full py-2.5 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
                  <BarChart size={18} />
                  Monitor Live
                </Link>
              )}
              {assessment.status === 'upcoming' && (
                <button disabled className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                  <Clock size={18} />
                  Starts Soon
                </button>
              )}
              {assessment.status === 'completed' && (
                <Link href={`/dashboard/assessments/${assessment.id}/results`} className="w-full py-2.5 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2">
                  <BarChart size={18} />
                  {isStudent ? `View Results (${assessment.score}/${assessment.totalMarks})` : 'View Analytics'}
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
            Previous
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">
              Page <span className="text-foreground font-bold">{page}</span> of <span className="text-foreground font-bold">{totalPages}</span>
            </span>
            <span className="text-sm font-medium text-muted-foreground border-l border-border pl-4">
              Total: <span className="text-foreground font-bold">{totalCount}</span>
            </span>
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-bold text-foreground bg-background border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
}
