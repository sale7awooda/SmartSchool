'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { getSubjects, getClasses, updateAssessment, getActiveAcademicYear, getAssessmentWithQuestions } from '@/lib/supabase-db';
import { toast } from 'sonner';
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

import { useParams } from 'next/navigation';
export default function EditAssessmentPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const { data: assessmentData, isLoading: initialSetupLoading } = useSWR(id ? `assessment_${id}`: null, () => getAssessmentWithQuestions(id));
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const { data: subjectsData } = useSWR('subjects', getSubjects);
  const { data: classesData } = useSWR('classes', getClasses);

  const subjectsList = subjectsData?.map(s => s.name) || ['Loading...'];
  const gradesList = classesData?.map(c => c.name) || ['Loading...'];

  // Exam Details
  const [examDetails, setExamDetails] = useState({
    title: '',
    subject: '',
    grade: '',
    date: '',
    duration: 60,
    type: 'exam' as 'homework' | 'project' | 'quiz' | 'essay' | 'exam',
    description: '',
  });

  // Set default subject and grade when data is loaded
  const [defaultsSet, setDefaultsSet] = useState(false);

  useEffect(() => {
    if (!defaultsSet && subjectsData && subjectsData.length > 0 && classesData && classesData.length > 0) {
      const timer = setTimeout(() => {
        setExamDetails(prev => ({
          ...prev,
          subject: prev.subject || subjectsData[0].name,
          grade: prev.grade || classesData[0].name
        }));
        setDefaultsSet(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [subjectsData, classesData, defaultsSet]);

  // Questions
  const [questions, setQuestions] = useState([
    { 
      id: 'q1', 
      type: 'multiple_choice' as 'multiple_choice' | 'true_false' | 'multiple_response' | 'short_answer', 
      text: '', 
      options: ['', '', '', ''], 
      correct_answer: '0', 
      correct_answers: [] as string[],
      marks: 5 
    }
  ]);

  if (!user || user.role === 'student' || user.role === 'parent') {
    return null; // Should redirect or show unauthorized
  }

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { 
        id: `q${Date.now()}`, 
        type: 'multiple_choice', 
        text: '', 
        options: ['', '', '', ''], 
        correct_answer: '0', 
        correct_answers: [],
        marks: 5 
      }
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

  const handleSave = async () => {
    if (!activeAcademicYear) {
      toast.error('Active academic year not found');
      return;
    }
    setIsSaving(true);
    try {
      await updateAssessment(id, {
        title: examDetails.title,
        subject: examDetails.subject,
        grade: examDetails.grade,
        due_date: examDetails.date,
        duration: examDetails.duration,
        total_marks: totalMarksCalculated,
        type: examDetails.type,
        description: examDetails.description,
        teacher_id: user?.id,
        status: 'upcoming',
        questions: questions.map(q => ({
          text: q.text,
          type: q.type,
          marks: q.marks,
          options: q.type === 'multiple_choice' || q.type === 'multiple_response' ? q.options : null,
          correct_answer: q.type === 'multiple_response' ? null : q.correct_answer,
          correct_answers: q.type === 'multiple_response' ? q.correct_answers : null
        }))
      });
      toast.success('Assessment updated successfully');
      router.push('/dashboard/assessments');
    } catch (error) {
      console.error('Error creating assessment:', error);
      toast.error('Failed to create assessment');
    } finally {
      setIsSaving(false);
    }
  };

  const totalMarksCalculated = questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/assessments" className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Edit Assessment</h1>
            <p className="text-muted-foreground text-sm font-medium">Configure assessment details and add questions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/dashboard/assessments')}
            className="px-4 py-2 text-muted-foreground font-bold text-sm hover:bg-muted rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || !examDetails.title || !examDetails.date}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {isSaving ? 'Saving...' : 'Save Assessment'}
          </button>
        </div>
      </div>

      {/* Steps Navigation */}
      <div className="flex items-center gap-2 bg-card p-2 rounded-2xl border border-border shadow-sm">
        <button 
          onClick={() => setCurrentStep(1)}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${currentStep === 1 ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
        >
          <Settings size={18} />
          1. Assessment Settings
        </button>
        <button 
          onClick={() => setCurrentStep(2)}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${currentStep === 2 ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
        >
          <ListChecks size={18} />
          2. Questions ({questions.length})
        </button>
      </div>

      {/* Step 1: Settings */}
      {currentStep === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 sm:p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Assessment Title</label>
              <input 
                type="text" 
                placeholder="e.g. Mid-Term Mathematics"
                value={examDetails.title}
                onChange={(e) => setExamDetails({...examDetails, title: e.target.value})}
                className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Subject</label>
                <select 
                  value={examDetails.subject}
                  onChange={(e) => setExamDetails({...examDetails, subject: e.target.value})}
                  className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                >
                  {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Target Grade</label>
                <select 
                  value={examDetails.grade}
                  onChange={(e) => setExamDetails({...examDetails, grade: e.target.value})}
                  className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                >
                  {gradesList.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Assessment Type</label>
                <select 
                  value={examDetails.type}
                  onChange={(e) => setExamDetails({...examDetails, type: e.target.value as any})}
                  className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                >
                  <option value="exam">Exam</option>
                  <option value="quiz">Quiz</option>
                  <option value="homework">Homework</option>
                  <option value="project">Project</option>
                  <option value="essay">Essay</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Date</label>
                <input 
                  type="date" 
                  value={examDetails.date}
                  onChange={(e) => setExamDetails({...examDetails, date: e.target.value})}
                  className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Duration (Minutes)</label>
                <input 
                  type="number" 
                  min="10"
                  value={examDetails.duration}
                  onChange={(e) => setExamDetails({...examDetails, duration: parseInt(e.target.value) || 60})}
                  className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Total Marks</label>
                <div className="w-full p-3 bg-muted border border-border rounded-xl text-muted-foreground font-medium">
                  {totalMarksCalculated} (Auto-calculated)
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Description</label>
              <textarea 
                placeholder="Enter assessment instructions or description..."
                value={examDetails.description}
                onChange={(e) => setExamDetails({...examDetails, description: e.target.value})}
                className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary min-h-[100px]"
              />
            </div>
          </div>
          
          <div className="pt-6 border-t border-border flex justify-end">
            <button 
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              Continue to Questions
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 2: Questions */}
      {currentStep === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-primary">
              <CheckCircle2 size={20} className="text-primary" />
              <span className="font-bold">Total Marks: {totalMarksCalculated}</span>
            </div>
            <button 
              onClick={handleAddQuestion}
              className="px-4 py-2 bg-card text-primary rounded-xl font-bold text-sm hover:bg-primary/10 transition-colors shadow-sm flex items-center gap-2 border border-primary/20"
            >
              <Plus size={16} />
              Add Question
            </button>
          </div>

          <div className="space-y-6">
            {questions.map((q, index) => (
              <div key={q.id} className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 relative group">
                <button 
                  onClick={() => handleRemoveQuestion(q.id)}
                  disabled={questions.length === 1}
                  className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-red-500 hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 size={18} />
                </button>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-muted text-muted-foreground rounded-lg flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <h3 className="font-bold text-foreground">Question Details</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Question Text</label>
                    <textarea 
                      placeholder="Enter your question here..."
                      value={q.text}
                      onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
                      className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary min-h-[100px] resize-y"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">Question Type</label>
                      <select 
                        value={q.type}
                        onChange={(e) => handleQuestionChange(q.id, 'type', e.target.value)}
                        className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True / False</option>
                        <option value="multiple_response">Multiple Response (Checkboxes)</option>
                        <option value="short_answer">Short Answer (Exact Match)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">Marks</label>
                      <input 
                        type="number" 
                        min="1"
                        value={q.marks}
                        onChange={(e) => handleQuestionChange(q.id, 'marks', parseInt(e.target.value) || 1)}
                        className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  {q.type === 'multiple_choice' && (
                    <div className="pt-4 border-t border-border">
                      <label className="block text-sm font-bold text-foreground mb-3">Options & Correct Answer</label>
                      <div className="space-y-3">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              name={`correct-${q.id}`}
                              checked={q.correct_answer === optIdx.toString()}
                              onChange={() => handleQuestionChange(q.id, 'correct_answer', optIdx.toString())}
                              className="w-5 h-5 text-primary focus:ring-indigo-500 border-border"
                            />
                            <input 
                              type="text" 
                              placeholder={`Option ${optIdx + 1}`}
                              value={opt}
                              onChange={(e) => handleOptionChange(q.id, optIdx, e.target.value)}
                              className={`flex-1 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary ${q.correct_answer === optIdx.toString() ? 'bg-primary/10/50 border-primary/20' : 'bg-muted border-border'}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.type === 'multiple_response' && (
                    <div className="pt-4 border-t border-border">
                      <label className="block text-sm font-bold text-foreground mb-3">Options & Correct Answers</label>
                      <div className="space-y-3">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              checked={q.correct_answers.includes(optIdx.toString())}
                              onChange={(e) => {
                                const newAnswers = e.target.checked 
                                  ? [...q.correct_answers, optIdx.toString()]
                                  : q.correct_answers.filter(a => a !== optIdx.toString());
                                handleQuestionChange(q.id, 'correct_answers', newAnswers);
                              }}
                              className="w-5 h-5 text-primary focus:ring-indigo-500 border-border rounded"
                            />
                            <input 
                              type="text" 
                              placeholder={`Option ${optIdx + 1}`}
                              value={opt}
                              onChange={(e) => handleOptionChange(q.id, optIdx, e.target.value)}
                              className={`flex-1 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary ${q.correct_answers.includes(optIdx.toString()) ? 'bg-primary/10/50 border-primary/20' : 'bg-muted border-border'}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.type === 'true_false' && (
                    <div className="pt-4 border-t border-border">
                      <label className="block text-sm font-bold text-foreground mb-3">Correct Answer</label>
                      <div className="flex gap-4">
                        <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-colors ${q.correct_answer === 'true' ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-muted border-border text-muted-foreground hover:bg-muted'}`}>
                          <input 
                            type="radio" 
                            name={`correct-${q.id}`}
                            checked={q.correct_answer === 'true'}
                            onChange={() => handleQuestionChange(q.id, 'correct_answer', 'true')}
                            className="hidden"
                          />
                          True
                        </label>
                        <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-colors ${q.correct_answer === 'false' ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-muted border-border text-muted-foreground hover:bg-muted'}`}>
                          <input 
                            type="radio" 
                            name={`correct-${q.id}`}
                            checked={q.correct_answer === 'false'}
                            onChange={() => handleQuestionChange(q.id, 'correct_answer', 'false')}
                            className="hidden"
                          />
                          False
                        </label>
                      </div>
                    </div>
                  )}

                  {q.type === 'short_answer' && (
                    <div className="pt-4 border-t border-border">
                      <label className="block text-sm font-bold text-foreground mb-2">Correct Answer (Exact Match)</label>
                      <input 
                        type="text" 
                        placeholder="Enter the exact correct answer..."
                        value={q.correct_answer}
                        onChange={(e) => handleQuestionChange(q.id, 'correct_answer', e.target.value)}
                        className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                      />
                      <p className="text-xs text-muted-foreground mt-2">Note: Student response must match this exactly (case-insensitive check can be implemented in the grading logic).</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-center pt-4">
            <button 
              onClick={handleAddQuestion}
              className="px-6 py-3 bg-muted text-foreground rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
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
