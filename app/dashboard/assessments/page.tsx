'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { getPaginatedAssessments, getActiveAcademicYear, getStudentByUserId, getStudentSubmissions, deleteAssessment, activateAssessment, getAssessmentWithQuestions } from '@/lib/supabase-db';
import { supabase } from '@/lib/supabase/client';
import { EmptyData } from '@/components/ui/empty-data';
import { motion, AnimatePresence } from 'motion/react';

// Helper functions for metadata tracking
function getCreatorId(description: string): string | null {
  if (!description) return null;
  const match = description.match(/\[CreatedBy:\s*([a-f\d\-]+)\]/i);
  return match ? match[1] : null;
}

function cleanDescription(description: string): string {
  if (!description) return '';
  return description
    .replace(/\s*\[CreatedBy:\s*[a-f\d\-]+\]/gi, '')
    .replace(/\s*\[ActivatedAt:\s*[^\]]+\]/gi, '')
    .trim();
}
import { 
  FileText, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  Search,
  Filter,
  PlayCircle,
  BarChart,
  Trash2,
  Edit,
  X,
  AlertTriangle,
  Loader2,
  BookOpen
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

  const canEditOrDelete = (assessment: any) => {
    if (isRole('admin')) return true;
    if (isRole('teacher')) {
      const creatorId = getCreatorId(assessment.description);
      const isCreator = creatorId === user?.id;

      const teacherSubjectNames = new Set(
        teacherSchedules?.map((s: any) => s.subject?.name?.toLowerCase().trim()) || []
      );
      const assessmentSubjectName = (assessment.subject?.name || assessment.subject || '').toLowerCase().trim();
      const isTeacherSubject = teacherSubjectNames.has(assessmentSubjectName);

      return isCreator || isTeacherSubject;
    }
    return false;
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 12; // 4 columns now

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activateConfirmId, setActivateConfirmId] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data: viewingAssessment, isLoading: isLoadingViewSpec } = useSWR(
    viewingId ? `view_assessment_spec_${viewingId}` : null,
    () => getAssessmentWithQuestions(viewingId!)
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: assessmentsResponse, isLoading, mutate: mutateAssessments } = useSWR(
    ['assessments', page, debouncedSearch, statusFilter, activeAcademicYear?.name],
    ([_, p, s, status, a]) => getPaginatedAssessments(p, limit, s, status)
  );

  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentRecord, setStudentRecord] = useState<any>(null);
  useEffect(() => {
    if (user?.id && isRole('student')) {
      getStudentByUserId(user.id).then(s => {
        if (!s) return;
        setStudentId(s.id);
        setStudentRecord(s);
      });
    }
  }, [user, isRole]);

  const { data: studentSubmissions } = useSWR(
    studentId ? `student_submissions_${studentId}` : null,
    () => getStudentSubmissions(studentId!)
  );

  const { data: teacherSchedules } = useSWR(
    user && isRole('teacher') ? `teacher_schedules_${user.id}` : null,
    async () => {
      if (!user) return [];
      const { data: sData } = await supabase
        .from('schedules')
        .select('*, subject:subjects(name)')
        .eq('teacher_id', user.id);
      return sData || [];
    }
  );

  const rawAssessments = assessmentsResponse?.data || [];
  const totalPages = assessmentsResponse?.totalPages || 1;
  const totalCount = assessmentsResponse?.count || 0;

  if (!user) return null;

  if (!can('view', 'assessments')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  const isStudent = isRole('student');
  const isTeacherOrAdmin = can('manage', 'assessments') || can('create', 'assessments');

  const todayDateString = new Date().toLocaleDateString('en-CA'); 

  // Filter based on roles, dates, and academic year
  const assessments = rawAssessments.filter((a: any) => {
    // Filter by academic year dates if available
    if (activeAcademicYear) {
      const assessmentDate = a.date;
      if (assessmentDate) {
        if (assessmentDate < activeAcademicYear.start_date || assessmentDate > activeAcademicYear.end_date) {
          return false;
        }
      }
    }

    if (isRole('teacher')) {
      const creatorId = getCreatorId(a.description);
      const isCreator = creatorId === user?.id;

      const teacherSubjectNames = new Set(
        teacherSchedules?.map((s: any) => s.subject?.name?.toLowerCase().trim()) || []
      );
      const assessmentSubjectName = (a.subject?.name || a.subject || '').toLowerCase().trim();
      const isTeacherSubject = teacherSubjectNames.has(assessmentSubjectName);

      if (!isCreator && !isTeacherSubject) {
        return false;
      }
    }

    const assessmentGrade = a.class?.name || a.grade || '';
    if (isStudent && studentRecord) {
      if (assessmentGrade !== studentRecord.grade) return false;
      
      const submissionInfo = studentSubmissions?.find((s: any) => s.assessment_id === a.id);
      
      // If student has already submitted, they should see it regardless of date/status so they can view results
      if (submissionInfo) return true;
      
      // If no submission, only show active assessments (or upcoming ones? User wants them to start if active)
      // Usually students only see 'active' assessments that they haven't taken yet, or maybe 'upcoming' ones
      if (a.status === 'upcoming') return true; 
      if (a.status === 'completed') return false; // Closed for new submissions
      
      // If active, let them see it so they can take it
      if (a.status === 'active') return true;

      return false; // Hide drafts etc
    }
    // if student record hasn't loaded yet, default to false so they don't see wrong ones
    if (isStudent && !studentRecord) return false;
    
    return true;
  });

  const filteredAssessments = assessments.map((assessment: any) => {
    const submission = studentSubmissions?.find((s: any) => s.assessment_id === assessment.id);
    
    let computedStatus = assessment.status || 'upcoming';
    const dateProperty = assessment.date || assessment.due_date;
    if (computedStatus === 'active' && dateProperty) {
      const dueDateObj = new Date(dateProperty);
      dueDateObj.setHours(23, 59, 59, 999);
      if (new Date().getTime() > dueDateObj.getTime()) {
        computedStatus = 'completed';
      }
    }

    return {
      id: assessment.id,
      title: assessment.title,
      subject: assessment.subject?.name || assessment.subject || 'Unknown Subject',
      grade: assessment.class?.name || assessment.grade || 'All Grades',
      date: dateProperty || 'TBD',
      duration: assessment.duration || 60,
      status: (submission && (submission.status === 'completed' || submission.status === 'graded')) ? 'completed' : computedStatus,
      totalMarks: assessment.total_marks || (assessment.questions ? assessment.questions.reduce((acc: number, q: any) => acc + (q.marks || q.points || 5), 0) : 0) || 5,
      questionsCount: assessment.questions_count || (assessment.questions ? assessment.questions.length : 0) || 0,
      type: assessment.type || 'exam',
      score: submission?.score,
      submissionStatus: submission?.status,
      description: assessment.description, // Passed for ownership check
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-card p-5 rounded-[1.25rem] border border-border shadow-sm flex flex-col h-[230px]">
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
        <EmptyData 
          icon={FileText} 
          title="No Assessments Found" 
          description="There are currently no active or upcoming assessments matching your search for this academic period." 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssessments.map((assessment: any) => (
            <div key={assessment.id} className="bg-card rounded-2xl border border-border shadow-sm flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow">
              
              {/* Header section with Status and Actions */}
              <div className="p-4 bg-muted/30 border-b border-border flex justify-between items-start gap-2">
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getTypeBadge(assessment.type)}
                    {getStatusBadge(assessment.status)}
                  </div>
                  <h3 className="text-lg font-bold text-foreground leading-tight line-clamp-1" title={assessment.title}>
                    {assessment.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/5 w-fit px-2 py-1 rounded-md shrink-0">
                   <BookOpen size={12} />
                   <span>{assessment.subject} • {assessment.grade}</span>
                  </div>
                </div>

                {isTeacherOrAdmin && canEditOrDelete(assessment) && (
                  <div className="flex gap-1 shrink-0">
                    {assessment.status === 'upcoming' && (
                      <button 
                        onClick={() => setActivateConfirmId(assessment.id)}
                        className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl hover:bg-emerald-500/20 transition-colors"
                        title="Activate Assessment"
                      >
                        <PlayCircle size={16} />
                      </button>
                    )}
                    <Link 
                      href={`/dashboard/assessments/${assessment.id}/edit`} 
                      className="p-2 bg-slate-500/10 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-500/20 transition-colors" 
                      title="Edit Assessment"
                    >
                      <Edit size={16} />
                    </Link>
                    <button 
                      onClick={() => setDeleteConfirmId(assessment.id)}
                      className="p-2 bg-red-500/10 text-red-600 rounded-xl hover:bg-red-500/20 transition-colors" 
                      title="Delete Assessment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Body */}
              <div 
                onClick={() => setViewingId(assessment.id)}
                className="p-4 flex-1 flex flex-col justify-between gap-4 cursor-pointer hover:bg-muted/15 transition-colors group/body"
                title="Click to view assessment description and spec sheet questions"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-foreground bg-muted p-2.5 rounded-xl">
                    <Calendar size={16} className="text-muted-foreground shrink-0" />
                    <span className="font-bold truncate">{new Date(assessment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground bg-muted p-2.5 rounded-xl">
                    <Clock size={16} className="text-muted-foreground shrink-0" />
                    <span className="font-bold truncate">{assessment.duration} Mins</span>
                  </div>
                </div>

                {assessment.description && (
                  <p className="text-xs text-muted-foreground/90 line-clamp-2 mt-1 leading-relaxed">
                    {cleanDescription(assessment.description)}
                  </p>
                )}

                <div className="text-[11px] font-black text-primary/80 group-hover/body:text-primary transition-colors flex items-center gap-1 mt-3">
                  <FileText size={12} />
                  View Specification Details
                </div>
              </div>
              
              {/* Footer / CTA action */}
              <div className="p-4 pt-0">
                {assessment.status === 'active' && isStudent && (
                  <Link href={`/dashboard/assessments/${assessment.id}/take`} className="w-full py-3 bg-emerald-500 text-primary-foreground rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <PlayCircle size={18} />
                    {assessment.submissionStatus === 'in_progress' ? 'Continue Assessment' : 'Start Assessment'}
                  </Link>
                )}
                {assessment.status === 'active' && isTeacherOrAdmin && (
                  <Link href={`/dashboard/assessments/${assessment.id}/monitor`} className="w-full py-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    <BarChart size={18} />
                    Monitor Live Results
                  </Link>
                )}
                {assessment.status === 'upcoming' && (
                  <div className="w-full py-3 bg-muted text-muted-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                    <Clock size={18} />
                    Starts Soon
                  </div>
                )}
                {assessment.status === 'completed' && (
                  <Link href={`/dashboard/assessments/${assessment.id}/results`} className="w-full py-3 bg-card border border-border text-foreground hover:bg-muted rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
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

      {/* Detailed Assessment Specification View Modal */}
      <AnimatePresence>
        {viewingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
            <div className="absolute inset-0 bg-transparent" onClick={() => setViewingId(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-card text-foreground rounded-[2rem] border border-border shadow-2xl p-6 sm:p-8 w-full max-w-2xl z-10 relative space-y-6 max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-border shrink-0">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Assessment Specification Sheet</h3>
                  <p className="text-xs text-muted-foreground mt-1">Review the description, structure, and question statements details</p>
                </div>
                <button 
                  onClick={() => setViewingId(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted font-mono font-bold text-muted-foreground"
                >
                  ✕
                </button>
              </div>

              {/* Specification Meta Attributes */}
              {isLoadingViewSpec ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 flex-1">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs font-bold text-muted-foreground">Loading specification statements...</p>
                </div>
              ) : viewingAssessment ? (
                <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar min-h-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-4 rounded-2xl border border-border/80">
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Exam Title</p>
                      <p className="text-xs font-extrabold text-foreground mt-0.5 truncate">{viewingAssessment.title}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Subject</p>
                      <p className="text-xs font-extrabold text-foreground mt-0.5 truncate">{viewingAssessment.subject?.name || viewingAssessment.subject}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Class / Grade</p>
                      <p className="text-xs font-extrabold text-foreground mt-0.5 truncate">{viewingAssessment.class?.name || viewingAssessment.grade}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Duration limit</p>
                      <p className="text-xs font-extrabold text-foreground mt-0.5 truncate">{viewingAssessment.duration || 60} Mins</p>
                    </div>
                  </div>

                  {viewingAssessment.description && (
                    <div className="space-y-1.5 p-4 bg-muted/15 border border-border/60 rounded-2xl">
                      <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Exam Guidelines / Description</h4>
                      <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                        {cleanDescription(viewingAssessment.description)}
                      </p>
                    </div>
                  )}

                  {/* List of Questions Statements */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest pl-1">Questions Statements Sheets ({viewingAssessment.questions?.length || 0})</h4>
                    <div className="space-y-3.5">
                      {viewingAssessment.questions && viewingAssessment.questions.length > 0 ? (
                        viewingAssessment.questions.map((q: any, i: number) => (
                          <div key={q.id} className="p-4 bg-muted/20 rounded-2xl border border-border space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">Question {i + 1}</span>
                              <span className="text-xs font-bold text-muted-foreground">{q.marks || q.points || 1} Marks</span>
                            </div>
                            <p className="text-sm font-bold text-foreground leading-snug">{q.text || q.question}</p>
                            
                            {/* Type indicator */}
                            <div className="pt-1.5 flex flex-wrap gap-2">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted tracking-wider px-2 py-0.5 rounded-md">Type: {q.type || 'MCQ'}</span>
                              {(q.type === 'multiple_choice' || q.type === 'true_false') && q.correct_answer && (
                                <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md leading-relaxed">
                                  Correct Option: {String(q.correct_answer)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-center font-medium py-6 text-muted-foreground italic">No question statement sheets are linked to this exam entry.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-center py-12 text-muted-foreground">Unable to load details.</p>
              )}

              {/* Dismiss */}
              <div className="pt-4 border-t border-border shrink-0 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingId(null)}
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all text-xs rounded-xl"
                >
                  Close Specification
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-background rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">Delete Assessment</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Are you sure you want to delete this assessment? This action cannot be undone and will remove all questions and student submissions.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isSubmittingAction}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setIsSubmittingAction(true);
                    try {
                      await deleteAssessment(deleteConfirmId);
                      toast.success('Assessment deleted successfully!');
                      mutateAssessments();
                      setDeleteConfirmId(null);
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to delete assessment');
                    } finally {
                      setIsSubmittingAction(false);
                    }
                  }}
                  disabled={isSubmittingAction}
                  className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isSubmittingAction ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Activate Confirmation Modal */}
      {activateConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-background rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mx-auto mb-4">
                <PlayCircle className="text-emerald-500" size={24} />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">Activate Assessment</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Are you sure you want to activate this assessment? Students will be able to start taking it immediately.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setActivateConfirmId(null)}
                  disabled={isSubmittingAction}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setIsSubmittingAction(true);
                    try {
                      await activateAssessment(activateConfirmId);
                      toast.success('Assessment activated successfully!');
                      mutateAssessments();
                      setActivateConfirmId(null);
                    } catch (error) {
                      toast.error('Failed to activate assessment');
                    } finally {
                      setIsSubmittingAction(false);
                    }
                  }}
                  disabled={isSubmittingAction}
                  className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-emerald-500 text-white font-bold text-sm rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {isSubmittingAction ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                  Activate
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
