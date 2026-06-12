'use client';

import { use, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getAssessmentWithQuestions, getSubmissions } from '@/lib/supabase-db';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  BarChart3,
  Activity,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';

export default function MonitorAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  
  const { data: assessment, isLoading: isLoadingAssessment, error: assessmentError } = useSWR(
    id ? `assessment_${id}` : null,
    () => getAssessmentWithQuestions(id)
  );

  const { data: submissions, isLoading: isLoadingSubmissions } = useSWR(
    id ? `submissions_${id}` : null,
    () => getSubmissions(id),
    { refreshInterval: 5000 } // Refresh every 5 seconds for live monitor
  );

  const [timeRemaining, setTimeRemaining] = useState<string>('--:--');

  useEffect(() => {
    if (!assessment?.due_date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeRemaining('No Limit');
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const dueDateObj = new Date(assessment.due_date);
      dueDateObj.setHours(23, 59, 59, 999);
      const dueDate = dueDateObj.getTime();
      const diff = dueDate - now;

      if (diff <= 0) {
        setTimeRemaining('Ended');
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [assessment?.due_date]);

  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return null;
  }

  if (isLoadingAssessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Loading monitor...</p>
      </div>
    );
  }

  if (assessmentError || !assessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground font-medium">Failed to load assessment.</p>
        <Link href="/dashboard/assessments" className="text-primary font-bold hover:underline">
          Go back to dashboard
        </Link>
      </div>
    );
  }

  const submissionsList = submissions || [];
  const completedCount = submissionsList.filter((s: any) => s.status === 'completed' || s.status !== 'in_progress').length;
  const inProgressCount = submissionsList.filter((s: any) => s.status === 'in_progress').length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/assessments" className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Live Monitor: {assessment.title}</h1>
          <p className="text-muted-foreground text-sm font-medium">{assessment.subject?.name || assessment.subject} • {assessment.class?.name || assessment.grade || assessment.class}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Submissions</p>
            <p className="text-2xl font-bold">
              {completedCount}
              {inProgressCount > 0 && (
                <span className="text-sm font-bold text-amber-500 ml-2">
                  ({inProgressCount} In Progress)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Time Remaining</p>
            <p className="text-2xl font-bold">{timeRemaining}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Activity size={20} className="text-primary" />
            Student Progress
          </h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">Live Updates</span>
          </div>
        </div>
        <div className="p-6">
          {isLoadingSubmissions ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : submissionsList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">No submissions yet. Waiting for students...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissionsList.map((submission: any) => (
                <div key={submission.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 mt-1">
                      {submission.student?.user?.first_name?.[0] || 'S'}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {submission.student?.user?.first_name} {submission.student?.user?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {submission.status === 'in_progress' ? 'Started taking test' : 'Submitted'} at {new Date(submission.submitted_at || submission.created_at || '2026-06-12T00:00:00Z').toLocaleTimeString()}
                      </p>

                      {submission.answers?._cheating_alerts?.violations && submission.answers._cheating_alerts.violations.length > 0 && (
                        <div className="mt-2 text-xs text-rose-600 bg-rose-50/70 p-2.5 rounded-xl border border-rose-100 space-y-1.5 max-w-sm">
                          <p className="font-bold flex items-center gap-1 text-rose-700">
                            <AlertCircle size={13} className="shrink-0" /> 
                            Focus Switched Logs ({submission.answers._cheating_alerts.tab_switches}):
                          </p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {submission.answers._cheating_alerts.violations.slice(-4).map((v: string, idx: number) => (
                              <li key={idx} className="font-medium text-[11px]">{v}</li>
                            ))}
                            {submission.answers._cheating_alerts.violations.length > 4 && (
                              <li className="list-none text-[10px] text-rose-500 font-bold italic">
                                + {submission.answers._cheating_alerts.violations.length - 4} more focus switch incidents
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {submission.status === 'in_progress' ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5 text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full text-xs font-bold leading-none ring-1 ring-amber-500/20 shadow-sm animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        In Progress
                      </div>
                      {submission.answers?._cheating_alerts?.tab_switches > 0 && (
                        <span className="text-[11px] text-rose-600 font-bold bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-200/50 flex items-center gap-1">
                          <AlertCircle size={11} className="shrink-0" />
                          {submission.answers._cheating_alerts.tab_switches} Tab Switch(es)
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-emerald-500/20 shadow-sm leading-none">
                      <CheckCircle2 size={13} />
                      Completed
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
