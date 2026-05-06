'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Search, Filter, FileText, ChevronRight, User, BookOpen, Calculator, Save, Link as LinkIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { getPaginatedStudents, getClasses, getSubjects, getPaginatedAssessments } from '@/lib/supabase-db';

export function GradeCardsTab() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTerm, setActiveTerm] = useState('Term 1');

  const { data: studentsData, mutate: mutateStudents } = useSWR(
    ['grade-students', 1, 100, searchQuery, selectedGrade],
    () => getPaginatedStudents(1, 100, searchQuery, undefined, false)
  );

  const { data: classesData } = useSWR('classes', () => getClasses());
  const { data: subjectsData } = useSWR('subjects', () => getSubjects());
  const { data: assessmentsData } = useSWR('assessments', () => getPaginatedAssessments(1, 200));

  const students = studentsData?.data || [];
  const classes = classesData || [];
  const subjects = subjectsData || [];
  const assessments = assessmentsData?.data || [];

  const [studentGrades, setStudentGrades] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch grades for selected student
  const fetchStudentGrades = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', studentId)
        .eq('term', activeTerm);
      
      if (error) {
        if (error.code === 'PGRST204') return []; // Table doesn't exist yet handled
        throw error;
      }
      return data || [];
    } catch (err) {
      console.warn('Grades table might not exist or error fetching:', err);
      return [];
    }
  };

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    const existingGrades = await fetchStudentGrades(student.id);
    
    // Pre-populate with all subjects
    const initialGrades = subjects.map(sub => {
      const existing = existingGrades.find((g: any) => g.subject_id === sub.id);
      return {
        subject_id: sub.id,
        subject_name: sub.name,
        marks: existing?.score || existing?.marks || '',
        max_marks: existing?.max_score || existing?.max_marks || 100,
        linked_assessment_id: existing?.assessment_id || existing?.linked_assessment_id || '',
        remarks: existing?.remarks || ''
      };
    });
    
    setStudentGrades(initialGrades);
    setIsEditing(true);
  };

  const handleSaveGrades = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      const payload = studentGrades
        .filter(g => g.marks !== '')
        .map(g => ({
          student_id: selectedStudent.id,
          subject_id: g.subject_id,
          academic_year: selectedStudent.academic_year || '2025-2026',
          term: activeTerm,
          score: parseFloat(g.marks),
          score_max: parseFloat(g.max_marks),
          assessment_id: g.linked_assessment_id || null,
          remarks: g.remarks || '',
          graded_by: (await supabase.auth.getUser()).data.user?.id
        }));

      if (payload.length === 0) {
        toast.error("Please enter at least one grade");
        return;
      }

      const { error } = await supabase
        .from('grades')
        .upsert(payload, { onConflict: 'student_id, subject_id, academic_year, term' });

      if (error) throw error;

      toast.success("Grade card saved successfully");
      setIsEditing(false);
      setSelectedStudent(null);
    } catch (error: any) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    let list = students;
    if (selectedGrade) {
      list = list.filter(s => s.grade === selectedGrade);
    }
    return list;
  }, [students, selectedGrade]);

  const terms = ['Term 1', 'Term 2', 'Term 3', 'Final'];

  return (
    <div className="flex flex-col h-full gap-6">
      {!isEditing ? (
        <>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder={t('search_students') || 'Search students...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none appearance-none font-medium"
                >
                  <option value="">{t('all_grades') || 'All Grades'}</option>
                  {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
            {filteredStudents.map((student) => (
              <motion.div
                key={student.id}
                whileHover={{ y: -4 }}
                onClick={() => handleSelectStudent(student)}
                className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:shadow-xl hover:shadow-primary/5 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <User size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">{student.name}</h3>
                    <p className="text-xs text-muted-foreground font-medium">{student.grade} • ID: {student.rollNumber || student.roll_number}</p>
                  </div>
                  <button className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-card/50 border border-dashed border-border rounded-3xl">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
                <FileText size={32} />
              </div>
              <h3 className="text-xl font-bold text-foreground">No students found</h3>
              <p className="text-muted-foreground max-w-xs mt-2">Adjust your filters or search to find students for grading.</p>
            </div>
          )}
        </>
      ) : (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col h-full bg-card border border-border rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsEditing(false)}
                className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors font-bold"
              >
                <ChevronRight className="rotate-180" size={20} />
              </button>
              <div>
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">{selectedStudent.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md uppercase tracking-wide">{selectedStudent.grade}</span>
                  <span className="text-xs font-bold text-muted-foreground">ID: {selectedStudent.rollNumber || selectedStudent.roll_number}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-xl">
              {terms.map(term => (
                <button
                  key={term}
                  onClick={() => setActiveTerm(term)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeTerm === term ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {studentGrades.map((grade, idx) => (
                <div key={grade.subject_id} className="p-5 border border-border rounded-2xl bg-card/50 hover:bg-card transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                          <BookOpen size={20} />
                        </div>
                        <span className="font-bold text-foreground">{grade.subject_name}</span>
                      </div>
                    </div>

                    <div className="md:col-span-3 flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          placeholder="Score"
                          value={grade.marks}
                          onChange={(e) => {
                            const newGrades = [...studentGrades];
                            newGrades[idx].marks = e.target.value;
                            setStudentGrades(newGrades);
                          }}
                          className="w-full pl-4 pr-12 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-primary"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">/ {grade.max_marks}</span>
                      </div>
                    </div>

                    <div className="md:col-span-4">
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <select
                          value={grade.linked_assessment_id}
                          onChange={(e) => {
                            const newGrades = [...studentGrades];
                            newGrades[idx].linked_assessment_id = e.target.value;
                            // Optionally auto-fetch marks if assessment is chosen
                            const assessment = assessments.find(a => a.id === e.target.value);
                            if (assessment) {
                              // In a real app we'd fetch the student's submission score here
                            }
                            setStudentGrades(newGrades);
                          }}
                          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none appearance-none text-xs font-medium text-muted-foreground"
                        >
                          <option value="">Link Assessment (Optional)</option>
                          {assessments
                            .filter(a => (a.subject_id === grade.subject_id || a.subject === grade.subject_name) && (a.class_id === selectedStudent.grade || a.grade === selectedStudent.grade))
                            .map(a => <option key={a.id} value={a.id}>{a.title} ({a.type})</option>)
                          }
                        </select>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className={`flex items-center gap-2 justify-end ${grade.marks !== '' ? 'text-emerald-500' : 'text-muted-foreground/30'}`}>
                        {grade.marks !== '' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <span className="text-xs font-bold">{grade.marks !== '' ? 'Ready' : 'Pending'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-border bg-muted/10 flex justify-between items-center">
            <p className="text-sm text-muted-foreground font-medium italic">
              * Based on these grades, students will be cleared for promotion under the Promotions tab.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 rounded-xl border border-border bg-card text-foreground font-bold hover:bg-muted transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGrades}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                Save Grade Card
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const Loader2 = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
