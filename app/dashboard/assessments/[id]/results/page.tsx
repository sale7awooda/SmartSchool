'use client';

import { use, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getAssessmentWithQuestions, getStudentByUserId, getSubmissionByAssessmentAndStudent } from '@/lib/supabase-db';
import { 
  ArrowLeft, 
  Trophy, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Loader2,
  BarChart3,
  FileText
} from 'lucide-react';
import Link from 'next/link';

export default function AssessmentResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  
  const { data: assessment, isLoading: isAssessmentLoading, error: assessmentError } = useSWR(
    id ? `assessment_${id}` : null,
    () => getAssessmentWithQuestions(id)
  );

  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id && user.role === 'student') {
      getStudentByUserId(user.id).then(s => setStudentId(s.id));
    }
  }, [user]);

  const { data: submission, isLoading: isSubmissionLoading } = useSWR(
    id && studentId ? `submission_${id}_${studentId}` : null,
    () => getSubmissionByAssessmentAndStudent(id, studentId!)
  );

  if (!user) return null;

  const isLoading = isAssessmentLoading || (user.role === 'student' && isSubmissionLoading);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Loading results...</p>
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

  const isStudent = user.role === 'student';
  const accuracy = submission ? Math.round((submission.score / submission.total_marks) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/assessments" className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {isStudent ? 'Your Results' : 'Assessment Analytics'}: {assessment.title}
          </h1>
          <p className="text-muted-foreground text-sm font-medium">{assessment.subject} • {assessment.grade}</p>
        </div>
      </div>

      {isStudent ? (
        submission ? (
          <div className="bg-card p-8 rounded-[2rem] border border-border shadow-sm text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
              <Trophy size={40} />
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-1">Your Score</p>
              <p className="text-5xl font-black text-primary">{submission.score} / {submission.total_marks}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-6">
              <div className="p-4 bg-muted rounded-2xl">
                <p className="text-xs text-muted-foreground font-bold uppercase mb-1">Submitted At</p>
                <p className="text-xl font-bold text-foreground">
                  {new Date(submission.submitted_at).toLocaleDateString()}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-2xl">
                <p className="text-xs text-muted-foreground font-bold uppercase mb-1">Accuracy</p>
                <p className="text-xl font-bold text-primary">{accuracy}%</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card p-8 rounded-[2rem] border border-border shadow-sm text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold">No Submission Found</h2>
            <p className="text-muted-foreground mt-2">You haven&apos;t submitted this assessment yet.</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-primary" />
              Class Performance
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Average Score</span>
                <span className="font-bold">72%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Highest Score</span>
                <span className="font-bold">98%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Lowest Score</span>
                <span className="font-bold">45%</span>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              Question Analytics
            </h3>
            <p className="text-sm text-muted-foreground">Detailed question-by-question breakdown will be available after all students complete the assessment.</p>
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="font-bold text-lg">Review Questions</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium">Question review is currently locked by the teacher.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
