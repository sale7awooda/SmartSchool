'use client';

import { use, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getAssessmentWithQuestions, getSubmissions } from '@/lib/supabase-db';
import { 
  saveManualScoresAction, 
  deleteSubmissionAction, 
  extendAssessmentDurationAction 
} from '@/app/actions/academics';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  BarChart3,
  Activity,
  UserCheck,
  Award,
  RotateCcw,
  Plus,
  X,
  PlusSquare,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function MonitorAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  
  const { data: assessment, isLoading: isLoadingAssessment, error: assessmentError, mutate: mutateAssessment } = useSWR(
    id ? `assessment_${id}` : null,
    () => getAssessmentWithQuestions(id)
  );

  const { data: submissions, isLoading: isLoadingSubmissions, mutate: mutateSubmissions } = useSWR(
    id ? `submissions_${id}` : null,
    () => getSubmissions(id),
    { refreshInterval: 5000 } // Refresh every 5 seconds for live monitor
  );

  const [timeRemaining, setTimeRemaining] = useState<string>('--:--');
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  
  // Scoring state
  const [manualGrades, setManualGrades] = useState<Record<string, number>>({});
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Custom Reset Confirmation Dialon state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    // Parse activation timestamp from description if available
    let activatedAt: string | null = null;
    if (assessment?.description) {
      const match = assessment.description.match(/\[ActivatedAt:\s*([^\]]+)\]/i);
      if (match) {
        activatedAt = match[1];
      }
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      
      const activeWindowMs = 12 * 60 * 60 * 1000; // Fixed 12 hour timeframe for taking the assessment

      let activationStart = now;
      if (activatedAt) {
        activationStart = new Date(activatedAt).getTime();
      } else if (assessment?.date) {
        activationStart = new Date(assessment.date).getTime();
      }

      let expirationTime = activationStart + activeWindowMs;
      
      // Align with dashboard listing: also make sure it stays active until end of the date if not activated yet.
      if (!activatedAt && assessment?.date) {
         const endOfDay = new Date(assessment.date);
         endOfDay.setHours(23, 59, 59, 999);
         expirationTime = endOfDay.getTime();
      }

      const diff = expirationTime - now;

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
  }, [assessment?.description, assessment?.duration, assessment?.date]);

  // Handle open submission for manual grading
  const handleOpenGrading = (sub: any) => {
    setSelectedSubmission(sub);
    
    // Pre-populate any existing manual scores
    const existingManual = sub.answers?._manual_scores || {};
    const grades: Record<string, number> = {};
    
    if (assessment?.questions) {
      assessment.questions.forEach((q: any) => {
        if (existingManual[q.id] !== undefined) {
          grades[q.id] = Number(existingManual[q.id]);
        } else if (q.type === 'short_answer') {
          // If auto graded, show that score as initial, otherwise let it be blank
          const correctAns = q.correct_answer;
          const studentAns = sub.answers?.[q.id];
          const isAutoCorrect = String(studentAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
          grades[q.id] = isAutoCorrect ? Number(q.marks || q.points || 0) : 0;
        }
      });
    }
    setManualGrades(grades);
  };

  // Run core extension server action
  const handleExtendDuration = async (minutes: number) => {
    if (!id || !user) return;
    setIsExtending(true);
    try {
      const res = await extendAssessmentDurationAction(id, minutes, user.id);
      if (res.success) {
        toast.success(`Assessment extended successfully by +${minutes} minutes!`);
        mutateAssessment();
      } else {
        toast.error(res.message || 'Could not extend timeframe');
      }
    } catch (e: any) {
      toast.error('Failed to extend assessment duration');
    } finally {
      setIsExtending(false);
    }
  };

  // Run reset submission server action (allowing manual retake)
  const handleResetSubmission = async () => {
    if (!selectedSubmission || !user) return;
    setIsResetting(true);
    try {
      const res = await deleteSubmissionAction(selectedSubmission.id, user.id);
      if (res.success) {
        toast.success('Submission successfully reset! Student can now retake this assessment.');
        mutateSubmissions();
        setSelectedSubmission(null);
        setShowResetConfirm(false);
      } else {
        toast.error(res.message || 'Could not reset submission');
      }
    } catch (e: any) {
      toast.error('An error occurred while resetting the submission');
    } finally {
      setIsResetting(false);
    }
  };

  // Save manual graded results
  const handleSaveManualGrades = async () => {
    if (!selectedSubmission || !user) return;
    setIsSavingGrades(true);
    try {
      const res = await saveManualScoresAction(selectedSubmission.id, manualGrades, user.id);
      if (res.success) {
        toast.success('Subjective marks saved and recomputed successfully!');
        mutateSubmissions();
        setSelectedSubmission(null);
      } else {
        toast.error(res.message || 'Could not save marks');
      }
    } catch (e: any) {
      toast.error('Failed to save manual grades');
    } finally {
      setIsSavingGrades(false);
    }
  };

  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return null;
  }

  if (isLoadingAssessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-semibold text-sm">Loading active class monitor...</p>
      </div>
    );
  }

  if (assessmentError || !assessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground font-medium">Failed to load assessment details.</p>
        <Link href="/dashboard/assessments" className="text-primary font-bold hover:underline text-sm">
          Return to Assessments Board
        </Link>
      </div>
    );
  }

  const submissionsList = submissions || [];
  const completedCount = submissionsList.filter((s: any) => s.status === 'completed' || s.status !== 'in_progress').length;
  const inProgressCount = submissionsList.filter((s: any) => s.status === 'in_progress').length;

  const computedTotalMarks = assessment.questions?.reduce((total: number, q: any) => total + Number(q.marks || q.points || 1), 0) || assessment.total_marks || 100;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/assessments" className="p-2.5 text-muted-foreground hover:bg-muted rounded-2xl transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Activity className="text-rose-500 animate-pulse" size={24} />
              Classroom live monitor
            </h1>
            <p className="text-muted-foreground text-sm font-medium mt-1">
              Assessment: <span className="font-extrabold text-foreground">{assessment.title}</span> • {assessment.subject?.name || assessment.subject} • {assessment.class?.name || assessment.grade || assessment.class}
            </p>
          </div>
        </div>
      </div>

      {/* Classroom Status Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Submissions Received</p>
            <p className="text-xl font-extrabold mt-1 text-foreground">
              {completedCount}
              {inProgressCount > 0 && (
                <span className="text-xs font-bold text-amber-500 ml-2 animate-pulse">
                  ({inProgressCount} In Progress)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Remaining timeframe</p>
            <p className="text-xl font-extrabold mt-1 text-foreground flex items-center gap-1.5">
              {timeRemaining}
              {isExtending && <Loader2 size={14} className="animate-spin text-primary" />}
            </p>
          </div>
        </div>
      </div>

      {/* Student Progress Monitoring Grid */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/15">
          <h2 className="font-bold text-base flex items-center gap-2">
            <UserCheck size={18} className="text-primary" />
            Active students submissions
          </h2>
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live sync active
          </div>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
          {isLoadingSubmissions ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : submissionsList.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground max-w-sm mx-auto">
              <BarChart3 size={44} className="mx-auto mb-4 opacity-25" />
              <p className="font-bold text-sm">No submissions found</p>
              <p className="text-xs mt-1 text-muted-foreground font-medium">Awaiting students to open and start taking the live assessment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissionsList.map((submission: any) => {
                const hasCheating = submission.answers?._cheating_alerts?.violations?.length > 0;
                return (
                  <div 
                    key={submission.id} 
                    onClick={() => handleOpenGrading(submission)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/20 transition-all cursor-pointer shadow-sm select-none gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 text-sm ${
                        submission.status === 'in_progress' 
                          ? 'bg-amber-500/10 text-amber-500' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {submission.student?.name?.[0] || 'S'}
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-foreground">
                          {submission.student?.name || 'Unknown Student'}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {submission.status === 'in_progress' ? 'Started session' : 'Submitted/Finished'} at{' '} 
                          {new Date(submission.submitted_at || '2026-06-12T00:00:00Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        
                        {/* Cheating Alert badge */}
                        {hasCheating && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-extrabold text-destructive bg-destructive/10 px-2 py-0.5 rounded-lg border border-destructive/20 mt-1">
                            <AlertCircle size={11} className="shrink-0" />
                            Security Alert: {submission.answers._cheating_alerts.tab_switches} Focus Switched
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground font-bold">Grade / Marks</p>
                        <p className="text-sm font-extrabold text-foreground mt-0.5">
                          {submission.status === 'in_progress' ? '--' : `${submission.score || 0} / ${computedTotalMarks}`}
                        </p>
                      </div>

                      {submission.status === 'in_progress' ? (
                        <div className="flex items-center gap-1 bg-amber-500/15 text-amber-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider animate-pulse border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          In Progress
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-emerald-500/15 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                          <CheckCircle2 size={11} />
                          Reviewed / Click to Grade
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Manual Grading and Detail Dialog Drawer */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
            <div className="absolute inset-0 bg-transparent" onClick={() => { if (!showResetConfirm) setSelectedSubmission(null); }} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-card text-foreground rounded-[2rem] border border-border shadow-2xl p-6 sm:p-8 w-full max-w-2xl z-10 relative space-y-6 max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 shrink-0 col-span-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    {selectedSubmission.student?.name?.[0] || 'S'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">{selectedSubmission.student?.name}</h2>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                      Submission details & subjective corrective marking • Status: <span className="text-foreground uppercase font-black">{selectedSubmission.status}</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted font-mono font-bold text-muted-foreground"
                >
                  ✕
                </button>
              </div>

              {/* Warning Log for Tab switches */}
              {selectedSubmission.answers?._cheating_alerts?.violations?.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-destructive space-y-2 shrink-0">
                  <p className="font-extrabold flex items-center gap-1.5 uppercase tracking-wider">
                    <AlertTriangle size={14} />
                    Exam Focus Switch Logging Summary:
                  </p>
                  <ul className="list-disc pl-5 font-semibold space-y-1">
                    {selectedSubmission.answers._cheating_alerts.violations.map((v: string, index: number) => (
                      <li key={index}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Questions Answers List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar max-h-[45vh]">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest bg-muted py-2 px-3.5 rounded-xl">
                  Questions Board Sheets & Student responses
                </h3>
                
                {assessment.questions?.length > 0 ? (
                  assessment.questions.map((q: any, index: number) => {
                    const studentAns = selectedSubmission.answers?.[q.id];
                    const isCorrectMCQ = q.type !== 'short_answer' && String(studentAns).trim().toLowerCase() === String(q.correct_answer || q.correct_answers?.[0]).trim().toLowerCase();
                    const isManualType = q.type === 'short_answer' || q.type === 'subjective';

                    return (
                      <div key={q.id} className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                            Q{index + 1}
                          </span>
                          <span className="text-xs font-bold text-muted-foreground">
                            Max: {q.marks || q.points} Marks
                          </span>
                        </div>
                        
                        <p className="text-sm font-bold text-foreground">
                          {q.text || q.question}
                        </p>

                        <div className="text-xs space-y-1.5 font-semibold">
                          <p className="text-muted-foreground">
                            Correct Reference Answer:{' '}
                            <span className="text-foreground font-bold bg-muted px-2 py-0.5 rounded">
                              {q.correct_answer || JSON.stringify(q.correct_answers || '')}
                            </span>
                          </p>
                          <p className="text-muted-foreground">
                            Student response:{' '}
                            <span className={`px-2 py-0.5 rounded font-black ${
                              studentAns === undefined || studentAns === null
                                ? 'bg-muted text-slate-500'
                                : isManualType
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : isCorrectMCQ
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-red-500/10 text-red-600'
                            }`}>
                              {studentAns === undefined || studentAns === null ? 'No Response / Left blank' : String(studentAns)}
                            </span>
                          </p>
                        </div>

                        {/* Grading Field */}
                        {isManualType ? (
                          <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3 bg-card p-3 rounded-xl border">
                            <label className="text-xs font-bold text-foreground">
                              Award Mark / Correct Points:
                            </label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                min={0}
                                max={q.marks || q.points || 1}
                                step={0.5}
                                value={manualGrades[q.id] !== undefined ? manualGrades[q.id] : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  setManualGrades(prev => ({
                                    ...prev,
                                    [q.id]: Math.min(val, Number(q.marks || q.points || 1))
                                  }));
                                }}
                                className="w-16 px-2 py-1.5 text-center text-sm font-bold bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                              />
                              <span className="text-xs font-bold text-muted-foreground">
                                / {q.marks || q.points}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 flex items-center justify-between text-xs font-medium">
                            <span className="text-muted-foreground">Auto-graded result:</span>
                            <span className={`font-bold flex items-center gap-1 ${isCorrectMCQ ? 'text-emerald-600' : 'text-red-500'}`}>
                              {isCorrectMCQ ? '✓ Correct' : '✗ Incorrect'}{' '}
                              ({isCorrectMCQ ? q.marks || q.points : 0} Marks)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-center text-muted-foreground py-4 font-semibold">
                    No questions linked with this assessment. Let admin know.
                  </p>
                )}
              </div>

              {/* Footer Panel buttons / Dialog Actions */}
              <div className="pt-4 border-t border-border shrink-0 col-span-1 flex flex-wrap gap-3">
                {/* Reset / Retake Button */}
                <button 
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500/20 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 focus:outline-none"
                  title="Remove this submission entirely to let student take again"
                >
                  <RotateCcw size={14} />
                  Reset / Allow Retake
                </button>

                <div className="flex bg-muted/60 p-1 rounded-xl items-center gap-1 border border-border">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider px-2">Extend Time:</span>
                  <button
                    onClick={() => handleExtendDuration(15)}
                    disabled={isExtending}
                    className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border hover:bg-muted text-xs font-bold rounded-lg transition-all shadow-sm disabled:opacity-50"
                  >
                    <Plus size={12} />
                    +15m
                  </button>
                  <button
                    onClick={() => handleExtendDuration(30)}
                    disabled={isExtending}
                    className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border hover:bg-muted text-xs font-bold rounded-lg transition-all shadow-sm disabled:opacity-50"
                  >
                    <Plus size={12} />
                    +30m
                  </button>
                </div>

                <div className="flex-1" />

                <button 
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-5 py-3 bg-muted text-muted-foreground hover:bg-muted/80 font-bold text-xs rounded-xl transition-all"
                >
                  Dismiss Drawer
                </button>
                <button 
                  type="button"
                  disabled={isSavingGrades}
                  onClick={handleSaveManualGrades}
                  className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/95 font-bold text-xs rounded-xl shadow-lg shadow-primary/10 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {isSavingGrades ? <Loader2 size={13} className="animate-spin" /> : <Award size={14} />}
                  Save Grades
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Reset/Retake Confirmation Modal Dialog -- NO BROWSER ALERTS */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card text-foreground rounded-[2rem] border border-border shadow-2xl p-6 sm:p-7 w-full max-w-sm relative space-y-5"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-red-500/10 text-red-500 rounded-full mx-auto">
                <RotateCcw size={24} className="animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-bold text-foreground">Allow Retake / Reset?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                  Are you absolutely sure you want to reset this student&apos;s exam sheet? This will delete their current score and answers permanently. The student can instantly start taking this live assessment from scratch.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isResetting}
                  className="flex-1 py-3 text-xs bg-muted text-muted-foreground font-bold rounded-xl active:scale-[0.98] transition-all hover:bg-muted/80"
                >
                  No, Keep Submission
                </button>
                <button
                  type="button"
                  onClick={handleResetSubmission}
                  disabled={isResetting}
                  className="flex-1 py-3 text-xs bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isResetting ? <Loader2 size={13} className="animate-spin" /> : 'Yes, Allow Retake'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
