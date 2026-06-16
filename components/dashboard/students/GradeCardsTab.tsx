'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { Search, FileText, BookOpen, Save, ArrowLeft, GraduationCap, Printer, User, Check, Lock, Shield, FileSpreadsheet, Users, BookOpen as BookOpenIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { getPaginatedStudents, getClasses, getSubjects, getPaginatedAssessments } from '@/lib/supabase-db';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyData } from '@/components/ui/empty-data';
import { usePermissions } from '@/lib/permissions';
import { useAuth } from '@/lib/auth-context';
import { runPublicationsMigration, publishReportCard, publishClassReportCards } from '@/app/actions/academics';
import { getSystemSettings } from '@/lib/api/settings';
import { getLetterGrade } from '@/components/dashboard/students/grade-cards/grade-utils';
import { ClassGrid } from '@/components/dashboard/students/grade-cards/ClassGrid';
import { FamilyView } from '@/components/dashboard/students/grade-cards/FamilyView';
import { PrintPreviewModal } from '@/components/dashboard/students/grade-cards/PrintPreviewModal';

export function GradeCardsTab() {
  const { t } = useLanguage();
  const { can, isRole } = usePermissions();
  const { user } = useAuth();

  const isAdmin = useMemo(() => user?.role === 'admin', [user]);
  const isTeacher = useMemo(() => user?.role === 'teacher', [user]);
  const isParent = useMemo(() => user?.role === 'parent', [user]);
  const isStudent = useMemo(() => user?.role === 'student', [user]);

  useEffect(() => {
    if (isAdmin) {
      runPublicationsMigration().then(success => {
        if (success) console.log("Report card publications table ready");
      });
    }
  }, [isAdmin]);

  const [viewState, setViewState] = useState<'grades-grid' | 'class-view' | 'edit-student' | 'edit-subject' | 'family-view'>(
    (isParent || isStudent) ? 'family-view' : 'grades-grid'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);

  const [activeTerm, setActiveTerm] = useState('Term 1');
  const [activeMonth, setActiveMonth] = useState('Month 1');

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedStudentForPrint, setSelectedStudentForPrint] = useState<any>(null);
  const [activeTemplate, setActiveTemplate] = useState<'template-a' | 'template-b'>('template-a');
  const [attendanceSummary, setAttendanceSummary] = useState<{ present: number; total: number; absent: number } | null>(null);
  const [studentRank, setStudentRank] = useState<{ rank: number; total: number } | null>(null);

  const [parentId, setParentId] = useState<string>('');
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const [page, setPage] = useState(1);
  const limit = 10;

  const currentDbTerm = useMemo(() => {
    if (activeTerm === 'Monthly') return activeMonth;
    return activeTerm;
  }, [activeTerm, activeMonth]);

  useEffect(() => {
    if (printModalOpen && selectedStudentForPrint) {
      const fetchStudentAnalytics = async () => {
        try {
          const { data: attData } = await supabase
            .from('attendance')
            .select('status')
            .eq('student_id', selectedStudentForPrint.id);

          if (attData) {
            const present = attData.filter(a => a.status === 'present' || a.status === 'late').length;
            const total = attData.length;
            setAttendanceSummary({ present, total, absent: total - present });
          }

          const { data: classStudents } = await supabase
            .from('students')
            .select('id')
            .eq('grade', selectedStudentForPrint.grade || 'GRADE 1');

          const classStudentIds = classStudents ? classStudents.map(s => s.id) : [];

          if (classStudentIds.length > 0) {
            const { data: allGrades } = await supabase
              .from('grades')
              .select('student_id, score')
              .eq('term', currentDbTerm)
              .eq('academic_year', selectedStudentForPrint.academic_year || '2025-2026')
              .in('student_id', classStudentIds);

            if (allGrades) {
              const studentTotals: Record<string, number> = {};
              classStudentIds.forEach(id => { studentTotals[id] = 0; });
              allGrades.forEach(g => { studentTotals[g.student_id] = (studentTotals[g.student_id] || 0) + (g.score || 0); });
              const sortedTotals = Object.entries(studentTotals).sort(([, a], [, b]) => b - a);
              const myRankIndex = sortedTotals.findIndex(([id]) => id === selectedStudentForPrint.id);
              if (myRankIndex !== -1) setStudentRank({ rank: myRankIndex + 1, total: sortedTotals.length });
            }
          }
        } catch (err) {
          console.error("Failed to compile student analytics:", err);
        }
      };
      fetchStudentAnalytics();
    }
  }, [printModalOpen, selectedStudentForPrint, currentDbTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: systemSettings } = useSWR('system_settings', getSystemSettings);
  const { data: classesData } = useSWR('classes', () => getClasses());
  const { data: subjectsData } = useSWR('subjects', () => getSubjects());
  const { data: assessmentsData } = useSWR('assessments', () => getPaginatedAssessments(1, 200));

  const { data: publications, mutate: mutatePublications } = useSWR('report_card_publications_all', async () => {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('remarks', 'PUBLICATION_RECORD')
      .is('subject_id', null);
    if (error) { console.warn('Could not fetch publications:', error); return []; }
    return (data || []).map((g: any) => ({ id: g.id, student_id: g.student_id, term: g.term, is_published: g.score === 1 }));
  });

  const isTermPublished = useCallback((studentId: string, termName: string) => {
    return publications?.some(p => p.student_id === studentId && p.term === termName && p.is_published) ?? false;
  }, [publications]);

  const { data: teacherSchedules } = useSWR(isTeacher && user?.id ? ['teacher-schedules', user.id] : null, async () => {
    const { data, error } = await supabase
      .from('schedules')
      .select('class_id, subject_id, classes(name), subjects(name)')
      .eq('teacher_id', user!.id);
    if (error) { console.error("Error fetching teacher schedules:", error); return []; }
    return data || [];
  });

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
      (students || []).forEach((s: any) => { if (s && s.id) uniqueStudentsMap.set(s.id, { ...s, name: s.name || (s.user ? s.user.name : 'Unknown') }); });
      return Array.from(uniqueStudentsMap.values());
    }
  );

  useEffect(() => {
    if (parentChildren && parentChildren.length > 0) {
      const currentGlobalId = user?.studentId;
      const hasGlobalInFiltered = parentChildren.some((s: any) => s.id === currentGlobalId);
      if (hasGlobalInFiltered && currentGlobalId) setSelectedChildId(currentGlobalId);
      else if (!selectedChildId) setSelectedChildId(parentChildren[0].id);
    }
  }, [parentChildren, user?.studentId, selectedChildId]);

  const activeChild = useMemo(() => parentChildren?.find(c => c.id === selectedChildId) || null, [parentChildren, selectedChildId]);

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

  const { data: familyGrades, isLoading: isFamilyGradesLoading, mutate: mutateFamilyGrades } = useSWR(
    activeFamilyStudent ? ['family-grades', activeFamilyStudent.id] : null,
    async () => {
      const { data, error } = await supabase.from('grades').select('*').eq('student_id', activeFamilyStudent.id);
      if (error) return [];
      return data || [];
    }
  );

  const familyAcademicYears = useMemo(() => {
    const standardTerms = ['1st Monthly', '2nd Monthly', '1st Term', '3rd Monthly', '4th Monthly', '2nd Term', 'Final Exam'];
    const standardTermLabels = ['1st Monthly', '2nd Monthly', '1st Term', '3rd Monthly', '4th Monthly', '2nd Term', 'Final Exam'];
    const yearsMap = new Map();

    if (familyGrades && familyGrades.length > 0) {
      familyGrades.forEach((g: any) => {
        const year = g.academic_year || '2025-2026';
        if (!yearsMap.has(year)) yearsMap.set(year, { year, termsMap: new Map() });
        if (g.term && !g.is_deleted && g.remarks !== 'PUBLICATION_RECORD') {
          const y = yearsMap.get(year);
          if (!y.termsMap.has(g.term)) y.termsMap.set(g.term, []);
          y.termsMap.get(g.term).push(g);
        }
      });
    }

    const activeAcademicYear = systemSettings?.active_academic_year || '2025-2026';
    const activeTermSetting = systemSettings?.active_term || '1st Monthly';

    if (!yearsMap.has(activeAcademicYear)) yearsMap.set(activeAcademicYear, { year: activeAcademicYear, termsMap: new Map() });

    const results: any[] = [];
    yearsMap.forEach((val, key) => {
      let isFinalPercentile = '-';
      let isFinalGrade = '-';
      let isFinalRank = '-';

      const hasFinalExamRecords = val.termsMap.get('Final Exam')?.length > 0;
      const isFinalPublished = publications?.some(p => p.student_id === activeFamilyStudent?.id && p.term === 'Final Exam' && p.is_published);

      if (hasFinalExamRecords && isFinalPublished) {
        const finalGrades = val.termsMap.get('Final Exam') || [];
        const totalScore = finalGrades.reduce((sum: number, g: any) => sum + (g.score || 0), 0);
        const totalPossible = finalGrades.reduce((sum: number, g: any) => sum + (g.max_score || 100), 0);
        if (totalPossible > 0) {
          const perc = Math.round((totalScore / totalPossible) * 100);
          isFinalPercentile = `${perc}%`;
          if (perc >= 90) isFinalGrade = 'A';
          else if (perc >= 80) isFinalGrade = 'B';
          else if (perc >= 70) isFinalGrade = 'C';
          else if (perc >= 60) isFinalGrade = 'D';
          else isFinalGrade = 'F';
        }
      }

      const percentiels = standardTerms.map((termName, idx) => {
        let valStr = 'N/A';
        const isPublishedForTerm = publications?.some(p => p.student_id === activeFamilyStudent?.id && p.term === termName && p.is_published);
        if (isPublishedForTerm) {
          const gradesForTerm = val.termsMap.get(termName) || [];
          if (gradesForTerm.length > 0) {
            const totalScore = gradesForTerm.reduce((sum: number, g: any) => sum + (g.score || 0), 0);
            const totalPossible = gradesForTerm.reduce((sum: number, g: any) => sum + (g.max_score || 100), 0);
            if (totalPossible > 0) valStr = Math.round((totalScore / totalPossible) * 100) + '%';
          }
        } else if (key === activeAcademicYear && termName === activeTermSetting) {
          valStr = 'Soon';
        }
        return { label: standardTermLabels[idx], val: valStr };
      });

      results.push({ year: key.includes('Academic Year') ? key : `Academic Year ${key}`, percentiels, finalPercentile: isFinalPercentile, finalGrade: isFinalGrade, finalRank: isFinalRank, active: key === activeAcademicYear, terms: standardTerms });
    });

    results.sort((a, b) => b.year.localeCompare(a.year));
    return results;
  }, [familyGrades, publications, activeFamilyStudent, systemSettings]);

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
  const allStudentsInGrade = useMemo(() => allStudentsData?.data || [], [allStudentsData?.data]);

  const [studentGrades, setStudentGrades] = useState<any[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishingAll, setIsPublishingAll] = useState(false);
  const [subTab, setSubTab] = useState<'by-student' | 'by-subject'>('by-student');

  const isSubjectAssignedToTeacher = useCallback((subjectId: string, className: string) => {
    if (isAdmin) return true;
    if (!teacherSchedules) return false;
    return teacherSchedules.some((s: any) => s.subject_id === subjectId && s.classes?.[0]?.name === className);
  }, [teacherSchedules, isAdmin]);

  const { data: printStudentAllGrades, isLoading: isPrintGradesLoading } = useSWR(
    selectedStudentForPrint ? ['all-print-grades', selectedStudentForPrint.id] : null,
    async () => {
      const { data, error } = await supabase.from('grades').select('*').eq('student_id', selectedStudentForPrint.id);
      if (error) return [];
      return data || [];
    }
  );

  const fetchStudentGrades = useCallback(async (studentId: string) => {
    try {
      const { data, error } = await supabase.from('grades').select('*').eq('student_id', studentId).eq('term', currentDbTerm);
      if (error && error.code !== 'PGRST204') throw error;
      return data || [];
    } catch (err) { console.warn('Grades table fetch error:', err); return []; }
  }, [currentDbTerm]);

  const fetchSubjectGrades = useCallback(async (classGrade: string, subjectId: string) => {
    try {
      const studentIds = allStudentsInGrade.map(s => s.id);
      if (studentIds.length === 0) return [];
      const { data, error } = await supabase.from('grades').select('*').in('student_id', studentIds).eq('subject_id', subjectId).eq('term', currentDbTerm);
      if (error && error.code !== 'PGRST204') throw error;
      return data || [];
    } catch (err) { console.warn('Grades table fetch error:', err); return []; }
  }, [allStudentsInGrade, currentDbTerm]);

  const handleSelectClass = (className: string) => {
    setSelectedGrade(className);
    setViewState('class-view');
    setPage(1);
    setSearchQuery('');
  };

  const handleSelectStudent = (student: any) => { setSelectedStudent(student); setViewState('edit-student'); };
  const handleSelectSubject = (subject: any) => { setSelectedSubject(subject); setViewState('edit-subject'); };

  useEffect(() => {
    if (viewState === 'edit-student' && selectedStudent) {
      const load = async () => {
        const existingGrades = await fetchStudentGrades(selectedStudent.id);
        const initialGrades = subjects.map((sub: any) => {
          const existing = existingGrades.find((g: any) => g.subject_id === sub.id);
          const isAssigned = isSubjectAssignedToTeacher(sub.id, selectedGrade);
          return { subject_id: sub.id, subject_name: sub.name, marks: existing?.score ?? existing?.marks ?? '', max_marks: existing?.score_max ?? existing?.max_score ?? existing?.max_marks ?? 100, linked_assessment_id: existing?.assessment_id ?? existing?.linked_assessment_id ?? '', remarks: existing?.remarks ?? '', comments: existing?.comments ?? '', isEditable: isAdmin || isAssigned };
        });
        setStudentGrades(initialGrades);
      };
      load();
    }
  }, [viewState, selectedStudent, currentDbTerm, subjects, fetchStudentGrades, isSubjectAssignedToTeacher, selectedGrade, isAdmin]);

  useEffect(() => {
    if (viewState === 'edit-subject' && selectedSubject && allStudentsInGrade.length > 0) {
      const load = async () => {
        const existingGrades = await fetchSubjectGrades(selectedGrade, selectedSubject.id);
        const initialGrades = allStudentsInGrade.map((student: any) => {
          const existing = existingGrades.find((g: any) => g.student_id === student.id);
          return { student_id: student.id, student_name: student.name, roll_number: student.roll_number ?? student.rollNumber ?? 'N/A', marks: existing?.score ?? existing?.marks ?? '', max_marks: existing?.score_max ?? existing?.max_score ?? existing?.max_marks ?? 100, linked_assessment_id: existing?.assessment_id ?? existing?.linked_assessment_id ?? '', remarks: existing?.remarks ?? '', comments: existing?.comments ?? '' };
        });
        setSubjectGrades(initialGrades);
      };
      load();
    }
  }, [viewState, selectedSubject, allStudentsInGrade, currentDbTerm, selectedGrade, fetchSubjectGrades]);

  const handleSaveStudentGrades = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      const authUser = user?.id;
      const payload = studentGrades.filter((g: any) => g.isEditable && g.marks !== '').map((g: any) => ({
        student_id: selectedStudent.id, subject_id: g.subject_id, academic_year: selectedStudent.academic_year || '2025-2026', term: currentDbTerm, score: parseFloat(g.marks), score_max: parseFloat(g.max_marks), assessment_id: g.linked_assessment_id || null, remarks: g.remarks || '', comments: g.comments || '', graded_by: authUser
      }));

      if (payload.length === 0) { toast.error("Please enter scores for subjects assigned to you"); setIsSaving(false); return; }

      const { error } = await supabase.from('grades').upsert(payload, { onConflict: 'student_id, subject_id, academic_year, term' });
      if (error) throw error;
      toast.success("Academic report counts submitted successfully");
      setViewState('class-view');
      setSelectedStudent(null);
    } catch (error: any) { console.error('Error saving grades:', error); toast.error('Failed to submit scores: ' + error.message); }
    finally { setIsSaving(false); }
  };

  const handleSaveSubjectGrades = async () => {
    if (!selectedSubject) return;
    setIsSaving(true);
    try {
      const authUser = user?.id;
      const payload = subjectGrades.filter((g: any) => g.marks !== '').map((g: any) => ({
        student_id: g.student_id, subject_id: selectedSubject.id, academic_year: '2025-2026', term: currentDbTerm, score: parseFloat(g.marks), score_max: parseFloat(g.max_marks), assessment_id: g.linked_assessment_id || null, remarks: g.remarks || '', comments: g.comments || '', graded_by: authUser
      }));

      if (payload.length === 0) { toast.error("Please fill in marks for at least one student"); setIsSaving(false); return; }

      const { error } = await supabase.from('grades').upsert(payload, { onConflict: 'student_id, subject_id, academic_year, term' });
      if (error) throw error;
      toast.success(`${selectedSubject.name} metrics written successfully`);
      setViewState('class-view');
      setSelectedSubject(null);
    } catch (error: any) { console.error('Error saving grades:', error); toast.error('Failed to submit grades: ' + error.message); }
    finally { setIsSaving(false); }
  };

  const handlePublishToggleSingle = async (student: any, pTerm: string, isCurrentlyPublished: boolean) => {
    if (!isAdmin) { toast.error("Permission denied: Admin authority required to publish report cards"); return; }
    const success = await publishReportCard(student.id, selectedGrade, pTerm, !isCurrentlyPublished);
    if (success) {
      toast.success(`${!isCurrentlyPublished ? 'Published' : 'Unpublished'} ${pTerm} report for ${student.name}`);
      const updatedPublications = isCurrentlyPublished
        ? (publications || []).filter(p => !(p.student_id === student.id && p.term === pTerm))
        : [...(publications || []), { id: `${student.id}-${pTerm}`, student_id: student.id, term: pTerm, is_published: true }];
      mutatePublications(updatedPublications, { revalidate: true });
    } else { toast.error("Could not reconcile publication registry state"); }
  };

  const handlePublishClassWide = async (publishState: boolean) => {
    if (!isAdmin) { toast.error("Permission denied: Admin authority required to publish report cards"); return; }
    if (students.length === 0) { toast.error("No student accounts in this registry scope"); return; }
    setIsPublishingAll(true);
    const targetStudentIds = students.map((s: any) => s.id);
    const success = await publishClassReportCards(selectedGrade, currentDbTerm, targetStudentIds, publishState);
    setIsPublishingAll(false);
    if (success) {
      toast.success(`${publishState ? 'Published' : 'Unpublished'} ${currentDbTerm} for all class attendees`);
      let updatedPublications = [...(publications || [])];
      if (publishState) {
        targetStudentIds.forEach(sid => { if (!updatedPublications.some(p => p.student_id === sid && p.term === currentDbTerm)) updatedPublications.push({ id: `${sid}-${currentDbTerm}`, student_id: sid, term: currentDbTerm, is_published: true }); });
      } else { updatedPublications = updatedPublications.filter(p => !(targetStudentIds.includes(p.student_id) && p.term === currentDbTerm)); }
      mutatePublications(updatedPublications, { revalidate: true });
    } else { toast.error("Mass updates declined by system security rules"); }
  };

  const handleExportExcel = async () => {
    const studentList = allStudentsInGrade.length > 0 ? allStudentsInGrade : students;
    if (studentList.length === 0) { toast.error("No active student rosters located to export"); return; }

    try {
      const studentIds = studentList.map(s => s.id);
      const { data: gradesData, error } = await supabase.from('grades').select('student_id, subject_id, score, score_max, remarks, comments').in('student_id', studentIds).eq('term', currentDbTerm);
      if (error) throw error;

      const subjectCols = subjects.map((s: any) => s.name);
      let csvContent = `Student Name,Roll Number,Academic Year,Term,${subjectCols.join(',')},Total Obtained,Total Maximum,Average Percentage,Final Letter Grade,Instructor Comments\n`;

      studentList.forEach((student: any) => {
        let totalObt = 0;
        let totalMax = 0;
        const allComments: string[] = [];
        const rowData = [`"${student.name}"`, `"${student.roll_number ?? student.rollNumber ?? ''}"`, `"${student.academicYear || '2025-2026'}"`, `"${currentDbTerm}"`];

        subjects.forEach((sub: any) => {
          const grade = gradesData?.find((g: any) => g.student_id === student.id && g.subject_id === sub.id);
          if (grade && grade.score !== null) { rowData.push(grade.score.toString()); totalObt += grade.score; totalMax += (grade.score_max || 100); if (grade.comments) allComments.push(`${sub.name}: ${grade.comments}`); else if (grade.remarks) allComments.push(`${sub.name}: ${grade.remarks}`); }
          else { rowData.push(''); }
        });

        const percentage = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
        const letter = totalMax > 0 ? getLetterGrade(percentage) : 'N/A';

        rowData.push(totalObt.toString(), totalMax.toString(), `${percentage}%`, letter, `"${allComments.join(' | ')}"`);
        csvContent += rowData.join(',') + '\n';
      });

      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${selectedGrade.replace(/\s+/g, '_')}_Academic_Ledger_Export_${currentDbTerm.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Excel-compatible spreadsheet compiled successfully!");
    } catch (err: any) { console.error(err); toast.error("Failed to parse grades data: " + err.message); }
  };

  const handlePrint = () => {
    if (!selectedStudentForPrint) return;
    try { window.print(); toast.success('Print dialog opened'); }
    catch (err: any) { console.error(err); toast.error('Could not open print dialog: ' + err.message); }
  };

  const terms = ['1st Term', '2nd Term', 'Monthly', 'Final Exam'];
  const monthlySubTerms = ['1st Monthly', '2nd Monthly', '3rd Monthly', '4th Monthly'];

  const handleOpenPrint = (student: any, termName: string, template: 'template-a' | 'template-b') => {
    setSelectedStudentForPrint(student);
    setActiveTerm(termName);
    setActiveTemplate(template);
    setPrintModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full gap-6">

      {viewState === 'grades-grid' && (isAdmin || isTeacher) && (
        <ClassGrid classes={classes} teacherSchedules={teacherSchedules} isAdmin={isAdmin} isTeacher={isTeacher} onSelectClass={handleSelectClass} t={t} />
      )}

      {viewState === 'class-view' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 flex-1 flex flex-col">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-card p-6 rounded-3xl border border-border shadow-sm shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setViewState('grades-grid')} className="h-10 w-10 shrink-0 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground hover:bg-background transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">{selectedGrade} {t('roster_database')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{t('roster_database_desc')}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {isAdmin && (
                <div className="flex items-center gap-2 bg-muted p-1.5 rounded-xl border border-border">
                  <select value={activeTerm} onChange={(e) => setActiveTerm(e.target.value)} className="bg-card border border-border rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none">
                    <option value="1st Term">{t('1st_term')}</option>
                    <option value="2nd Term">{t('2nd_term')}</option>
                    <option value="Monthly">{t('monthly_exams')}</option>
                    <option value="Final Exam">{t('final_exam')}</option>
                  </select>
                  {activeTerm === 'Monthly' && (
                    <select value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)} className="bg-card border border-border rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none">
                      {monthlySubTerms.map(m => <option key={m} value={m}>{t(m.toLowerCase().replace(/ /g, '_')) || m}</option>)}
                    </select>
                  )}
                  <button onClick={() => handlePublishClassWide(true)} disabled={isPublishingAll} className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
                    <BookOpenIcon size={14} /> {t('publish_term')}
                  </button>
                  <button onClick={() => handlePublishClassWide(false)} disabled={isPublishingAll} className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
                    <BookOpenIcon size={14} /> {t('unpublish_term')}
                  </button>
                </div>
              )}
              <button onClick={handleExportExcel} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/10 transition-colors">
                <FileSpreadsheet size={16} /> {t('export_all_reports')}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4 shrink-0">
            <div className="flex gap-2">
              <button onClick={() => setSubTab('by-student')} className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-2 ${subTab === 'by-student' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-muted border border-transparent'}`}>
                <User size={16} /> {t('by_student')}
              </button>
              <button onClick={() => setSubTab('by-subject')} className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-2 ${subTab === 'by-subject' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-muted border border-transparent'}`}>
                <BookOpen size={16} /> {t('by_subject')}
              </button>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder={subTab === 'by-student' ? t('search_students') || 'Search students...' : "Search academic courses..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              {subTab === 'by-student' ? (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                    <tr><th className="px-6 py-4 font-bold">{t('roster_name')}</th><th className="px-6 py-4 font-bold">{t('roll_number')}</th><th className="px-6 py-4 font-bold">{t('academic_state')}</th><th className="px-6 py-4 font-bold text-right">{t('actions')}</th></tr>
                  </thead>
                  <tbody>
                    {isStudentsLoading ? [1,2,3].map(i => (
                      <tr key={i} className="border-b border-border"><td className="p-4" colSpan={4}><Skeleton className="h-12 w-full" /></td></tr>
                    )) : students.length === 0 ? (
                      <tr><td colSpan={4} className="p-4"><EmptyData icon={Users} title={t('no_students_found')} description={`${t('no_students_located_in')} ${selectedGrade}.`} height="240px" /></td></tr>
                    ) : (
                      students.map((student: any, idx: number) => {
                        const published = isTermPublished(student.id, currentDbTerm);
                        return (
                          <tr key={`${student.id}-${currentDbTerm}-${idx}`} className="border-b border-border hover:bg-muted/50 transition-colors">
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
                                <button onClick={() => { setSelectedStudentForPrint(student); setPrintModalOpen(true); }} className="p-1 px-2.5 bg-muted text-foreground border border-border text-xs font-bold rounded-lg hover:bg-background transition-colors flex items-center gap-1">
                                  <Printer size={12} /> {t('preview_print')}
                                </button>
                                {isAdmin && (
                                  <button onClick={() => handlePublishToggleSingle(student, currentDbTerm, published)} className={`p-1 px-2.5 text-xs font-bold rounded-lg border transition-colors ${published ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'}`}>
                                    {published ? t('unpublish_term') : t('publish_term')}
                                  </button>
                                )}
                                <button onClick={() => handleSelectStudent(student)} className="p-1 px-3 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/95 transition-all shadow-sm">
                                  {t('grade_entry')}
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
                    <tr><th className="px-6 py-4 font-bold">{t('subject_scheme')}</th><th className="px-6 py-4 font-bold">{t('assigned_instructor')}</th><th className="px-6 py-4 font-bold">{t('subject_code') || 'Subject Code'}</th><th className="px-6 py-4 font-bold text-right">{t('actions')}</th></tr>
                  </thead>
                  <tbody>
                    {subjects
                      .filter((s: any) => s.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
                      .map((sub: any) => {
                        const isAssigned = isSubjectAssignedToTeacher(sub.id, selectedGrade);
                        if (isTeacher && !isAssigned) return null;
                        return (
                          <tr key={sub.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-foreground"><span className="flex items-center gap-2"><BookOpen size={16} className="text-primary/70" /> {sub.name}</span></td>
                            <td className="px-6 py-4 text-muted-foreground text-xs font-medium">{isAssigned ? (isTeacher ? 'Assigned to You' : 'Staff Assigned') : 'Available (Admin Access)'}</td>
                            <td className="px-6 py-4 font-mono text-xs text-muted-foreground uppercase">{sub.code || 'None'}</td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => handleSelectSubject(sub)} className="px-4 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded-lg transition-colors border border-primary/25">Grade All Students</button>
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
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-xs font-bold text-foreground bg-muted border border-border rounded-lg disabled:opacity-50">Previous</button>
              <span className="text-xs font-bold text-muted-foreground">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 text-xs font-bold text-foreground bg-muted border border-border rounded-lg disabled:opacity-50">Next</button>
            </div>
          )}
        </motion.div>
      )}

      {viewState === 'edit-student' && selectedStudent && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setViewState('class-view')} className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors font-bold">
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
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 bg-card border border-border p-1 rounded-xl w-fit">
                {terms.map(term => (
                  <button key={term} onClick={() => setActiveTerm(term)} className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${activeTerm === term ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>{term}</button>
                ))}
              </div>
              {activeTerm === 'Monthly' && (
                <div className="flex items-center gap-1 bg-muted/50 border border-border/85 p-1 rounded-lg w-fit">
                  {monthlySubTerms.map(m => (
                    <button key={m} onClick={() => setActiveMonth(m)} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${activeMonth === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{m}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="p-4 bg-muted/30 border border-border border-dashed rounded-2xl flex items-center gap-3">
              <Shield className="text-primary shrink-0" size={18} />
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                {isTeacher ? "As a teacher, you can only edit grades for subjects assigned to you in the class schedule. Locked courses display a padlock indicator." : "As an Administrator, you have full override control across all subjects in the registry."}
              </p>
            </div>

            <div className="space-y-4 max-w-4xl">
              {studentGrades.map((grade: any, idx: number) => (
                <div key={`${grade.subject_id || idx}-${idx}`} className={`p-4 border rounded-2xl transition-all ${grade.isEditable ? 'border-border bg-card/50 hover:bg-card' : 'border-border/60 bg-muted/20 opacity-80'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-4 font-bold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-2"><BookOpen size={16} className={grade.isEditable ? 'text-primary' : 'text-muted-foreground'}/> {grade.subject_name}</span>
                      {!grade.isEditable && <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold bg-amber-500/5 px-2 py-0.5 rounded-md border border-amber-500/10"><Lock size={10} /> {t('lock_label')}</span>}
                    </div>
                    <div className="md:col-span-3 relative">
                      <input type="number" placeholder={t('score_placeholder')} disabled={!grade.isEditable} value={grade.marks}
                        onChange={(e) => { const val = e.target.value; if (val && (parseFloat(val) < 0 || parseFloat(val) > grade.max_marks)) toast.warning(`${t('score_exceeds_error')} ${grade.max_marks}`); const newGrades = [...studentGrades]; newGrades[idx].marks = val; setStudentGrades(newGrades); }}
                        className="w-full pl-4 pr-12 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-primary disabled:opacity-50 disabled:bg-muted/40"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">/ {grade.max_marks}</span>
                    </div>
                    <div className="md:col-span-5 flex flex-col gap-2">
                      <input type="text" placeholder={t('public_comments_placeholder')} disabled={!grade.isEditable} value={grade.comments}
                        onChange={(e) => { const newGrades = [...studentGrades]; newGrades[idx].comments = e.target.value; setStudentGrades(newGrades); }}
                        className="w-full px-4 py-2 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none disabled:opacity-50 disabled:bg-muted/40 placeholder:text-muted-foreground font-medium text-foreground"
                      />
                      <input type="text" placeholder={t('internal_remarks_placeholder')} disabled={!grade.isEditable} value={grade.remarks}
                        onChange={(e) => { const newGrades = [...studentGrades]; newGrades[idx].remarks = e.target.value; setStudentGrades(newGrades); }}
                        className="w-full px-4 py-1.5 bg-muted/30 border border-border border-dashed rounded-lg text-[10px] focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                      />
                      <select disabled={!grade.isEditable} value={grade.linked_assessment_id}
                        onChange={(e) => { const newGrades = [...studentGrades]; newGrades[idx].linked_assessment_id = e.target.value; setStudentGrades(newGrades); }}
                        className="px-3 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-xs font-medium text-muted-foreground max-w-[150px] disabled:opacity-50"
                      >
                        <option value="">{t('link_exam')}</option>
                        {assessments.filter((a: any) => a.subject_id === grade.subject_id && (a.class_id === selectedGrade || a.grade === selectedGrade)).map((a: any) => <option key={a.id} value={a.id}>{a.title}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-border bg-muted/10 flex justify-end items-center gap-4">
            <button onClick={handleSaveStudentGrades} disabled={isSaving} className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 transition-all disabled:opacity-50 shadow-md shadow-primary/10">
              <Save size={18} /> {t('submit_assessment_scores')}
            </button>
          </div>
        </motion.div>
      )}

      {viewState === 'edit-subject' && selectedSubject && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setViewState('class-view')} className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors font-bold">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">{selectedSubject.name} {t('grading_sheet')}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-primary/10 text-primary rounded-md uppercase tracking-wide">{selectedGrade}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 bg-card border border-border p-1 rounded-xl w-fit">
                {terms.map(term => (
                  <button key={term} onClick={() => setActiveTerm(term)} className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${activeTerm === term ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>{term}</button>
                ))}
              </div>
              {activeTerm === 'Monthly' && (
                <div className="flex items-center gap-1 bg-muted/50 border border-border p-1 rounded-lg w-fit">
                  {monthlySubTerms.map(m => (
                    <button key={m} onClick={() => setActiveMonth(m)} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${activeMonth === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{m}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4 max-w-4xl mx-auto">
              {allStudentsInGrade.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm font-semibold border border-dashed border-border rounded-2xl">{t('no_students_registered')} {selectedGrade}.</div>
              ) : (
                subjectGrades.map((grade: any, idx: number) => (
                  <div key={`${grade.student_id || idx}-${idx}`} className="p-4 border border-border rounded-2xl bg-card/50 hover:bg-card transition-colors flex flex-col md:flex-row md:items-center gap-4 justify-between">
                    <div className="font-bold text-foreground">{grade.student_name} <span className="text-xs font-normal text-muted-foreground block sm:inline-block sm:ml-2 font-mono">{t('roll_label')}: {grade.roll_number}</span></div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <input type="text" placeholder={t('feedback_remarks_placeholder')} value={grade.remarks}
                        onChange={(e) => { const newGrades = [...subjectGrades]; newGrades[idx].remarks = e.target.value; setSubjectGrades(newGrades); }}
                        className="px-4 py-2 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none flex-1 md:w-64"
                      />
                      <div className="relative shrink-0 w-36">
                        <input type="number" placeholder={t('score_placeholder')} value={grade.marks}
                          onChange={(e) => { const newGrades = [...subjectGrades]; newGrades[idx].marks = e.target.value; setSubjectGrades(newGrades); }}
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
            <span className="text-xs font-semibold text-muted-foreground">{t('update_all_scores_notice').replace('{subjectName}', selectedSubject.name)}</span>
            <button onClick={handleSaveSubjectGrades} disabled={isSaving} className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 transition-all disabled:opacity-50 shadow-md">
              <Save size={18} /> {t('update_courses_spreadsheet')}
            </button>
          </div>
        </motion.div>
      )}

      {viewState === 'family-view' && (parentChildren || studentSelfProfile || (isParent || isStudent)) && (
        <FamilyView
          parentChildren={parentChildren}
          studentSelfProfile={studentSelfProfile}
          isChildrenLoading={isChildrenLoading}
          isStudentSelfLoading={isStudentSelfLoading}
          activeFamilyStudent={activeFamilyStudent}
          familyAcademicYears={familyAcademicYears}
          isTermPublished={isTermPublished}
          onOpenPrint={handleOpenPrint}
          t={t}
        />
      )}

      <PrintPreviewModal
        open={printModalOpen}
        student={selectedStudentForPrint}
        printStudentAllGrades={printStudentAllGrades}
        isPrintGradesLoading={isPrintGradesLoading}
        subjects={subjects}
        activeTemplate={activeTemplate}
        onTemplateChange={setActiveTemplate}
        activeTerm={activeTerm}
        currentDbTerm={currentDbTerm}
        systemSettings={systemSettings}
        attendanceSummary={attendanceSummary}
        studentRank={studentRank}
        onPrint={handlePrint}
        onClose={() => setPrintModalOpen(false)}
        t={t}
      />

    </div>
  );
}
