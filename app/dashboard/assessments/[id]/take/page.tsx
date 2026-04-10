'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getAssessmentWithQuestions } from '@/lib/supabase-db';
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
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (assessment?.duration && !initializedRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeft(assessment.duration * 60);
      initializedRef.current = true;
    }
  }, [assessment]);

  const handleAutoSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsFinished(true);
    }, 1500);
  };

  useEffect(() => {
    if (isFinished) return;

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
  }, [isFinished]);

  if (!user || user.role !== 'student') {
    return null; // Should redirect
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleFlag = (questionId: string) => {
    setFlagged(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleSubmit = () => {
    if (window.confirm('Are you sure you want to submit your assessment? You cannot change your answers after submitting.')) {
      handleAutoSubmit();
    }
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
            <p className="text-sm font-medium text-muted-foreground">{assessment.subject} • {assessment.total_marks} Marks</p>
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

            <h2 className="text-xl font-medium text-foreground mb-8 leading-relaxed">
              {currentQuestion.text}
            </h2>

            <div className="space-y-4">
              {currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false' ? (
                currentQuestion.options?.map((opt, idx) => (
                  <label 
                    key={idx} 
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[currentQuestion.id] === idx ? 'border-primary bg-primary/10/50' : 'border-border bg-card hover:border-border'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers[currentQuestion.id] === idx ? 'border-primary' : 'border-border'}`}>
                      {answers[currentQuestion.id] === idx && <div className="w-3 h-3 bg-primary rounded-full" />}
                    </div>
                    <span className={`text-lg ${answers[currentQuestion.id] === idx ? 'text-indigo-900 font-medium' : 'text-foreground'}`}>
                      {opt}
                    </span>
                  </label>
                ))
              ) : (
                <textarea 
                  placeholder="Type your answer here..."
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
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
    </div>
  );
}
