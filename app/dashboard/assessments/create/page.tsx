'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { getSubjects, getClasses, createAssessment, getActiveAcademicYear } from '@/lib/supabase-db';
import RichTextRenderer from '@/components/dashboard/RichTextRenderer';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2,
  Settings,
  ListChecks,
  CheckCircle2,
  Upload
} from 'lucide-react';
import Link from 'next/link';

export default function CreateAssessmentPage() {
  const { user } = useAuth();
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

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkFormat, setBulkFormat] = useState<'json' | 'csv'>('json');

  const parseCSV = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error('CSV must contain headers and at least one row.');

    // Simple robust CSV parser that handles quotes and commas
    const parseCSVLine = (line: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      // strip enclosing double quotes if they exist
      return result.map(val => val.replace(/^"|"$/g, ''));
    };

    const headers = parseCSVLine(lines[0]);
    const questionsList = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      if (vals.length < headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h.toLowerCase().trim()] = vals[idx] || '';
      });

      const qText = row.text || row.question || '';
      const qType = row.type || 'multiple_choice';
      const qOptionsRaw = row.options || '';
      const qCorrect = row.correct_answer || row.correct || '0';
      const qMarks = parseInt(row.marks || row.points || '5') || 5;

      const qOptions = qOptionsRaw 
        ? qOptionsRaw.split('|').map(o => o.trim()) 
        : (qType === 'true_false' ? ['True', 'False'] : ['Option 1', 'Option 2', 'Option 3', 'Option 4']);

      const qId = `q${Math.random().toString(36).substring(2, 9)}`;
      
      questionsList.push({
        id: qId,
        type: qType as any,
        text: qText,
        options: qOptions,
        correct_answer: qCorrect,
        correct_answers: qCorrect.split(',').map(c => c.trim()),
        marks: qMarks
      });
    }

    return questionsList;
  };

  const parseJSON = (text: string) => {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('JSON format must be an array of questions.');

    return parsed.map((item: any) => {
      const qId = `q${Math.random().toString(36).substring(2, 9)}`;
      const qType = item.type || 'multiple_choice';
      return {
        id: qId,
        type: qType,
        text: item.text || item.question || '',
        options: item.options || (qType === 'true_false' ? ['True', 'False'] : ['Option 1', 'Option 2', 'Option 3', 'Option 4']),
        correct_answer: String(item.correct_answer !== undefined ? item.correct_answer : '0'),
        correct_answers: Array.isArray(item.correct_answers) 
          ? item.correct_answers.map(String) 
          : [String(item.correct_answer || '0')],
        marks: parseInt(item.marks || item.points || '5') || 5
      };
    });
  };

  const handleProcessBulkImport = () => {
    if (!bulkInput.trim()) {
      toast.error('Please paste data or select a template file first!');
      return;
    }

    try {
      let imported: any[] = [];
      if (bulkFormat === 'json') {
        imported = parseJSON(bulkInput);
      } else {
        imported = parseCSV(bulkInput);
      }

      if (imported.length === 0) {
        toast.error('No valid questions found to import.');
        return;
      }

      // If we only have the single initial empty question, replace it
      const hasOnlyDefault = questions.length === 1 && questions[0].text === '' && questions[0].options.every(o => o === '');
      
      if (hasOnlyDefault) {
        setQuestions(imported);
      } else {
        setQuestions([...questions, ...imported]);
      }

      toast.success(`Successfully imported ${imported.length} question(s)!`);
      setBulkInput('');
      setShowBulkImport(false);
    } catch (err: any) {
      console.error('Bulk Import parsing error:', err);
      toast.error(`Import parsing failed: ${err?.message || 'Please check structure / fields'}`);
    }
  };

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
    
    // Validate that date falls within the active academic year
    if (examDetails.date) {
      if (examDetails.date < activeAcademicYear.start_date || examDetails.date > activeAcademicYear.end_date) {
        toast.error(`Assessment date must fall within the active academic year (${activeAcademicYear.name}): from ${activeAcademicYear.start_date} to ${activeAcademicYear.end_date}`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const descriptionWithCreator = examDetails.description + (examDetails.description ? '\n\n' : '') + `[CreatedBy: ${user?.id}]`;

      await createAssessment({
        title: examDetails.title,
        subject: examDetails.subject,
        grade: examDetails.grade,
        due_date: examDetails.date,
        duration: examDetails.duration,
        total_marks: totalMarksCalculated,
        type: examDetails.type,
        description: descriptionWithCreator,
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
      toast.success('Assessment created successfully');
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
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Create New Assessment</h1>
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
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3 text-primary">
              <CheckCircle2 size={20} className="text-primary" />
              <span className="font-bold">Total Marks: {totalMarksCalculated}</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowBulkImport(!showBulkImport)}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors shadow-sm flex items-center gap-2 border border-indigo-200"
              >
                <Upload size={16} />
                Bulk Import (CSV/JSON)
              </button>
              <button 
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-card text-primary rounded-xl font-bold text-sm hover:bg-primary/10 transition-colors shadow-sm flex items-center gap-2 border border-primary/20"
              >
                <Plus size={16} />
                Add Question
              </button>
            </div>
          </div>

          {showBulkImport && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Upload size={18} className="text-indigo-600" />
                  Bulk Import Questions
                </h3>
                <div className="flex items-center gap-2 bg-muted p-1 rounded-xl text-xs">
                  <button 
                    onClick={() => setBulkFormat('json')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${bulkFormat === 'json' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    JSON Format
                  </button>
                  <button 
                    onClick={() => setBulkFormat('csv')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${bulkFormat === 'csv' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    CSV Format
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-3 text-muted-foreground font-medium bg-muted/40 p-4 rounded-xl border border-border">
                  <p className="font-bold text-foreground">Required Template format:</p>
                  {bulkFormat === 'json' ? (
                    <pre className="p-2.5 bg-muted rounded-lg font-mono text-[10px] overflow-x-auto text-foreground max-h-36">
{`[
  {
    "text": "Solve: \\\\frac{dy}{dx} of x^2",
    "type": "multiple_choice",
    "options": ["x", "2x", "0"],
    "correct_answer": "1",
    "marks": 5
  }
]`}
                    </pre>
                  ) : (
                    <pre className="p-2.5 bg-muted rounded-lg font-mono text-[10px] overflow-x-auto text-foreground max-h-36">
{`text,type,options,correct_answer,marks
"Determine \\\\lim_{x \\to 0} \\\\frac{\\\\sin x}{x}","multiple_choice","0|1|Infinity","1",4
"True or False: \\\\int e^x dx = e^x + C","true_false","True|False","0",2`}
                    </pre>
                  )}
                  <ul className="list-disc pl-4 space-y-0.5 text-[10px] leading-relaxed">
                    <li><b>type:</b> multiple_choice, true_false, multiple_response, short_answer</li>
                    <li><b>options:</b> Separate list items using &apos;|&apos; (e.g. choice1|choice2|choice3)</li>
                    <li><b>correct_answer:</b> 0-indexed choice position number (e.g. 0 represents the first of options)</li>
                  </ul>
                </div>

                <div className="space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <label className="block font-bold text-foreground">Paste Data or Drag-and-Drop file below</label>
                    <textarea
                      placeholder={bulkFormat === 'json' ? 'Paste raw questions JSON array here...' : 'Paste CSV text rows here...'}
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      className="w-full p-3 bg-muted border border-border rounded-xl font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary min-h-[120px] resize-y"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer bg-muted hover:bg-muted/80 p-2 border border-dashed border-border rounded-xl flex items-center justify-center gap-2 font-bold text-muted-foreground hover:text-foreground text-center transition-all select-none">
                      <Upload size={14} />
                      <span>Upload File (.json, .csv)</span>
                      <input
                        type="file"
                        accept=".json,.csv,.txt"
                        onClick={(e) => {
                          (e.target as HTMLInputElement).value = '';
                        }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const content = evt.target?.result as string;
                            setBulkInput(content || '');
                            if (file.name.endsWith('.json')) {
                              setBulkFormat('json');
                            } else if (file.name.endsWith('.csv')) {
                              setBulkFormat('csv');
                            }
                          };
                          reader.readAsText(file);
                        }}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handleProcessBulkImport}
                      className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-colors shadow-sm shrink-0"
                    >
                      Insert Questions
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

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
                    {q.text && (
                      <div className="mt-2 p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                        <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mb-1">Live Math & LaTeX Preview</p>
                        <div className="text-foreground text-sm font-medium">
                          <RichTextRenderer text={q.text} />
                        </div>
                      </div>
                    )}
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
          
          <div className="flex justify-between items-center pt-8 border-t border-border mt-8">
            <button 
              onClick={handleAddQuestion}
              className="px-6 py-3 bg-muted text-foreground rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Add Another Question
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving || !examDetails.title || !examDetails.date || questions.length === 0 || questions.some(q => !q.text.trim())}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={20} />
              )}
              {isSaving ? 'Saving...' : 'Save Assessment'}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
