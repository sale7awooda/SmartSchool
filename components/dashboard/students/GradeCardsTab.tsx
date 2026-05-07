'use client';

import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { Search, Filter, FileText, ChevronRight, User, BookOpen, Calculator, Save, Link as LinkIcon, CheckCircle2, AlertCircle, ArrowLeft, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { getPaginatedStudents, getClasses, getSubjects, getPaginatedAssessments } from '@/lib/supabase-db';
import { Skeleton } from '@/components/ui/skeleton';

export function GradeCardsTab() {
  const { t } = useLanguage();
  // View states: 'grades-grid' | 'class-view' | 'edit-student' | 'edit-subject'
  const [viewState, setViewState] = useState<'grades-grid' | 'class-view' | 'edit-student' | 'edit-subject'>('grades-grid');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [activeTerm, setActiveTerm] = useState('Term 1');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: classesData } = useSWR('classes', () => getClasses());
  const { data: subjectsData } = useSWR('subjects', () => getSubjects());
  const { data: assessmentsData } = useSWR('assessments', () => getPaginatedAssessments(1, 200));

  const { data: studentsData, isLoading: isStudentsLoading, mutate: mutateStudents } = useSWR(
    viewState !== 'grades-grid' && selectedGrade ? ['grade-students', page, debouncedSearch, selectedGrade] : null,
    () => getPaginatedStudents(page, limit, debouncedSearch, selectedGrade, false)
  );
  
  // For 'edit-subject' we might need all students in that class if pagination is small, 
  // but to keep it simple, we can let them grade page by page or fetch more.
  // The requirement says "the system will show all of them and let him enter the values in a series".
  const { data: allStudentsData } = useSWR(
    viewState === 'edit-subject' && selectedGrade ? ['all-grade-students', selectedGrade] : null,
    () => getPaginatedStudents(1, 200, '', selectedGrade, false)
  );

  const classes = useMemo(() => classesData || [], [classesData]);
  const subjects = useMemo(() => subjectsData || [], [subjectsData]);
  const assessments = useMemo(() => assessmentsData?.data || [], [assessmentsData?.data]);
  const students = useMemo(() => studentsData?.data || [], [studentsData?.data]);
  const totalPages = studentsData?.totalPages || 1;
  const totalCount = studentsData?.count || 0;
  
  const allStudentsInGrade = useMemo(() => allStudentsData?.data || [], [allStudentsData?.data]);

  const [studentGrades, setStudentGrades] = useState<any[]>([]); // For single student
  const [subjectGrades, setSubjectGrades] = useState<any[]>([]); // For single subject, multiple students
  const [isSaving, setIsSaving] = useState(false);
  const [subTab, setSubTab] = useState<'by-student' | 'by-subject'>('by-student');

  // Fetch grades for selected student
  const fetchStudentGrades = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', studentId)
        .eq('term', activeTerm);
      
      if (error && error.code !== 'PGRST204') throw error;
      return data || [];
    } catch (err) {
      console.warn('Grades table fetch error:', err);
      return [];
    }
  };

  // Fetch grades for a specific subject for a whole class
  const fetchSubjectGrades = async (classGrade: string, subjectId: string) => {
    try {
      // First we need all students in the class
      // allStudentsInGrade has this
      const studentIds = allStudentsInGrade.map(s => s.id);
      if (studentIds.length === 0) return [];

      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .in('student_id', studentIds)
        .eq('subject_id', subjectId)
        .eq('term', activeTerm);
      
      if (error && error.code !== 'PGRST204') throw error;
      return data || [];
    } catch (err) {
      console.warn('Grades table fetch error:', err);
      return [];
    }
  };

  const handleSelectClass = (className: string) => {
    setSelectedGrade(className);
    setViewState('class-view');
    setPage(1);
    setSearchQuery('');
  };

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    const existingGrades = await fetchStudentGrades(student.id);
    
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
    setViewState('edit-student');
  };

  const handleSelectSubject = async (subject: any) => {
    setSelectedSubject(subject);
    setViewState('edit-subject');
    
    // Once we change state, SWR will fetch allStudentsData.
    // We should wait for that or use an effect. actually, let\'s fetch grades directly since allStudentsInGrade might be delayed
  };

  useEffect(() => {
    if (viewState === 'edit-subject' && selectedSubject && allStudentsInGrade.length > 0) {
      const load = async () => {
        const existingGrades = await fetchSubjectGrades(selectedGrade, selectedSubject.id);
        const initialGrades = allStudentsInGrade.map(student => {
          const existing = existingGrades.find((g: any) => g.student_id === student.id);
          return {
            student_id: student.id,
            student_name: student.name,
            roll_number: student.roll_number || student.rollNumber,
            marks: existing?.score || existing?.marks || '',
            max_marks: existing?.max_score || existing?.max_marks || 100,
            linked_assessment_id: existing?.assessment_id || existing?.linked_assessment_id || '',
            remarks: existing?.remarks || ''
          };
        });
        setSubjectGrades(initialGrades);
      };
      load();
    }
  }, [viewState, selectedSubject, allStudentsInGrade, activeTerm]);

  const handleSaveStudentGrades = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      const authUser = (await supabase.auth.getUser()).data.user?.id;
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
          graded_by: authUser
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
      setViewState('class-view');
      setSelectedStudent(null);
    } catch (error: any) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSubjectGrades = async () => {
    if (!selectedSubject) return;
    setIsSaving(true);
    try {
      const authUser = (await supabase.auth.getUser()).data.user?.id;
      const payload = subjectGrades
        .filter(g => g.marks !== '')
        .map(g => ({
          student_id: g.student_id,
          subject_id: selectedSubject.id,
          academic_year: '2025-2026', // Ideally from activeAcademicYear
          term: activeTerm,
          score: parseFloat(g.marks),
          score_max: parseFloat(g.max_marks),
          assessment_id: g.linked_assessment_id || null,
          remarks: g.remarks || '',
          graded_by: authUser
        }));

      if (payload.length === 0) {
        toast.error("Please enter at least one grade");
        return;
      }

      const { error } = await supabase
        .from('grades')
        .upsert(payload, { onConflict: 'student_id, subject_id, academic_year, term' });

      if (error) throw error;

      toast.success("Subject grades saved successfully");
      setViewState('class-view');
      setSelectedSubject(null);
    } catch (error: any) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const terms = ['Term 1', 'Term 2', 'Term 3', 'Final'];

  return (
    <div className="flex flex-col h-full gap-6">
      {viewState === 'grades-grid' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Classes / Grades</h2>
              <p className="text-sm text-muted-foreground mt-1">Select a class to enter grades for its students.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {classes.map((cls) => (
              <motion.button
                key={cls.id}
                whileHover={{ y: -4 }}
                onClick={() => handleSelectClass(cls.name)}
                className="bg-card border border-border rounded-2xl p-6 text-left hover:shadow-xl hover:shadow-primary/5 transition-all group flex flex-col justify-between h-32 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <GraduationCap size={20} />
                  </div>
                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{cls.name}</h3>
                </div>
                <div className="relative z-10 text-sm font-medium text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                  Open Register <ChevronRight size={16} />
                </div>
              </motion.button>
            ))}
            {classes.length === 0 && (
               <div className="col-span-full flex flex-col items-center justify-center p-12 bg-card/50 border border-dashed border-border rounded-3xl">
                <FileText size={32} className="text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold text-foreground">No classes found</h3>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {viewState === 'class-view' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 flex-1 flex flex-col">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-[1.5rem] border border-border shadow-sm shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setViewState('grades-grid')}
                className="h-10 w-10 shrink-0 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground hover:bg-background transition-colors"
               >
                 <ArrowLeft size={20} />
               </button>
               <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedGrade} Register</h2>
                  <p className="text-sm text-muted-foreground">Select a student or subject to enter grades.</p>
               </div>
            </div>
          </div>
          
          <div className="flex gap-2 border-b border-border pb-4 shrink-0">
            <button
               onClick={() => setSubTab('by-student')}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${subTab === 'by-student' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
            >
              By Student
            </button>
            <button
               onClick={() => setSubTab('by-subject')}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${subTab === 'by-subject' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
            >
              By Subject
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center shrink-0">
             <div className="relative w-full sm:w-72">
               <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
               <input
                 type="text"
                 placeholder={subTab === 'by-student' ? t('search_students') : "Search subjects..."}
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
               />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
               {subTab === 'by-student' ? (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-6 py-4 font-bold">Student</th>
                        <th className="px-6 py-4 font-bold">Roll Number</th>
                        <th className="px-6 py-4 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isStudentsLoading ? (
                        [1,2,3].map(i => (
                          <tr key={i} className="border-b border-border"><td className="p-4" colSpan={3}><Skeleton className="h-10 w-full" /></td></tr>
                        ))
                      ) : students.length === 0 ? (
                        <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No students found.</td></tr>
                      ) : (
                        students.map((student: any) => (
                           <tr key={student.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                             <td className="px-6 py-4 font-bold text-foreground">{student.name}</td>
                             <td className="px-6 py-4 text-muted-foreground">{student.roll_number}</td>
                             <td className="px-6 py-4 text-right">
                               <button onClick={() => handleSelectStudent(student)} className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors">Grade</button>
                             </td>
                           </tr>
                        ))
                      )}
                    </tbody>
                  </table>
               ) : (
                 <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-6 py-4 font-bold">Subject</th>
                        <th className="px-6 py-4 font-bold">Code</th>
                        <th className="px-6 py-4 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                       {subjects.filter(s => s.name.toLowerCase().includes(debouncedSearch.toLowerCase())).map((sub: any) => (
                           <tr key={sub.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                             <td className="px-6 py-4 font-bold text-foreground">{sub.name}</td>
                             <td className="px-6 py-4 text-muted-foreground">{sub.code || ''}</td>
                             <td className="px-6 py-4 text-right">
                               <button onClick={() => handleSelectSubject(sub)} className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors">Grade All</button>
                             </td>
                           </tr>
                        ))}
                    </tbody>
                 </table>
               )}
            </div>
          </div>

          {subTab === 'by-student' && totalPages > 0 && (
             <div className="flex items-center justify-between px-4 py-3 border border-border bg-card rounded-xl shrink-0">
               <button
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 disabled={page === 1}
                 className="px-4 py-2 text-sm font-bold text-foreground bg-muted border border-border rounded-lg disabled:opacity-50"
               >
                 Previous
               </button>
               <span className="text-sm font-medium text-muted-foreground">
                  Page {page} of {totalPages}
               </span>
               <button
                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                 disabled={page === totalPages}
                 className="px-4 py-2 text-sm font-bold text-foreground bg-muted border border-border rounded-lg disabled:opacity-50"
               >
                 Next
               </button>
             </div>
          )}
        </motion.div>
      )}

      {viewState === 'edit-student' && selectedStudent && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="flex flex-col h-full bg-card border border-border rounded-3xl overflow-hidden shadow-sm"
        >
          <div className="p-6 border-b border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setViewState('class-view')}
                className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors font-bold"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">{selectedStudent.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md uppercase tracking-wide">{selectedStudent.grade}</span>
                  <span className="text-xs font-bold text-muted-foreground">ID: {selectedStudent.roll_number}</span>
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
                <div key={grade.subject_id} className="p-4 border border-border rounded-2xl bg-card/50 hover:bg-card transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-3 font-bold text-foreground flex items-center gap-2">
                       <BookOpen size={16} className="text-primary"/> {grade.subject_name}
                    </div>
                    <div className="md:col-span-3 relative">
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
                    <div className="md:col-span-4 disabled:opacity-50">
                        <select
                          value={grade.linked_assessment_id}
                          onChange={(e) => {
                            const newGrades = [...studentGrades];
                            newGrades[idx].linked_assessment_id = e.target.value;
                            setStudentGrades(newGrades);
                          }}
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none appearance-none text-xs font-medium text-muted-foreground"
                        >
                          <option value="">Link Assessment (Optional)</option>
                          {assessments
                            .filter(a => (a.subject_id === grade.subject_id || a.subject === grade.subject_name) && (a.class_id === selectedGrade || a.grade === selectedGrade))
                            .map(a => <option key={a.id} value={a.id}>{a.title} ({a.type})</option>)
                          }
                        </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-border bg-muted/10 flex justify-between items-center">
             <span className="text-sm text-muted-foreground">Save grades to record the term progress.</span>
             <button
                onClick={handleSaveStudentGrades}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                <Save size={20} /> Save Grades
              </button>
          </div>
        </motion.div>
      )}

      {viewState === 'edit-subject' && selectedSubject && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="flex flex-col h-full bg-card border border-border rounded-3xl overflow-hidden shadow-sm"
        >
          <div className="p-6 border-b border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setViewState('class-view')}
                className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors font-bold"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">{selectedSubject.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md uppercase tracking-wide">{selectedGrade}</span>
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
            <div className="space-y-4 max-w-4xl mx-auto">
              {allStudentsInGrade.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground text-sm font-medium">No students found.</div>
              ) : subjectGrades.map((grade, idx) => (
                <div key={grade.student_id} className="p-4 border border-border rounded-2xl bg-card/50 hover:bg-card transition-colors flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div className="font-bold text-foreground">
                        {grade.student_name} <span className="text-xs font-normal text-muted-foreground inline-block ml-2">ID: {grade.roll_number}</span>
                    </div>
                    <div className="relative w-full sm:w-48">
                        <input
                          type="number"
                          placeholder="Score"
                          value={grade.marks}
                          onChange={(e) => {
                            const newGrades = [...subjectGrades];
                            newGrades[idx].marks = e.target.value;
                            setSubjectGrades(newGrades);
                          }}
                          className="w-full pl-4 pr-12 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-primary"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">/ {grade.max_marks}</span>
                    </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-border bg-muted/10 flex justify-between items-center">
             <span className="text-sm text-muted-foreground">Save the marks for all students in the list.</span>
             <button
                onClick={handleSaveSubjectGrades}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                <Save size={20} /> Save Grades
              </button>
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
