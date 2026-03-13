'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
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
    if (window.confirm('Are you sure you want to submit your exam? You cannot change your answers after submitting.')) {
      handleAutoSubmit();
    }
  };

  if (isFinished) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto mt-12 text-center space-y-6">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Exam Submitted Successfully!</h1>
        <p className="text-slate-500 text-lg">Your answers have been recorded. You can view your results once the teacher publishes them.</p>
        <div className="pt-8">
          <button 
            onClick={() => router.push('/dashboard/exams')}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Return to Dashboard
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
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 py-4 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none sm:border-none sm:py-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white sm:p-4 sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{MOCK_EXAM.title}</h1>
            <p className="text-sm font-medium text-slate-500">{MOCK_EXAM.subject} • {MOCK_EXAM.totalMarks} Marks</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-600">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <span className="font-bold text-sm">{answeredCount} / {MOCK_EXAM.questions.length} Answered</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
              <Clock size={18} />
              <span className="font-mono text-lg tracking-wider">{formatTime(timeLeft)}</span>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1.5 bg-slate-200 w-full mt-4 sm:rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300"
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
            className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-6 sm:p-8"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-bold text-lg">
                  {currentQuestionIndex + 1}
                </span>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Question {currentQuestionIndex + 1} of {MOCK_EXAM.questions.length}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">
                  {currentQuestion.marks} Marks
                </span>
                <button 
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={`p-2 rounded-lg transition-colors ${flagged[currentQuestion.id] ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:bg-slate-100'}`}
                  title="Flag for review"
                >
                  <Flag size={20} className={flagged[currentQuestion.id] ? 'fill-current' : ''} />
                </button>
              </div>
            </div>

            <h2 className="text-xl font-medium text-slate-900 mb-8 leading-relaxed">
              {currentQuestion.text}
            </h2>

            <div className="space-y-4">
              {currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false' ? (
                currentQuestion.options?.map((opt, idx) => (
                  <label 
                    key={idx} 
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[currentQuestion.id] === idx ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers[currentQuestion.id] === idx ? 'border-indigo-600' : 'border-slate-300'}`}>
                      {answers[currentQuestion.id] === idx && <div className="w-3 h-3 bg-indigo-600 rounded-full" />}
                    </div>
                    <span className={`text-lg ${answers[currentQuestion.id] === idx ? 'text-indigo-900 font-medium' : 'text-slate-700'}`}>
                      {opt}
                    </span>
                  </label>
                ))
              ) : (
                <textarea 
                  placeholder="Type your answer here..."
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[200px] resize-y text-lg"
                />
              )}
            </div>
          </motion.div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={isFirstQuestion}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <ChevronLeft size={20} />
              Previous
            </button>
            <button 
              onClick={() => setCurrentQuestionIndex(prev => Math.min(MOCK_EXAM.questions.length - 1, prev + 1))}
              disabled={isLastQuestion}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="hidden lg:block">
          <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-6 sticky top-24">
            <h3 className="font-bold text-slate-900 mb-4">Question Navigator</h3>
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
                      ${isAnswered ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
                    `}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6 space-y-3 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-4 h-4 rounded-md bg-emerald-100" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-4 h-4 rounded-md bg-slate-100" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white" />
                <span>Flagged for review</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
