'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2,
  Settings,
  ListChecks,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

const GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
const SUBJECTS = ['Mathematics', 'English', 'Science', 'History', 'Geography', 'Art', 'Physical Education', 'Music', 'Computer Science'];

export default function CreateExamPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Exam Details
  const [examDetails, setExamDetails] = useState({
    title: '',
    subject: SUBJECTS[0],
    grade: GRADES[0],
    date: '',
    duration: 60,
    totalMarks: 100,
  });

  // Questions
  const [questions, setQuestions] = useState([
    { id: 'q1', type: 'multiple_choice', text: '', options: ['', '', '', ''], correctAnswer: 0, marks: 5 }
  ]);

  if (!user || user.role === 'student' || user.role === 'parent') {
    return null; // Should redirect or show unauthorized
  }

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { id: `q${Date.now()}`, type: 'multiple_choice', text: '', options: ['', '', '', ''], correctAnswer: 0, marks: 5 }
    ]);
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const handleQuestionChange = (id: string, field: string, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleOptionChange = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      router.push('/dashboard/exams');
    }, 1500);
  };

  const totalMarksCalculated = questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/exams" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Exam</h1>
            <p className="text-slate-500 text-sm font-medium">Configure exam details and add questions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/dashboard/exams')}
            className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || !examDetails.title || !examDetails.date}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {isSaving ? 'Saving...' : 'Save Exam'}
          </button>
        </div>
      </div>

      {/* Steps Navigation */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <button 
          onClick={() => setCurrentStep(1)}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${currentStep === 1 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Settings size={18} />
          1. Exam Settings
        </button>
        <button 
          onClick={() => setCurrentStep(2)}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${currentStep === 2 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <ListChecks size={18} />
          2. Questions ({questions.length})
        </button>
      </div>

      {/* Step 1: Settings */}
      {currentStep === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Exam Title</label>
              <input 
                type="text" 
                placeholder="e.g. Mid-Term Mathematics"
                value={examDetails.title}
                onChange={(e) => setExamDetails({...examDetails, title: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                <select 
                  value={examDetails.subject}
                  onChange={(e) => setExamDetails({...examDetails, subject: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Target Grade</label>
                <select 
                  value={examDetails.grade}
                  onChange={(e) => setExamDetails({...examDetails, grade: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                <input 
                  type="date" 
                  value={examDetails.date}
                  onChange={(e) => setExamDetails({...examDetails, date: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Duration (Minutes)</label>
                <input 
                  type="number" 
                  min="10"
                  value={examDetails.duration}
                  onChange={(e) => setExamDetails({...examDetails, duration: parseInt(e.target.value) || 60})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Total Marks</label>
                <div className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium">
                  {totalMarksCalculated} (Auto-calculated)
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              Continue to Questions
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 2: Questions */}
      {currentStep === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-indigo-800">
              <CheckCircle2 size={20} className="text-indigo-600" />
              <span className="font-bold">Total Marks: {totalMarksCalculated}</span>
            </div>
            <button 
              onClick={handleAddQuestion}
              className="px-4 py-2 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm flex items-center gap-2 border border-indigo-200"
            >
              <Plus size={16} />
              Add Question
            </button>
          </div>

          <div className="space-y-6">
            {questions.map((q, index) => (
              <div key={q.id} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-6 relative group">
                <button 
                  onClick={() => handleRemoveQuestion(q.id)}
                  disabled={questions.length === 1}
                  className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 size={18} />
                </button>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <h3 className="font-bold text-slate-900">Question Details</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Question Text</label>
                    <textarea 
                      placeholder="Enter your question here..."
                      value={q.text}
                      onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[100px] resize-y"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Question Type</label>
                      <select 
                        value={q.type}
                        onChange={(e) => handleQuestionChange(q.id, 'type', e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True / False</option>
                        <option value="short_answer">Short Answer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Marks</label>
                      <input 
                        type="number" 
                        min="1"
                        value={q.marks}
                        onChange={(e) => handleQuestionChange(q.id, 'marks', parseInt(e.target.value) || 1)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {q.type === 'multiple_choice' && (
                    <div className="pt-4 border-t border-slate-100">
                      <label className="block text-sm font-bold text-slate-700 mb-3">Options & Correct Answer</label>
                      <div className="space-y-3">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              name={`correct-${q.id}`}
                              checked={q.correctAnswer === optIdx}
                              onChange={() => handleQuestionChange(q.id, 'correctAnswer', optIdx)}
                              className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                            />
                            <input 
                              type="text" 
                              placeholder={`Option ${optIdx + 1}`}
                              value={opt}
                              onChange={(e) => handleOptionChange(q.id, optIdx, e.target.value)}
                              className={`flex-1 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${q.correctAnswer === optIdx ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.type === 'true_false' && (
                    <div className="pt-4 border-t border-slate-100">
                      <label className="block text-sm font-bold text-slate-700 mb-3">Correct Answer</label>
                      <div className="flex gap-4">
                        <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-colors ${q.correctAnswer === 0 ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                          <input 
                            type="radio" 
                            name={`correct-${q.id}`}
                            checked={q.correctAnswer === 0}
                            onChange={() => handleQuestionChange(q.id, 'correctAnswer', 0)}
                            className="hidden"
                          />
                          True
                        </label>
                        <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-colors ${q.correctAnswer === 1 ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                          <input 
                            type="radio" 
                            name={`correct-${q.id}`}
                            checked={q.correctAnswer === 1}
                            onChange={() => handleQuestionChange(q.id, 'correctAnswer', 1)}
                            className="hidden"
                          />
                          False
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-center pt-4">
            <button 
              onClick={handleAddQuestion}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Add Another Question
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
