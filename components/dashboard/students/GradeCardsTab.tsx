'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { 
  Search, Filter, FileText, ChevronRight, User, BookOpen, Calculator, Save, 
  Link as LinkIcon, CheckCircle2, AlertCircle, ArrowLeft, GraduationCap, 
  Printer, Download, Eye, Layout, Lock, EyeOff, Check, XCircle, ChevronDown, 
  Calendar, FileSpreadsheet, Building, UserCheck, Shield, UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { getPaginatedStudents, getClasses, getSubjects, getPaginatedAssessments } from '@/lib/supabase-db';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/lib/permissions';
import { useAuth } from '@/lib/auth-context';
import { runPublicationsMigration, publishReportCard, publishClassReportCards } from '@/app/actions/academics';
import { getSystemSettings } from '@/lib/api/settings';

export function GradeCardsTab() {
  const { t } = useLanguage();
  const { can, isRole } = usePermissions();
  const { user } = useAuth();
  
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);
  const isTeacher = useMemo(() => user?.role === 'teacher', [user]);
  const isParent = useMemo(() => user?.role === 'parent', [user]);
  const isStudent = useMemo(() => user?.role === 'student', [user]);

  // Run publications migration automatically if user is admin
  useEffect(() => {
    if (isAdmin) {
      runPublicationsMigration().then(success => {
        if (success) console.log("Report card publications table ready");
      });
    }
  }, [isAdmin]);

  // View states: 'grades-grid' | 'class-view' | 'edit-student' | 'edit-subject' | 'family-view'
  const [viewState, setViewState] = useState<'grades-grid' | 'class-view' | 'edit-student' | 'edit-subject' | 'family-view'>(
    (isParent || isStudent) ? 'family-view' : 'grades-grid'
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  
  // Terms configuration
  const [activeTerm, setActiveTerm] = useState('Term 1'); // 'Term 1', 'Term 2', 'Monthly', 'Final'
  const [activeMonth, setActiveMonth] = useState('Month 1'); // 'Month 1', 'Month 2', 'Month 3', 'Month 4'

  // Print Preview Modal states
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedStudentForPrint, setSelectedStudentForPrint] = useState<any>(null);
  const [activeTemplate, setActiveTemplate] = useState<'template-a' | 'template-b'>('template-a');

  // Multi-child support for parents
  const [parentId, setParentId] = useState<string>('');
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const [page, setPage] = useState(1);
  const limit = 10;

  // Resolve current db term mapping
  const currentDbTerm = useMemo(() => {
    if (activeTerm === 'Monthly') {
      return activeMonth;
    }
    return activeTerm;
  }, [activeTerm, activeMonth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // SWR queries
  const { data: systemSettings } = useSWR('system_settings', getSystemSettings);
  const { data: classesData } = useSWR('classes', () => getClasses());
  const { data: subjectsData } = useSWR('subjects', () => getSubjects());
  const { data: assessmentsData } = useSWR('assessments', () => getPaginatedAssessments(1, 200));

  // Fetch report card publication status map
  const { data: publications, mutate: mutatePublications } = useSWR(
    'report_card_publications_all',
    async () => {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('remarks', 'PUBLICATION_RECORD')
        .is('subject_id', null);
      if (error) {
        console.warn('Could not fetch publications:', error);
        return [];
      }
      return (data || []).map((g: any) => ({
        id: g.id,
        student_id: g.student_id,
        term: g.term,
        is_published: g.score === 1
      }));
    }
  );

  // Publications helper map
  const isTermPublished = useCallback((studentId: string, termName: string) => {
    if (isAdmin || isTeacher) return true; // Professionals always see data in edit screens
    return publications?.some(p => p.student_id === studentId && p.term === termName && p.is_published) ?? false;
  }, [publications, isAdmin, isTeacher]);

  // Fetch active schedule assignments to check which subjects a teacher instructs
  const { data: teacherSchedules } = useSWR(
    isTeacher && user?.id ? ['teacher-schedules', user.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('class_id, subject_id, classes(name), subjects(name)')
        .eq('teacher_id', user!.id);
      if (error) {
        console.error("Error fetching teacher schedules:", error);
        return [];
      }
      return data || [];
    }
  );

  // Fetch parent's children (multi-child setup)
  const { data: parentChildren, isLoading: isChildrenLoading } = useSWR(
    isParent && user?.id ? ['parent-children', user.id] : null,
    async () => {
      const { data: relations, error: relError } = await supabase
        .from('parent_student')
        .select('student_id')
        .eq('parent_id', user!.id);
      if (relError || !relations || relations.length === 0) return [];
      
      const studentIds = relations.map(r => r.student_id);
      const { data: students, error: studError } = await supabase
        .from('students')
        .select('*, user:users(name)')
        .in('id', studentIds);
      if (studError) return [];
      
      const uniqueStudentsMap = new Map();
      (students || []).forEach((s: any) => {
        if (s && s.id) uniqueStudentsMap.set(s.id, {
          ...s,
          name: s.name || (s.user ? s.user.name : 'Unknown')
        });
      });
      return Array.from(uniqueStudentsMap.values());
    }
  );

  // Automatically select first child
  useEffect(() => {
    if (parentChildren && parentChildren.length > 0 && !selectedChildId) {
      setSelectedChildId(parentChildren[0].id);
    }
  }, [parentChildren, selectedChildId]);

  const activeChild = useMemo(() => {
    return parentChildren?.find(c => c.id === selectedChildId) || null;
  }, [parentChildren, selectedChildId]);

  // If user is a student, load their own profile
  const { data: studentSelfProfile, isLoading: isStudentSelfLoading } = useSWR(
    isStudent && user?.id ? ['student-self-profile', user.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, user:users(name)')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) return null;
      return data;
    }
  );

  const activeFamilyStudent = useMemo(() => {
    if (isStudent) return studentSelfProfile;
    if (isParent) return activeChild;
    return null;
  }, [isStudent, isParent, studentSelfProfile, activeChild]);

  // Fetch grades for active family views
  const { data: familyGrades, isLoading: isFamilyGradesLoading, mutate: mutateFamilyGrades } = useSWR(
    activeFamilyStudent ? ['family-grades', activeFamilyStudent.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', activeFamilyStudent.id);
      if (error) return [];
      return data || [];
    }
  );

  const { data: studentsData, isLoading: isStudentsLoading, mutate: mutateStudents } = useSWR(
    viewState !== 'grades-grid' && viewState !== 'family-view' && selectedGrade ? ['grade-students', page, debouncedSearch, selectedGrade] : null,
    () => {
      const forceStudentId = isStudent ? user?.studentId : undefined;
      const forceParentId = isParent ? user?.id : undefined;
      return getPaginatedStudents(page, limit, debouncedSearch, undefined, selectedGrade, false, undefined, undefined, forceStudentId, forceParentId);
    }
  );
  
  const { data: allStudentsData } = useSWR(
    viewState === 'edit-subject' && selectedGrade ? ['all-grade-students', selectedGrade] : null,
    () => getPaginatedStudents(1, 200, '', undefined, selectedGrade, false, undefined, undefined, undefined, undefined)
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
  const [isPublishingAll, setIsPublishingAll] = useState(false);
  const [subTab, setSubTab] = useState<'by-student' | 'by-subject'>('by-student');

  // Verify teacher assigned items
  const isSubjectAssignedToTeacher = useCallback((subjectId: string, className: string) => {
    if (isAdmin) return true;
    if (!teacherSchedules) return false;
    return teacherSchedules.some(
      s => s.subject_id === subjectId && s.classes?.name === className
    );
  }, [teacherSchedules, isAdmin]);

  // Fetch grades for print overlay
  const { data: printStudentAllGrades, isLoading: isPrintGradesLoading } = useSWR(
    selectedStudentForPrint ? ['all-print-grades', selectedStudentForPrint.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', selectedStudentForPrint.id);
      if (error) return [];
      return data || [];
    }
  );

  // Fetch grades for selected student (edit student mode)
  const fetchStudentGrades = useCallback(async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', studentId)
        .eq('term', currentDbTerm);
      if (error && error.code !== 'PGRST204') throw error;
      return data || [];
    } catch (err) {
      console.warn('Grades table fetch error:', err);
      return [];
    }
  }, [currentDbTerm]);

  // Fetch grades for editing subject (edit subject mode)
  const fetchSubjectGrades = useCallback(async (classGrade: string, subjectId: string) => {
    try {
      const studentIds = allStudentsInGrade.map(s => s.id);
      if (studentIds.length === 0) return [];

      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .in('student_id', studentIds)
        .eq('subject_id', subjectId)
        .eq('term', currentDbTerm);
      if (error && error.code !== 'PGRST204') throw error;
      return data || [];
    } catch (err) {
      console.warn('Grades table fetch error:', err);
      return [];
    }
  }, [allStudentsInGrade, currentDbTerm]);

  const handleSelectClass = (className: string) => {
    setSelectedGrade(className);
    setViewState('class-view');
    setPage(1);
    setSearchQuery('');
  };

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setViewState('edit-student');
  };

  const handleSelectSubject = (subject: any) => {
    setSelectedSubject(subject);
    setViewState('edit-subject');
  };

  // Populate Student Edit Layout
  useEffect(() => {
    if (viewState === 'edit-student' && selectedStudent) {
      const load = async () => {
        const existingGrades = await fetchStudentGrades(selectedStudent.id);
        const initialGrades = subjects.map(sub => {
          const existing = existingGrades.find((g: any) => g.subject_id === sub.id);
          const isAssigned = isSubjectAssignedToTeacher(sub.id, selectedGrade);
          return {
            subject_id: sub.id,
            subject_name: sub.name,
            marks: existing?.score ?? existing?.marks ?? '',
            max_marks: existing?.score_max ?? existing?.max_score ?? existing?.max_marks ?? 100,
            linked_assessment_id: existing?.assessment_id ?? existing?.linked_assessment_id ?? '',
            remarks: existing?.remarks ?? '',
            isEditable: isAdmin || isAssigned
          };
        });
        setStudentGrades(initialGrades);
      };
      load();
    }
  }, [viewState, selectedStudent, currentDbTerm, subjects, fetchStudentGrades, isSubjectAssignedToTeacher, selectedGrade, isAdmin]);

  // Populate Subject Edit Layout
  useEffect(() => {
    if (viewState === 'edit-subject' && selectedSubject && allStudentsInGrade.length > 0) {
      const load = async () => {
        const existingGrades = await fetchSubjectGrades(selectedGrade, selectedSubject.id);
        const initialGrades = allStudentsInGrade.map(student => {
          const existing = existingGrades.find((g: any) => g.student_id === student.id);
          return {
            student_id: student.id,
            student_name: student.name,
            roll_number: student.roll_number ?? student.rollNumber ?? 'N/A',
            marks: existing?.score ?? existing?.marks ?? '',
            max_marks: existing?.score_max ?? existing?.max_score ?? existing?.max_marks ?? 100,
            linked_assessment_id: existing?.assessment_id ?? existing?.linked_assessment_id ?? '',
            remarks: existing?.remarks ?? ''
          };
        });
        setSubjectGrades(initialGrades);
      };
      load();
    }
  }, [viewState, selectedSubject, allStudentsInGrade, currentDbTerm, selectedGrade, fetchSubjectGrades]);

  // Save Student Grades
  const handleSaveStudentGrades = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      const authUser = user?.id;
      // Get previous values for non-editable fields (for safety, only upsert fields that this teacher actually has permission to update)
      const payload = studentGrades
        .filter(g => g.isEditable && g.marks !== '')
        .map(g => ({
          student_id: selectedStudent.id,
          subject_id: g.subject_id,
          academic_year: selectedStudent.academic_year || '2025-2026',
          term: currentDbTerm,
          score: parseFloat(g.marks),
          score_max: parseFloat(g.max_marks),
          assessment_id: g.linked_assessment_id || null,
          remarks: g.remarks || '',
          graded_by: authUser
        }));

      if (payload.length === 0) {
        toast.error("Please enter scores for subjects assigned to you");
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('grades')
        .upsert(payload, { onConflict: 'student_id, subject_id, academic_year, term' });

      if (error) throw error;

      toast.success("Academic report counts submitted successfully");
      setViewState('class-view');
      setSelectedStudent(null);
    } catch (error: any) {
      console.error('Error saving grades:', error);
      toast.error('Failed to submit scores: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Subject Grades (Batch)
  const handleSaveSubjectGrades = async () => {
    if (!selectedSubject) return;
    setIsSaving(true);
    try {
      const authUser = user?.id;
      const payload = subjectGrades
        .filter(g => g.marks !== '')
        .map(g => ({
          student_id: g.student_id,
          subject_id: selectedSubject.id,
          academic_year: '2025-2026',
          term: currentDbTerm,
          score: parseFloat(g.marks),
          score_max: parseFloat(g.max_marks),
          assessment_id: g.linked_assessment_id || null,
          remarks: g.remarks || '',
          graded_by: authUser
        }));

      if (payload.length === 0) {
        toast.error("Please fill in marks for at least one student");
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('grades')
        .upsert(payload, { onConflict: 'student_id, subject_id, academic_year, term' });

      if (error) throw error;

      toast.success(`${selectedSubject.name} metrics written successfully`);
      setViewState('class-view');
      setSelectedSubject(null);
    } catch (error: any) {
      console.error('Error saving grades:', error);
      toast.error('Failed to submit grades: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Publish / Unpublish Term (Single Student)
  const handlePublishToggleSingle = async (student: any, pTerm: string, isCurrentlyPublished: boolean) => {
    if (!isAdmin) {
      toast.error("Permission denied: Admin authority required to publish report cards");
      return;
    }
    const success = await publishReportCard(student.id, selectedGrade, pTerm, !isCurrentlyPublished);
    if (success) {
      toast.success(`${pTerm} report visibility resolved for ${student.name}`);
      mutatePublications();
    } else {
      toast.error("Could not reconcile publication registry state");
    }
  };

  // Publish / Unpublish Term (Class Wide)
  const handlePublishClassWide = async (publishState: boolean) => {
    if (!isAdmin) {
      toast.error("Permission denied: Admin authority required to publish report cards");
      return;
    }
    if (students.length === 0) {
      toast.error("No student accounts in this registry scope");
      return;
    }

    setIsPublishingAll(true);
    const targetStudentIds = students.map((s: any) => s.id);
    const success = await publishClassReportCards(selectedGrade, currentDbTerm, targetStudentIds, publishState);
    
    setIsPublishingAll(false);
    if (success) {
      toast.success(`Published ${currentDbTerm} for all class attendees`);
      mutatePublications();
    } else {
      toast.error("Mass updates declined by system security rules");
    }
  };

  // Export Matrix to Excel/CSV
  const handleExportExcel = async () => {
    const studentList = allStudentsInGrade.length > 0 ? allStudentsInGrade : students;
    if (studentList.length === 0) {
      toast.error("No active student rosters located to export");
      return;
    }
    
    try {
      const studentIds = studentList.map(s => s.id);
      const { data: gradesData, error } = await supabase
        .from('grades')
        .select('student_id, subject_id, score, score_max')
        .in('student_id', studentIds)
        .eq('term', currentDbTerm);
        
      if (error) throw error;
      
      const subjectCols = subjects.map(s => s.name);
      let csvContent = `Student Name,Roll Number,Academic Year,Term,${subjectCols.join(',')},Total Obtained,Total Maximum,Average Percentage,Final Letter Grade\n`;
      
      studentList.forEach(student => {
        let totalObt = 0;
        let totalMax = 0;
        const rowData = [
          `"${student.name}"`,
          `"${student.roll_number ?? student.rollNumber ?? ''}"`,
          `"${student.academic_year || '2025-2026'}"`,
          `"${currentDbTerm}"`
        ];
        
        subjects.forEach(sub => {
          const grade = gradesData?.find(g => g.student_id === student.id && g.subject_id === sub.id);
          if (grade && grade.score !== null) {
            rowData.push(grade.score.toString());
            totalObt += grade.score;
            totalMax += (grade.score_max || 100);
          } else {
            rowData.push('');
          }
        });

        const percentage = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
        const letter = totalMax > 0 ? getLetterGrade(percentage) : 'N/A';

        rowData.push(totalObt.toString());
        rowData.push(totalMax.toString());
        rowData.push(`${percentage}%`);
        rowData.push(letter);
        
        csvContent += rowData.join(',') + '\n';
      });
      
      // Force trigger binary blob download
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${selectedGrade.replace(/\s+/g, '_')}_Academic_Ledger_Export_${currentDbTerm.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Excel-compatible spreadsheet compiled successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to parse grades data: " + err.message);
    }
  };

  // Score mapping letters
  const getLetterGrade = (score: number) => {
    if (score >= 90) return 'A*';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 40) return 'E';
    return 'U';
  };

  // Template B calculations helper
  const compileTemplateBRows = useMemo(() => {
    if (!printStudentAllGrades || !subjects.length) return [];
    
    return subjects.map(sub => {
      // Find grades for Term 1, Term 2, Month 1-4, Final
      const t1 = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Term 1')?.score ?? null;
      const t2 = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Term 2')?.score ?? null;
      const finalS = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Final')?.score ?? null;
      
      const m1 = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Month 1')?.score ?? null;
      const m2 = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Month 2')?.score ?? null;
      const m3 = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Month 3')?.score ?? null;
      const m4 = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Month 4')?.score ?? null;
      
      const monthlyScores = [m1, m2, m3, m4].filter((s): s is number => s !== null);
      const monthlyAvg = monthlyScores.length > 0 ? Math.round(monthlyScores.reduce((a, b) => a + b, 0) / monthlyScores.length) : null;
      
      // Weigh Obtained Average (Term 1: 25%, Term 2: 25%, Monthly Avg: 20%, Final: 30%)
      const components = [];
      let totalWeight = 0;
      let weightedSum = 0;
      
      if (t1 !== null) { weightedSum += t1 * 0.25; totalWeight += 0.25; }
      if (t2 !== null) { weightedSum += t2 * 0.25; totalWeight += 0.25; }
      if (monthlyAvg !== null) { weightedSum += monthlyAvg * 0.20; totalWeight += 0.20; }
      if (finalS !== null) { weightedSum += finalS * 0.30; totalWeight += 0.30; }
      
      const obtainedAvg = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
      const rawObtained = obtainedAvg ?? t1 ?? t2 ?? monthlyAvg ?? finalS ?? null;
      
      return {
        id: sub.id,
        name: sub.name,
        t1,
        t2,
        m1,
        m2,
        m3,
        m4,
        monthlyAvg,
        finalS,
         obtained: rawObtained,
        grade: rawObtained !== null ? getLetterGrade(rawObtained) : 'N/A'
      };
    });
  }, [printStudentAllGrades, subjects]);

  const compileTemplateBGrandAverage = useMemo(() => {
    const validScores = compileTemplateBRows.map(r => r.obtained).filter((s): s is number => s !== null);
    if (validScores.length === 0) return { percent: 0, letter: 'N/A' };
    const avg = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
    return { percent: avg, letter: getLetterGrade(avg) };
  }, [compileTemplateBRows]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const terms = ['Term 1', 'Term 2', 'Monthly', 'Final'];
  const monthlySubTerms = ['Month 1', 'Month 2', 'Month 3', 'Month 4'];

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 1. ADMINISTRATOR / INSTRUCTOR CLASS GRID */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {viewState === 'grades-grid' && (isAdmin || isTeacher) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {t('classes_grades') || 'Classes & Grading Ledgers'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select an active registration roster below to record grades, assign assessment links, or output printed cards.
              </p>
            </div>
            {isTeacher && (
              <div className="flex items-center gap-2 bg-primary/5 text-primary text-xs font-bold px-4 py-2 rounded-xl border border-primary/10">
                <Shield size={16} /> Teacher Portal Mode
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {classes.map((cls) => {
              // Count teacher scope constraints
              const classesTaught = teacherSchedules ? teacherSchedules.some(s => s.classes?.name === cls.name) : true;
              
              return (
                <motion.button
                  key={cls.id}
                  whileHover={{ y: -4 }}
                  onClick={() => handleSelectClass(cls.name)}
                  className="bg-card border border-border rounded-2xl p-6 text-left hover:shadow-xl hover:shadow-primary/5 transition-all group flex flex-col justify-between h-36 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                  <div className="flex items-start justify-between relative z-10 w-full">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <GraduationCap size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{cls.name}</h3>
                        <span className="text-xs text-muted-foreground">Capacity: {cls.capacity || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative z-10 flex items-center justify-between text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">
                    <span className="flex items-center gap-1">Open Academic Ledger <ChevronRight size={14} /></span>
                    {isTeacher && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] ${classesTaught ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {classesTaught ? 'Assigned' : 'Observe Only'}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
            {classes.length === 0 && (
               <div className="col-span-full flex flex-col items-center justify-center p-12 bg-card/50 border border-dashed border-border rounded-3xl">
                <FileText size={32} className="text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold text-foreground">No Classes Configured Yet</h3>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 2. CLASSROOM ROSTER & GRADE OVERVIEWS */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {viewState === 'class-view' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 flex-1 flex flex-col">
          
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-card p-6 rounded-3xl border border-border shadow-sm shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setViewState('grades-grid')}
                className="h-10 w-10 shrink-0 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground hover:bg-background transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">{selectedGrade} Roster Database</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Submit individual student scores, manage subject sheets, and export grade matrixes.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Publication Selector (Admin-Only) */}
              {isAdmin && (
                <div className="flex items-center gap-2 bg-muted p-1.5 rounded-xl border border-border">
                  <select 
                    value={activeTerm} 
                    onChange={(e) => setActiveTerm(e.target.value)} 
                    className="bg-card border border-border rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Monthly">Monthly Exams</option>
                    <option value="Final">Final Exam</option>
                  </select>
                  
                  {activeTerm === 'Monthly' && (
                    <select 
                      value={activeMonth} 
                      onChange={(e) => setActiveMonth(e.target.value)} 
                      className="bg-card border border-border rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none"
                    >
                      {monthlySubTerms.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}

                  <button 
                    onClick={() => handlePublishClassWide(true)}
                    disabled={isPublishingAll}
                    className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <Eye size={14} /> Publish Term
                  </button>
                  <button 
                    onClick={() => handlePublishClassWide(false)}
                    disabled={isPublishingAll}
                    className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <EyeOff size={14} /> Unpublish Term
                  </button>
                </div>
              )}

              {/* Excel Exporter */}
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/10 transition-colors"
              >
                <FileSpreadsheet size={16} /> Export All Reports
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4 shrink-0">
            <div className="flex gap-2">
              <button
                 onClick={() => setSubTab('by-student')}
                 className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-2 ${subTab === 'by-student' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-muted border border-transparent'}`}
              >
                <User size={16} /> By Student
              </button>
              <button
                 onClick={() => setSubTab('by-subject')}
                 className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-2 ${subTab === 'by-subject' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-muted border border-transparent'}`}
              >
                <BookOpen size={16} /> By Subject
              </button>
            </div>
            
            <div className="relative w-full sm:w-72">
               <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
               <input
                 type="text"
                 placeholder={subTab === 'by-student' ? t('search_students') || 'Search students...' : "Search academic courses..."}
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-11 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
               />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
               {subTab === 'by-student' ? (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-6 py-4 font-bold">Roster Name</th>
                        <th className="px-6 py-4 font-bold">Roll Number</th>
                        <th className="px-6 py-4 font-bold">Academic State</th>
                        <th className="px-6 py-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isStudentsLoading ? (
                        [1,2,3].map(i => (
                          <tr key={i} className="border-b border-border"><td className="p-4" colSpan={4}><Skeleton className="h-12 w-full" /></td></tr>
                        ))
                      ) : students.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-muted-foreground font-semibold">No students located inside {selectedGrade}.</td></tr>
                      ) : (
                        students.map((student: any) => {
                          const published = isTermPublished(student.id, currentDbTerm);
                          return (
                            <tr key={student.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-foreground">{student.name}</td>
                              <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{student.roll_number ?? student.rollNumber ?? 'Pending'}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${published ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                  {published ? <Check size={10} /> : <Lock size={10} />}
                                  {published ? 'Published' : 'Confidential'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button 
                                    onClick={() => {
                                      setSelectedStudentForPrint(student);
                                      setViewState('class-view'); // keep active
                                      setPrintModalOpen(true);
                                    }}
                                    className="p-1 px-2.5 bg-muted text-foreground border border-border text-xs font-bold rounded-lg hover:bg-background transition-colors flex items-center gap-1"
                                  >
                                    <Printer size={12} /> Preview Print
                                  </button>
                                  
                                  {isAdmin && (
                                    <button 
                                      onClick={() => handlePublishToggleSingle(student, currentDbTerm, published)}
                                      className={`p-1 px-2.5 text-xs font-bold rounded-lg border transition-colors ${published ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'}`}
                                    >
                                      {published ? 'Unpublish' : 'Publish'}
                                    </button>
                                  )}

                                  <button 
                                    onClick={() => handleSelectStudent(student)} 
                                    className="p-1 px-3 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/95 transition-all shadow-sm"
                                  >
                                    Grade Entry
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
               ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-6 py-4 font-bold">Subject Scheme</th>
                        <th className="px-6 py-4 font-bold">Assigned Instructor</th>
                        <th className="px-6 py-4 font-bold">Subject Code</th>
                        <th className="px-6 py-4 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                       {subjects
                        .filter(s => s.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
                        .map((sub: any) => {
                          const isAssigned = isSubjectAssignedToTeacher(sub.id, selectedGrade);
                          
                          // If current user is a teacher, and they DO NOT teach this subject inside this class, filter it out completely
                          if (isTeacher && !isAssigned) return null;

                          return (
                            <tr key={sub.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-foreground">
                                <span className="flex items-center gap-2">
                                  <BookOpen size={16} className="text-primary/70" /> {sub.name}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground text-xs font-medium">
                                {isAssigned ? (isTeacher ? 'Assigned to You' : 'Staff Assigned') : 'Available (Admin Access)'}
                              </td>
                              <td className="px-6 py-4 font-mono text-xs text-muted-foreground uppercase">{sub.code || 'None'}</td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handleSelectSubject(sub)} 
                                  className="px-4 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded-lg transition-colors border border-primary/25"
                                >
                                  Grade All Students
                                </button>
                              </td>
                            </tr>
                          );
                        })}
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
                 className="px-4 py-2 text-xs font-bold text-foreground bg-muted border border-border rounded-lg disabled:opacity-50"
               >
                 Previous
               </button>
               <span className="text-xs font-bold text-muted-foreground">
                  Page {page} of {totalPages}
               </span>
               <button
                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                 disabled={page === totalPages}
                 className="px-4 py-2 text-xs font-bold text-foreground bg-muted border border-border rounded-lg disabled:opacity-50"
               >
                 Next
               </button>
             </div>
          )}
        </motion.div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 3. STUDENT INDIVIDUAL SCORE FORM */}
      {/* ────────────────────────────────────────────────────────────────────── */}
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
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-primary/10 text-primary rounded-md uppercase tracking-wide">{selectedStudent.grade}</span>
                  <span className="text-xs font-bold text-muted-foreground font-mono">Roll: {selectedStudent.roll_number ?? selectedStudent.rollNumber}</span>
                </div>
              </div>
            </div>

            {/* Term Selectors (For grading) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 bg-card border border-border p-1 rounded-xl w-fit">
                {terms.map(term => (
                  <button
                    key={term}
                    onClick={() => setActiveTerm(term)}
                    className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                      activeTerm === term ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>
              
              {activeTerm === 'Monthly' && (
                <div className="flex items-center gap-1 bg-muted/50 border border-border/85 p-1 rounded-lg w-fit">
                  {monthlySubTerms.map(m => (
                    <button
                      key={m}
                      onClick={() => setActiveMonth(m)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        activeMonth === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="p-4 bg-muted/30 border border-border border-dashed rounded-2xl flex items-center gap-3">
              <Shield className="text-primary shrink-0" size={18} />
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                {isTeacher 
                  ? "As a teacher, you can only edit grades for subjects assigned to you in the class schedule. Locked courses display a padlock indicator."
                  : "As an Administrator, you have full override control across all subjects in the registry."
                }
              </p>
            </div>

            <div className="space-y-4 max-w-4xl">
              {studentGrades.map((grade, idx) => (
                <div 
                  key={`${grade.subject_id || idx}-${idx}`} 
                  className={`p-4 border rounded-2xl transition-all ${
                    grade.isEditable 
                      ? 'border-border bg-card/50 hover:bg-card' 
                      : 'border-border/60 bg-muted/20 opacity-80'
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-4 font-bold text-foreground flex items-center justify-between">
                       <span className="flex items-center gap-2">
                        <BookOpen size={16} className={grade.isEditable ? 'text-primary' : 'text-muted-foreground'}/> {grade.subject_name}
                       </span>
                       {!grade.isEditable && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold bg-amber-500/5 px-2 py-0.5 rounded-md border border-amber-500/10">
                          <Lock size={10} /> Lock
                        </span>
                       )}
                    </div>
                    
                    <div className="md:col-span-3 relative">
                        <input
                          type="number"
                          placeholder="Score"
                          disabled={!grade.isEditable}
                          value={grade.marks}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && (parseFloat(val) < 0 || parseFloat(val) > grade.max_marks)) {
                              toast.warn(`Score exceeds scale! Limit is ${grade.max_marks}`);
                            }
                            const newGrades = [...studentGrades];
                            newGrades[idx].marks = val;
                            setStudentGrades(newGrades);
                          }}
                          className="w-full pl-4 pr-12 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-primary disabled:opacity-50 disabled:bg-muted/40"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">/ {grade.max_marks}</span>
                    </div>

                    <div className="md:col-span-5 flex gap-2">
                      <input 
                        type="text"
                        placeholder="Teacher assessment remarks / feedback..."
                        disabled={!grade.isEditable}
                        value={grade.remarks}
                        onChange={(e) => {
                          const newGrades = [...studentGrades];
                          newGrades[idx].remarks = e.target.value;
                          setStudentGrades(newGrades);
                        }}
                        className="w-full px-4 py-2 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none disabled:opacity-50 disabled:bg-muted/40 placeholder:text-muted-foreground font-medium text-foreground"
                      />

                      <select
                        disabled={!grade.isEditable}
                        value={grade.linked_assessment_id}
                        onChange={(e) => {
                          const newGrades = [...studentGrades];
                          newGrades[idx].linked_assessment_id = e.target.value;
                          setStudentGrades(newGrades);
                        }}
                        className="px-3 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-xs font-medium text-muted-foreground max-w-[150px] disabled:opacity-50"
                      >
                        <option value="">Link Exam</option>
                        {assessments
                          .filter(a => a.subject_id === grade.subject_id && (a.class_id === selectedGrade || a.grade === selectedGrade))
                          .map(a => <option key={a.id} value={a.id}>{a.title}</option>)
                        }
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-border bg-muted/10 flex justify-end items-center gap-4">
             <button
                onClick={handleSaveStudentGrades}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 transition-all disabled:opacity-50 shadow-md shadow-primary/10"
              >
                <Save size={18} /> Submit Assessment Scores
              </button>
          </div>
        </motion.div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 4. SUBJECT-BASED ROSTER SCORE SHEET */}
      {/* ────────────────────────────────────────────────────────────────────── */}
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
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">{selectedSubject.name} Grading sheet</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-primary/10 text-primary rounded-md uppercase tracking-wide">{selectedGrade}</span>
                </div>
              </div>
            </div>

            {/* Terms controls inside subject grading view */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 bg-card border border-border p-1 rounded-xl w-fit">
                {terms.map(term => (
                  <button
                    key={term}
                    onClick={() => setActiveTerm(term)}
                    className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                      activeTerm === term ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>
              
              {activeTerm === 'Monthly' && (
                <div className="flex items-center gap-1 bg-muted/50 border border-border p-1 rounded-lg w-fit">
                  {monthlySubTerms.map(m => (
                    <button
                      key={m}
                      onClick={() => setActiveMonth(m)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        activeMonth === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4 max-w-4xl mx-auto">
              {allStudentsInGrade.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground text-sm font-semibold border border-dashed border-border rounded-2xl">
                    No active student directories registered inside {selectedGrade}.
                 </div>
              ) : (
                subjectGrades.map((grade, idx) => (
                  <div key={`${grade.student_id || idx}-${idx}`} className="p-4 border border-border rounded-2xl bg-card/50 hover:bg-card transition-colors flex flex-col md:flex-row md:items-center gap-4 justify-between">
                      <div className="font-bold text-foreground">
                          {grade.student_name} <span className="text-xs font-normal text-muted-foreground block sm:inline-block sm:ml-2 font-mono">Roll: {grade.roll_number}</span>
                      </div>
                      <div className="flex items-center gap-4 w-full md:w-auto">
                          <input 
                            type="text"
                            placeholder="Feedback / Remarks..."
                            value={grade.remarks}
                            onChange={(e) => {
                              const newGrades = [...subjectGrades];
                              newGrades[idx].remarks = e.target.value;
                              setSubjectGrades(newGrades);
                            }}
                            className="px-4 py-2 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none flex-1 md:w-64"
                          />
                          <div className="relative shrink-0 w-36">
                              <input
                                type="number"
                                placeholder="Score"
                                value={grade.marks}
                                onChange={(e) => {
                                  const newGrades = [...subjectGrades];
                                  newGrades[idx].marks = e.target.value;
                                  setSubjectGrades(newGrades);
                                }}
                                className="w-full pl-4 pr-12 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-primary"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">/ 100</span>
                          </div>
                      </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-6 border-t border-border bg-muted/10 flex justify-between items-center shrink-0">
             <span className="text-xs font-semibold text-muted-foreground">This updates {selectedSubject.name} scores for all registered rows concurrently.</span>
             <button
                onClick={handleSaveSubjectGrades}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 transition-all disabled:opacity-50 shadow-md"
              >
                <Save size={18} /> Update Courses Spreadsheet
              </button>
          </div>
        </motion.div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 5. PARENT / STUDENT PERSONAL ACADEMIC VIEW */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {viewState === 'family-view' && (parentChildren || studentSelfProfile || (isParent || isStudent)) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          
          <div className="bg-card border border-border rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">Academic Grade Cards</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isParent 
                  ? "Reconciliation dashboard for parents. Switch profiles below to observe official term report releases."
                  : "Welcome to your student portal. Track your class scores, grades indices, and download official prints."
                }
              </p>
            </div>
            
            {/* Multi-child dropdown selector (Parent Only) */}
            {isParent && parentChildren && parentChildren.length > 1 && (
              <div className="flex items-center gap-2 bg-muted p-2 rounded-2xl border border-border shrink-0">
                <span className="text-xs font-bold text-muted-foreground ml-2">Selected Child:</span>
                <select 
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="bg-card text-xs font-extrabold text-foreground border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary outline-none"
                >
                  {parentChildren.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {isParent && isChildrenLoading && (
            <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>
          )}

          {isStudent && isStudentSelfLoading && (
            <div className="space-y-4"><Skeleton className="h-44 w-full animate-pulse" /></div>
          )}

          {activeFamilyStudent ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Profile Card Summary */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col items-center text-center">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-extrabold mb-4">
                    {activeFamilyStudent.name?.charAt(0)}
                  </div>
                  <h3 className="text-lg font-black text-foreground">{activeFamilyStudent.name}</h3>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                    <span className="text-[10px] font-bold px-3 py-1 bg-primary/10 text-primary rounded-full uppercase tracking-wider">{activeFamilyStudent.grade || 'General'}</span>
                    <span className="text-[10px] font-bold px-3 py-1 bg-muted text-muted-foreground rounded-full font-mono">Roll: {activeFamilyStudent.roll_number ?? activeFamilyStudent.rollNumber ?? 'N/A'}</span>
                  </div>

                  <div className="border-t border-border w-full my-6" />

                  <div className="space-y-3 w-full text-left">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Academic Period</span>
                      <span className="font-bold text-foreground">{activeFamilyStudent.academic_year || '2025-2026'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Parent Contact</span>
                      <span className="font-bold text-foreground">{activeFamilyStudent.emergency_phone || 'Registered'}</span>
                    </div>
                  </div>
                </div>

                {/* Info Card banner */}
                <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950/45 p-5 rounded-3xl">
                  <h4 className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Official releases</h4>
                  <p className="text-[11px] text-indigo-900/80 dark:text-indigo-450 leading-relaxed font-semibold">
                    Official academic documents are released by the school administration once evaluations are locked. Please contact the administrative department for registration issues.
                  </p>
                </div>
              </div>

              {/* Terms release list */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                  <h3 className="text-lg font-black text-foreground mb-4">Evaluation Terms & Publications</h3>
                  
                  <div className="space-y-3">
                    {['Term 1', 'Term 2', 'Month 1', 'Month 2', 'Month 3', 'Month 4', 'Final'].map(termName => {
                      const published = isTermPublished(activeFamilyStudent.id, termName);
                      
                      return (
                        <div key={termName} className="p-4 border border-border rounded-2xl bg-card hover:bg-muted/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${published ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              {published ? <CheckCircle2 size={20} /> : <Lock size={20} />}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-base text-foreground leading-snug">{termName} Evaluation</h4>
                              <p className="text-[11px] text-muted-foreground font-medium">
                                {published ? 'Officially completed and released by administration' : 'Awaiting administrative finalization and release'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {published ? (
                              <button 
                                onClick={() => {
                                  // Update state appropriately to render print previews
                                  setSelectedStudentForPrint(activeFamilyStudent);
                                  // Map Month terminology
                                  if (termName.startsWith('Month ')) {
                                    setActiveTerm('Monthly');
                                    setActiveMonth(termName);
                                  } else {
                                    setActiveTerm(termName);
                                  }
                                  setPrintModalOpen(true);
                                }}
                                className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/95 transition-all shadow-sm flex items-center justify-center gap-1.5"
                              >
                                <Eye size={14} /> Open Report Card
                              </button>
                            ) : (
                              <span className="w-full sm:w-auto px-4 py-2 bg-muted text-muted-foreground text-xs font-extrabold rounded-xl border border-border flex items-center justify-center gap-1.5 select-none cursor-not-allowed">
                                <Lock size={12} /> Sealed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-12 text-center bg-card border border-border border-dashed rounded-3xl">
              <UserCircle className="mx-auto text-muted-foreground mb-4" size={40} />
              <h3 className="text-lg font-black text-foreground">No Student Records Found</h3>
              <p className="text-xs text-muted-foreground mt-1">There are no student accounts currently associated with your credentials.</p>
            </div>
          )}

        </motion.div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 6. HIGH-FIDELITY PRINT PREVIEW MODAL */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {printModalOpen && selectedStudentForPrint && (
          <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 overflow-y-auto custom-scrollbar flex items-center justify-center p-0 md:p-6 print:absolute print:inset-0 print:p-0 print:bg-white">
            <div className="bg-card w-full max-w-5xl md:border md:border-border min-h-screen md:min-h-0 md:rounded-3xl shadow-2xl flex flex-col print:border-none print:shadow-none print:rounded-none">
              
              {/* Header inside modal (Hidden during print) */}
              <div className="p-4 border-b border-border bg-card sticky top-0 z-50 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setPrintModalOpen(false)}
                    className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h3 className="font-extrabold text-base text-foreground leading-tight">Document Printing Desk</h3>
                    <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">Toggle layouts and configure printer options.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border">
                  <button
                    onClick={() => setActiveTemplate('template-a')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      activeTemplate === 'template-a' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
                    }`}
                  >
                    <Layout size={14} /> Single Period Card
                  </button>
                  <button
                    disabled={isTeacher} // Template B requires annual aggregates across terms
                    onClick={() => setActiveTemplate('template-b')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                      activeTemplate === 'template-b' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
                    }`}
                  >
                    <Building size={14} /> Annual Progress Report
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-600/10 transition-colors"
                  >
                    <Printer size={16} /> Print / Save PDF
                  </button>
                  <button 
                    onClick={() => setPrintModalOpen(false)}
                    className="px-3 py-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-bold rounded-xl transition-colors"
                  >
                    Close Drawer
                  </button>
                </div>
              </div>

              {/* Certificate Inner Container (Optimized for both screen viewing and window.print() output) */}
              <div className="flex-1 p-6 md:p-12 overflow-y-auto bg-card dark:bg-slate-950/20 print:p-0 print:bg-white">
                
                {/* INJECT MEDIA PRINT WRAPPER FOR FORCE CLEAN CENTERING */}
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    @page {
                      size: portrait;
                      margin: 0.8cm;
                    }
                    body {
                      background: white !important;
                      color: black !important;
                    }
                    body * {
                      visibility: hidden;
                    }
                    #printable-card-frame, #printable-card-frame * {
                      visibility: visible !important;
                    }
                    #printable-card-frame {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      border: none !important;
                      background: white !important;
                      box-shadow: none !important;
                    }
                    .print-border-bold {
                      border: 3px double #000 !important;
                    }
                    .text-indigo-600, .text-primary {
                      color: #000 !important;
                    }
                    .bg-primary\\/5, .bg-muted, .bg-indigo-50 {
                      background-color: #f3f4f6 !important;
                    }
                  }
                `}} />

                <div id="printable-card-frame" className="bg-white text-black p-8 md:p-12 border-2 border-slate-300 rounded-[2rem] shadow-sm max-w-4xl mx-auto print:border-none print:shadow-none print:rounded-none print:p-2">
                  
                  {/* HELPER RESOLUTION LOADER FOR ACTIVE LOADS */}
                  {isPrintGradesLoading ? (
                    <div className="text-center py-20 print:hidden">
                      <LoadingSpinner className="mx-auto mb-4" />
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Aggregating records indices...</p>
                    </div>
                  ) : (
                    <>
                      {/* ──────────────────────────────────────────────────────── */}
                      {/* TEMPLATE A: SINGLE TERM REPORT CARD (Beechtown Classic) */}
                      {/* ──────────────────────────────────────────────────────── */}
                      {activeTemplate === 'template-a' && (
                        <div className="space-y-8">
                          {/* Top Decorative Border band */}
                          <div className="h-2 w-full bg-slate-900 rounded-full" />
                          
                          {/* Banner Info */}
                          <div className="text-center space-y-2">
                            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                              {systemSettings?.school_name || 'Noble Learning Academy'}
                            </h1>
                            <p className="text-xs text-slate-500 tracking-wider font-extrabold uppercase">
                              {systemSettings?.school_address || '123 Academic Drive, Building East'}
                            </p>
                            <div className="inline-block px-4 py-1.5 bg-slate-100 rounded-lg text-xs font-black uppercase text-slate-800 border border-slate-200 mt-2">
                              OFFICIAL TRANSCRIPT - {currentDbTerm}
                            </div>
                          </div>

                          {/* Student Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs">
                            <div className="space-y-1">
                              <span className="text-slate-400 font-bold block uppercase text-[9px]">Student Name</span>
                              <span className="font-extrabold text-slate-950 text-sm">{selectedStudentForPrint.name}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400 font-bold block uppercase text-[9px]">Grade Level</span>
                              <span className="font-extrabold text-slate-950 text-sm uppercase">{selectedStudentForPrint.grade || 'General'}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400 font-bold block uppercase text-[9px]">Registry Number</span>
                              <span className="font-extrabold text-slate-950 text-sm font-mono">{selectedStudentForPrint.roll_number ?? selectedStudentForPrint.rollNumber ?? 'T-491'}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400 font-bold block uppercase text-[9px]">Academic Term</span>
                              <span className="font-extrabold text-slate-950 text-sm">{currentDbTerm}</span>
                            </div>
                          </div>

                          {/* Subjects Metrics table */}
                          <div className="overflow-hidden border border-slate-300 rounded-2xl">
                            <table className="w-full text-left text-xs bg-white">
                              <thead>
                                <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-widest border-b border-slate-300">
                                  <th className="px-5 py-3">Course Catalog</th>
                                  <th className="px-5 py-3 text-center">Max Scale</th>
                                  <th className="px-5 py-3 text-center">Score Obtained</th>
                                  <th className="px-5 py-3 text-center">Letter Grade</th>
                                  <th className="px-5 py-3 hidden sm:table-cell">Instructor Feedback</th>
                                </tr>
                              </thead>
                              <tbody>
                                {subjects.map(sub => {
                                  const gradeRecord = printStudentAllGrades?.find(g => g.subject_id === sub.id && g.term === currentDbTerm);
                                  const score = gradeRecord ? gradeRecord.score : null;
                                  const lGrade = score !== null ? getLetterGrade(score) : 'Awaiting';
                                  
                                  return (
                                    <tr key={sub.id} className="border-b border-slate-200 hover:bg-slate-50/50">
                                      <td className="px-5 py-3.5 font-bold text-slate-900">{sub.name}</td>
                                      <td className="px-5 py-3.5 text-center font-mono text-slate-400">100</td>
                                      <td className="px-5 py-3.5 text-center font-extrabold text-slate-900 font-mono text-sm">
                                        {score !== null ? score : '-'}
                                      </td>
                                      <td className="px-5 py-3.5 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                                          lGrade === 'FAIL' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-800'
                                        }`}>
                                          {lGrade}
                                        </span>
                                      </td>
                                      <td className="px-5 py-3.5 text-slate-600 italic text-[11px] hidden sm:table-cell leading-relaxed">
                                        {gradeRecord?.remarks || 'Consistently responsive in routine learning drills.'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Legend & Grading Matrix Scale */}
                          <div className="p-5 border-2 border-slate-900 border-double rounded-2xl bg-white space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 text-center">
                              Administrative Evaluation Index Legend
                            </h4>
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center text-[10px]">
                              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                <span className="font-extrabold text-slate-950 block">A+</span>
                                <span className="text-slate-400 font-mono">96 - 100</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                <span className="font-extrabold text-slate-950 block">A</span>
                                <span className="text-slate-400 font-mono">91 - 95</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                <span className="font-extrabold text-slate-950 block">B+</span>
                                <span className="text-slate-400 font-mono">86 - 90</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                <span className="font-extrabold text-slate-950 block">B</span>
                                <span className="text-slate-400 font-mono">81 - 85</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                <span className="font-extrabold text-slate-950 block">C</span>
                                <span className="text-slate-400 font-mono">76 - 80</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                <span className="font-extrabold text-slate-950 block">D</span>
                                <span className="text-slate-400 font-mono">70 - 75</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded border border-slate-200 col-span-full sm:col-span-1">
                                <span className="font-extrabold text-red-600 block">FAIL</span>
                                <span className="text-slate-400 font-mono">&lt; 70</span>
                              </div>
                            </div>
                          </div>

                          {/* Attendance Rate */}
                          <div className="flex gap-4 p-4 bg-slate-50 rounded-xl text-xs border border-slate-200">
                            <span className="font-bold text-slate-500 uppercase tracking-wide">Academic Attendance:</span>
                            <span className="font-extrabold text-slate-900">Total days enroled: 90 days</span>
                            <span className="font-bold text-emerald-600">Attended: 88 days</span>
                            <span className="font-bold text-red-500">Absent: 2 days</span>
                          </div>

                          {/* Official Signatures Spacer block */}
                          <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
                            <div className="space-y-1">
                              <div className="border-b border-slate-400 mx-auto w-48 h-6" />
                              <span className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">Teacher Endorsement</span>
                            </div>
                            <div className="space-y-1">
                              <div className="border-b border-slate-400 mx-auto w-48 h-6" />
                              <span className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">Administrative Registrar</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ──────────────────────────────────────────────────────── */}
                      {/* TEMPLATE B: ANNUAL PROGRESS REPORT (Double Border Classic) */}
                      {/* ──────────────────────────────────────────────────────── */}
                      {activeTemplate === 'template-b' && (
                        <div className="border-4 border-slate-900 border-double p-6 md:p-10 bg-white space-y-8 relative overflow-hidden">
                          
                          {/* Inner corner margins design */}
                          <div className="absolute top-0 left-0 w-8 h-8 border-r border-b border-slate-300" />
                          <div className="absolute top-0 right-0 w-8 h-8 border-l border-b border-slate-300" />
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-r border-t border-slate-300" />
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-l border-t border-slate-300" />

                          {/* Star Crest Header graphic */}
                          <div className="text-center space-y-3">
                            <div className="mx-auto w-12 h-12 rounded-full border border-slate-400 flex items-center justify-center text-slate-800">
                              <Building size={22} className="stroke-1" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-serif font-black uppercase text-slate-900 tracking-tight">
                              {systemSettings?.school_name || 'Noble Learning Academy'}
                            </h2>
                            <p className="text-xs uppercase font-serif tracking-widest text-slate-500">
                              Annual Progress & Performance Credentials
                            </p>
                          </div>

                          {/* Student Details Row */}
                          <div className="border-y border-slate-300 py-3.5 space-y-2 text-xs font-serif italic text-slate-800">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                              <div>Student: <span className="font-bold font-serif not-italic text-black text-sm">{selectedStudentForPrint.name}</span></div>
                              <div>Roll No: <span className="font-bold not-italic text-black text-sm font-mono">{selectedStudentForPrint.roll_number ?? selectedStudentForPrint.rollNumber ?? 'T-491'}</span></div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pt-2 border-t border-dashed border-slate-200">
                              <div>Grade: <span className="font-bold not-italic text-black text-sm uppercase">{selectedStudentForPrint.grade || 'General'}</span></div>
                              <div>Year: <span className="font-bold not-italic text-black text-sm">2025-2026</span></div>
                            </div>
                          </div>

                          {/* Comprehensive Term Comparison table */}
                          <div className="overflow-hidden border border-slate-400">
                            <table className="w-full text-left text-[11px] bg-white font-serif">
                              <thead>
                                <tr className="bg-slate-100 text-[10px] uppercase font-bold tracking-wider border-b border-slate-400 text-slate-800">
                                  <th className="px-3 py-3 border-r border-slate-400 leading-tight">Subject Scheme</th>
                                  <th className="px-2 py-3 border-r border-slate-400 text-center">1st Term</th>
                                  <th className="px-2 py-3 border-r border-slate-400 text-center">2nd Term</th>
                                  <th className="px-1 py-3 border-r border-slate-400 text-center">M1</th>
                                  <th className="px-1 py-3 border-r border-slate-400 text-center">M2</th>
                                  <th className="px-1 py-3 border-r border-slate-400 text-center">M3</th>
                                  <th className="px-1 py-3 border-r border-slate-400 text-center">M4</th>
                                  <th className="px-2 py-3 border-r border-slate-400 text-center">Mo. Avg</th>
                                  <th className="px-2 py-3 border-r border-slate-400 text-center">Final Exam</th>
                                  <th className="px-3 py-3 text-center bg-slate-200/50">Obtained</th>
                                  <th className="px-2 py-3 text-center">Grade</th>
                                </tr>
                              </thead>
                              <tbody>
                                {compileTemplateBRows.map(row => (
                                  <tr key={row.id} className="border-b border-slate-300">
                                    <td className="px-3 py-2.5 border-r border-slate-300 font-bold not-italic text-black">{row.name}</td>
                                    <td className="px-2 py-2.5 border-r border-slate-300 text-center font-mono text-slate-800">{row.t1 ?? '-'}</td>
                                    <td className="px-2 py-2.5 border-r border-slate-300 text-center font-mono text-slate-800">{row.t2 ?? '-'}</td>
                                    <td className="px-1 py-2.5 border-r border-slate-300 text-center font-mono text-slate-600">{row.m1 ?? '-'}</td>
                                    <td className="px-1 py-2.5 border-r border-slate-300 text-center font-mono text-slate-600">{row.m2 ?? '-'}</td>
                                    <td className="px-1 py-2.5 border-r border-slate-300 text-center font-mono text-slate-600">{row.m3 ?? '-'}</td>
                                    <td className="px-1 py-2.5 border-r border-slate-300 text-center font-mono text-slate-600">{row.m4 ?? '-'}</td>
                                    <td className="px-2 py-2.5 border-r border-slate-300 text-center font-mono text-slate-800">{row.monthlyAvg ?? '-'}</td>
                                    <td className="px-2 py-2.5 border-r border-slate-300 text-center font-mono text-slate-800">{row.finalS ?? '-'}</td>
                                    <td className="px-3 py-2.5 border-r border-slate-300 text-center font-extrabold text-black font-mono bg-slate-100/30 text-sm">{row.obtained ?? '-'}</td>
                                    <td className="px-2 py-2.5 text-center font-serif font-black">{row.grade}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Summary aggregate panels */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-2 font-serif text-xs text-slate-800">
                              <h4 className="font-extrabold uppercase tracking-wide border-b border-slate-200 pb-1 font-serif text-slate-900">
                                Performance Evaluation Summary
                              </h4>
                              <div className="flex justify-between items-center py-0.5">
                                <span className="italic">Overall Term Percentile:</span>
                                <span className="font-mono font-extrabold text-sm">{compileTemplateBGrandAverage.percent}%</span>
                              </div>
                              <div className="flex justify-between items-center py-0.5">
                                <span className="italic">Consolidated Grade Index:</span>
                                <span className="font-extrabold text-sm text-indigo-600">{compileTemplateBGrandAverage.letter}</span>
                              </div>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-2 font-serif text-xs text-slate-800">
                              <h4 className="font-extrabold uppercase tracking-wide border-b border-slate-200 pb-1 font-serif text-slate-900">
                                Registrar Credentials
                              </h4>
                              <p className="italic leading-normal text-[11px]">
                                This certifies that {selectedStudentForPrint.name} has concluded the corresponding class curriculum requirements with proper active registration.
                              </p>
                            </div>
                          </div>

                          {/* Bottom signatures block */}
                          <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs font-serif">
                            <div className="space-y-1">
                              <div className="border-b border-slate-400 mx-auto w-48 h-6" />
                              <span className="text-slate-500 font-bold uppercase tracking-wide text-[9px] block">Registrar Signature</span>
                            </div>
                            <div className="space-y-1">
                              <div className="border-b border-slate-400 mx-auto w-48 h-6" />
                              <span className="text-slate-500 font-bold uppercase tracking-wide text-[9px] block">Principal signature</span>
                            </div>
                          </div>

                        </div>
                      )}
                    </>
                  )}

                </div>
              </div>

              {/* Drawer footer */}
              <div className="p-4 bg-muted border-t border-border flex justify-end gap-2 print:hidden shrink-0">
                <button 
                  onClick={() => setPrintModalOpen(false)}
                  className="px-5 py-2.5 bg-card border border-border rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>

            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Simple dynamic rotation indicators
const LoadingSpinner = ({ className }: { className?: string }) => (
  <svg 
    className={`animate-spin h-8 w-8 text-indigo-600 ${className || ''}`}
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24"
  >
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4"
    />
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);
