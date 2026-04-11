'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Flag
} from 'lucide-react';

// Mock Exam Data
const MOCK_EXAM = {
  id: 'e2',
  title: 'Science Quiz: Ecosystems',
  subject: 'Science',
  duration: 30, // minutes
  totalMarks: 50,
  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      text: 'Which of the following is a primary consumer?',
      options: ['Lion', 'Grasshopper', 'Eagle', 'Snake'],
      marks: 10
    },
    {
      id: 'q2',
      type: 'true_false',
      text: 'Decomposers break down dead organic matter.',
      options: ['True', 'False'],
      marks: 10
    },
    {
      id: 'q3',
      type: 'multiple_choice',
      text: 'What is the main source of energy for almost all ecosystems?',
      options: ['Water', 'Soil', 'The Sun', 'Wind'],
      marks: 15
    },
    {
      id: 'q4',
      type: 'short_answer',
      text: 'Briefly explain the role of producers in an ecosystem.',
      marks: 15
    }
  ]
};

export default function TakeExamPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(MOCK_EXAM.duration * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

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
    if (window.confirm(t('submit_exam_confirm'))) {
      handleAutoSubmit();
    }
  };

  if (isFinished) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto mt-12 text-center space-y-6">
        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="text-3xl font-bold text-foreground">{t('exam_submitted_success')}</h1>
        <p className="text-muted-foreground text-lg">{t('exam_submitted_desc')}</p>
        <div className="pt-8">
          <button 
            onClick={() => router.push('/dashboard/exams')}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm"
          >
            {t('return_to_dashboard')}
          </button>
        </div>
      </motion.div>
    );
  }

  const currentQuestion = MOCK_EXAM.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === MOCK_EXAM.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / MOCK_EXAM.questions.length) * 100;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border py-4 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none sm:border-none sm:py-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card sm:p-4 sm:rounded-2xl sm:border sm:border-border sm:shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-foreground">{MOCK_EXAM.title}</h1>
            <p className="text-sm font-medium text-muted-foreground">{MOCK_EXAM.subject} • {MOCK_EXAM.totalMarks} {t('marks')}</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <span className="font-bold text-sm">{answeredCount} / {MOCK_EXAM.questions.length} {t('answered')}</span>
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
              {isSubmitting ? t('submitting') : t('submit_exam')}
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
                  {t('question_label')} {currentQuestionIndex + 1} {t('of_label')} {MOCK_EXAM.questions.length}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-sm font-bold">
                  {currentQuestion.marks} {t('marks')}
                </span>
                <button 
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={`p-2 rounded-lg transition-colors ${flagged[currentQuestion.id] ? 'bg-amber-100 text-amber-500' : 'text-muted-foreground hover:bg-muted'}`}
                  title={t('flag_for_review')}
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
                  placeholder={t('type_answer_placeholder')}
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
              <ChevronLeft size={20} className="rtl:rotate-180" />
              {t('previous')}
            </button>
            <button 
              onClick={() => setCurrentQuestionIndex(prev => Math.min(MOCK_EXAM.questions.length - 1, prev + 1))}
              disabled={isLastQuestion}
              className="px-6 py-3 bg-card border border-border text-foreground rounded-xl font-bold hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {t('next')}
              <ChevronRight size={20} className="rtl:rotate-180" />
            </button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="hidden lg:block">
          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sticky top-24">
            <h3 className="font-bold text-foreground mb-4">{t('question_navigator')}</h3>
            <div className="grid grid-cols-4 gap-2">
              {MOCK_EXAM.questions.map((q, idx) => {
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
                <span>{t('answered')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-4 h-4 rounded-md bg-muted" />
                <span>{t('unanswered')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-4 h-4 rounded-full bg-amber-500/100 border-2 border-white" />
                <span>{t('flag_for_review')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
