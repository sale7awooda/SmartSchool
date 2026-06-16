'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getAssessmentWithQuestions, submitAssessment, getStudentByUserId, getSubmissionByAssessmentAndStudent, startAssessmentSubmission, updateSubmission } from '@/lib/supabase-db';
import RichTextRenderer from '@/components/dashboard/RichTextRenderer';
import { toast } from 'sonner';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2
} from 'lucide-react';

export default function TakeAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  
  const { data: assessment, isLoading, error } = useSWR(
    id ? `assessment_${id}` : null,
    () => getAssessmentWithQuestions(id)
  );
  
  const [studentId, setStudentId] = useState<string | null>(user?.studentId || null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const initializedRef = useRef(false);

  let computedStatus = assessment?.status || 'upcoming';
  const dateProperty = assessment?.date || assessment?.due_date;
  if (computedStatus === 'active' && dateProperty) {
    const dueDateObj = new Date(dateProperty);
    dueDateObj.setHours(23, 59, 59, 999);
    if (new Date().getTime() > dueDateObj.getTime()) {
      computedStatus = 'completed';
    }
  }

  // Load student and start/restore submission
  useEffect(() => {
    const handleInitializeTake = async (stuId: string) => {
      setStudentId(stuId);
      try {
        const submission = await startAssessmentSubmission(id, stuId);
        if (submission) {
          setSubmissionId(submission.id);
          if (submission.status === 'completed' || submission.status === 'graded') {
            setHasSubmitted(true);
          } else {
            // Restore draft answers from database
            const dbAnswers = submission.answers || {};
            const dbCount = Object.keys(dbAnswers).filter(k => !k.startsWith('_')).length;

            // Also check localStorage fallback
            let localBackup: any = null;
            try {
              const s = localStorage.getItem(`assessment_draft_${id}_${stuId}`);
              if (s) {
                localBackup = JSON.parse(s);
              }
            } catch (e) {}
            const localCount = localBackup ? Object.keys(localBackup).filter(k => !k.startsWith('_')).length : 0;

            if (localBackup && localCount > dbCount) {
              setAnswers(localBackup);
              toast.info('Restored your draft answers from local fallback auto-save.');
            } else if (dbCount > 0) {
              setAnswers(dbAnswers);
              toast.info('Restored your draft answers from school server.');
            }
          }
        }
      } catch (err) {
        console.error('Error starting assessment submission:', err);
      }
    };

    if (user?.studentId) {
      handleInitializeTake(user.studentId);
    } else if (user?.id) {
      getStudentByUserId(user.id)
        .then(student => {
          if (student?.id) {
            handleInitializeTake(student.id);
          } else {
            console.error('Student profile not found for user ID', user.id);
          }
        })
        .catch(err => {
          console.error('Error fetching student info:', err);
        });
    }
  }, [user?.id, user?.studentId, id]);

  // Save current unchecked/checked state into localStorage and DB (Draft Auto-Save)
  useEffect(() => {
    if (!id || !studentId || !submissionId || hasSubmitted || isFinished) return;

    // Save locally
    localStorage.setItem(`assessment_draft_${id}_${studentId}`, JSON.stringify(answers));

    // Debounce/throttle save to server database
    const delayDebounceFn = setTimeout(async () => {
      try {
        await updateSubmission(submissionId, { answers });
      } catch (err) {
        console.error('Error auto-saving draft:', err);
      }
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [answers, id, studentId, submissionId, hasSubmitted, isFinished]);

  // Anti-Cheating tab/focus monitoring
  useEffect(() => {
    if (!id || !studentId || !submissionId || hasSubmitted || isFinished) return;

    let localSwitches = 0;
    try {
      const saved = localStorage.getItem(`cheating_switches_${id}_${studentId}`);
      if (saved) localSwitches = parseInt(saved) || 0;
    } catch (e) {}

    const triggerViolation = (violationType: string) => {
      localSwitches++;
      try {
        localStorage.setItem(`cheating_switches_${id}_${studentId}`, String(localSwitches));
      } catch (e) {}

      toast.warning(`Security Alert: Screen focus lost (${localSwitches}x). Switching tabs or minimizing during a live active test will notify the teacher!`, {
        duration: 5000,
      });

      const timestamp = new Date().toLocaleTimeString();

      setAnswers(prev => {
        const existingAlerts = prev._cheating_alerts || { tab_switches: 0, violations: [] };
        const newCount = (existingAlerts.tab_switches || 0) + 1;
        const newViolations = [...(existingAlerts.violations || []), `${violationType} at ${timestamp}`];
        
        return {
          ...prev,
          _cheating_alerts: {
            tab_switches: newCount,
            violations: newViolations
          }
        };
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerViolation('Minimized/Tab Switched');
      }
    };

    const handleWindowBlur = () => {
      triggerViolation('Window lost focus');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [id, studentId, submissionId, hasSubmitted, isFinished]);

  useEffect(() => {
    if (assessment && !initializedRef.current) {
      const durationMin = assessment.duration || 180; // Default to 3 hours (180 minutes)
      setTimeLeft(durationMin * 60);
      initializedRef.current = true;
    }
  }, [assessment]);

  const handleAutoSubmit = useCallback(async () => {
    if (isSubmitting || isFinished) return;
    
    setIsSubmitting(true);
    try {
      const activeStudentId = studentId || user?.studentId;
      if (!activeStudentId) throw new Error('Student ID not found');
      
      await submitAssessment({
        assessment_id: id,
        student_id: activeStudentId,
        answers,
        questions: assessment.questions
      });
      
      // Cleanup draft and cheating local counters
      try {
        localStorage.removeItem(`assessment_draft_${id}_${activeStudentId}`);
        localStorage.removeItem(`cheating_switches_${id}_${activeStudentId}`);
      } catch (e) {}

      setIsFinished(true);
    } catch (err) {
      console.error('Error submitting assessment:', err);
      toast.error('Failed to submit assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [id, studentId, user?.studentId, answers, assessment?.questions, isSubmitting, isFinished]);

  useEffect(() => {
    if (isFinished || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinished, timeLeft, handleAutoSubmit]);

  if (!user || user.role !== 'student') {
    return null; // Should redirect
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, value: any, type: string) => {
    if (type === 'multiple_response') {
      setAnswers(prev => {
        const current = prev[questionId] || [];
        const next = current.includes(value) 
          ? current.filter((v: any) => v !== value)
          : [...current, value];
        return { ...prev, [questionId]: next };
      });
    } else {
      setAnswers(prev => ({ ...prev, [questionId]: value }));
    }
  };

  const toggleFlag = (questionId: string) => {
    setFlagged(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleSubmit = () => {
    setShowSubmitConfirm(true);
  };

  if (isFinished) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto mt-12 text-center space-y-6">
        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Assessment Submitted Successfully!</h1>
        <p className="text-muted-foreground text-lg">Your answers have been recorded. You can view your results once the teacher publishes them.</p>
        <div className="pt-8">
          <button 
            onClick={() => router.push('/dashboard/assessments')}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm"
          >
            Return to Dashboard
          </button>
        </div>
      </motion.div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        <h2 className="text-2xl font-bold">Already Submitted</h2>
        <p className="text-muted-foreground font-medium text-center max-w-md">
          You have already submitted this assessment. You can view your results in the dashboard.
        </p>
        <button onClick={() => router.push('/dashboard/assessments')} className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold">
          Go back to dashboard
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Loading assessment...</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground font-medium">Failed to load assessment.</p>
        <button onClick={() => router.push('/dashboard/assessments')} className="text-primary font-bold hover:underline">
          Go back to dashboard
        </button>
      </div>
    );
  }

  if (computedStatus !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500" />
        <h2 className="text-2xl font-bold">Assessment Not Active</h2>
        <p className="text-muted-foreground font-medium">
          {computedStatus === 'upcoming' 
            ? 'This assessment has not started yet.' 
            : 'This assessment has ended and is no longer accepting submissions.'}
        </p>
        <button onClick={() => router.push('/dashboard/assessments')} className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors">
          Go back to dashboard
        </button>
      </div>
    );
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === assessment.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / assessment.questions.length) * 100;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border py-4 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none sm:border-none sm:py-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card sm:p-4 sm:rounded-2xl sm:border sm:border-border sm:shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-foreground">{assessment.title}</h1>
            <p className="text-sm font-medium text-muted-foreground">{assessment.subject?.name || assessment.subject || 'Unknown Subject'} • {assessment.total_marks} Marks</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <span className="font-bold text-sm">{answeredCount} / {assessment.questions.length} Answered</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${timeLeft < 300 ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-muted text-foreground'}`}>
              <Clock size={18} />
              <span className="font-mono text-lg tracking-wider">{formatTime(timeLeft)}</span>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1.5 bg-slate-200 w-full mt-4 sm:rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500/100 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Question Area */}
        <div className="lg:col-span-3 space-y-6">
          <motion.div 
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-lg">
                  {currentQuestionIndex + 1}
                </span>
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Question {currentQuestionIndex + 1} of {assessment.questions.length}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-sm font-bold">
                  {currentQuestion.marks} Marks
                </span>
                <button 
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={`p-2 rounded-lg transition-colors ${flagged[currentQuestion.id] ? 'bg-amber-100 text-amber-500' : 'text-muted-foreground hover:bg-muted'}`}
                  title="Flag for review"
                >
                  <Flag size={20} className={flagged[currentQuestion.id] ? 'fill-current' : ''} />
                </button>
              </div>
            </div>

            <div className="text-xl font-medium text-foreground mb-8 leading-relaxed">
              <RichTextRenderer text={currentQuestion.text} />
            </div>

            <div className="space-y-4">
              {currentQuestion.type === 'multiple_choice' ? (
                currentQuestion.options?.map((opt: string, idx: number) => (
                  <label 
                    key={idx} 
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[currentQuestion.id] === idx.toString() ? 'border-primary bg-primary/10/50' : 'border-border bg-card hover:border-border'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers[currentQuestion.id] === idx.toString() ? 'border-primary' : 'border-border'}`}>
                      {answers[currentQuestion.id] === idx.toString() && <div className="w-3 h-3 bg-primary rounded-full" />}
                    </div>
                    <span className={`text-lg ${answers[currentQuestion.id] === idx.toString() ? 'text-indigo-900 font-medium' : 'text-foreground'}`}>
                      <RichTextRenderer text={opt} />
                    </span>
                    <input 
                      type="radio" 
                      className="hidden" 
                      name={`q-${currentQuestion.id}`}
                      checked={answers[currentQuestion.id] === idx.toString()}
                      onChange={() => handleAnswerChange(currentQuestion.id, idx.toString(), currentQuestion.type)}
                    />
                  </label>
                ))
              ) : currentQuestion.type === 'true_false' ? (
                [ { label: 'True', val: 'true' }, { label: 'False', val: 'false' } ].map((opt, idx) => (
                  <label 
                    key={idx} 
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[currentQuestion.id] === opt.val ? 'border-primary bg-primary/10/50' : 'border-border bg-card hover:border-border'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers[currentQuestion.id] === opt.val ? 'border-primary' : 'border-border'}`}>
                      {answers[currentQuestion.id] === opt.val && <div className="w-3 h-3 bg-primary rounded-full" />}
                    </div>
                    <span className={`text-lg ${answers[currentQuestion.id] === opt.val ? 'text-indigo-900 font-medium' : 'text-foreground'}`}>
                      {opt.label}
                    </span>
                    <input 
                      type="radio" 
                      className="hidden" 
                      name={`q-${currentQuestion.id}`}
                      checked={answers[currentQuestion.id] === opt.val}
                      onChange={() => handleAnswerChange(currentQuestion.id, opt.val, currentQuestion.type)}
                    />
                  </label>
                ))
              ) : currentQuestion.type === 'multiple_response' ? (
                currentQuestion.options?.map((opt: string, idx: number) => (
                  <label 
                    key={idx} 
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[currentQuestion.id]?.includes(idx.toString()) ? 'border-primary bg-primary/10/50' : 'border-border bg-card hover:border-border'}`}
                  >
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${answers[currentQuestion.id]?.includes(idx.toString()) ? 'border-primary bg-primary' : 'border-border'}`}>
                      {answers[currentQuestion.id]?.includes(idx.toString()) && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                    <span className={`text-lg ${answers[currentQuestion.id]?.includes(idx.toString()) ? 'text-indigo-900 font-medium' : 'text-foreground'}`}>
                      <RichTextRenderer text={opt} />
                    </span>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={answers[currentQuestion.id]?.includes(idx.toString())}
                      onChange={() => handleAnswerChange(currentQuestion.id, idx.toString(), currentQuestion.type)}
                    />
                  </label>
                ))
              ) : (
                <textarea 
                  placeholder="Type your answer here..."
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, currentQuestion.type)}
                  className="w-full p-4 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary min-h-[200px] resize-y text-lg"
                />
              )}
            </div>
          </motion.div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={isFirstQuestion}
              className="px-6 py-3 bg-card border border-border text-foreground rounded-xl font-bold hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <ChevronLeft size={20} />
              Previous
            </button>
            <button 
              onClick={() => setCurrentQuestionIndex(prev => Math.min(assessment.questions.length - 1, prev + 1))}
              disabled={isLastQuestion}
              className="px-6 py-3 bg-card border border-border text-foreground rounded-xl font-bold hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="hidden lg:block">
          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sticky top-24">
            <h3 className="font-bold text-foreground mb-4">Question Navigator</h3>
            <div className="grid grid-cols-4 gap-2">
              {assessment.questions.map((q: any, idx: number) => {
                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                const isCurrent = currentQuestionIndex === idx;
                const isFlagged = flagged[q.id];
                
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`
                      relative w-full aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all
                      ${isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}
                      ${isAnswered ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground hover:bg-slate-200'}
                    `}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500/100 rounded-full border-2 border-white" />
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6 space-y-3 pt-6 border-t border-border">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-4 h-4 rounded-md bg-emerald-500/20" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-4 h-4 rounded-md bg-muted" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-4 h-4 rounded-full bg-amber-500/100 border-2 border-white" />
                <span>Flagged for review</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    
      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-background rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mx-auto mb-4">
                <CheckCircle2 className="text-emerald-500" size={24} />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">Submit Assessment?</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Are you sure you want to submit your assessment? You cannot change your answers after submitting.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    handleAutoSubmit();
                  }}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-emerald-500 text-white font-bold text-sm rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Submit
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );

}