import { useState, useMemo, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { supabase } from '@/lib/supabase/client';
import { getPaginatedStudents, getClasses } from '@/lib/supabase-db';
import { Search, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

export function PromotionsTab({ activeAcademicYear, mutateStudents, t }: any) {
  const [scope, setScope] = useState<'all' | 'grade'>('all');
  const [selectedGradeScope, setSelectedGradeScope] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forcePromote, setForcePromote] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [scope, selectedGradeScope]);

  const { mutate } = useSWRConfig();

  const queryFilter = debouncedSearch;
  const gradeFilter = scope === 'grade' ? selectedGradeScope : undefined;

  const { data: studentsResponse, isLoading } = useSWR(
    ['students_for_promotion', page, queryFilter, gradeFilter, activeAcademicYear?.name],
    ([_, p, q, g, y]) => getPaginatedStudents(p as number, limit, q as string, y as string | undefined, g as string | undefined, false)
  );

  const { data: classesData } = useSWR('classes', getClasses);
  const classesList = useMemo(() => classesData?.map((c: any) => c.name) || [], [classesData]);

  const students = useMemo(() => studentsResponse?.data || [], [studentsResponse?.data]);
  const totalPages = studentsResponse?.totalPages || 1;

  const { data: allGrades } = useSWR(
    students.length > 0 ? ['all-grades-promotions', page] : null,
    async () => {
      try {
        const studentIds = students.map((s:any) => s.id);
        if (studentIds.length === 0) return [];
        const { data, error } = await supabase.from('grades').select('*').in('student_id', studentIds);
        if (error) return [];
        return data;
      } catch (e) {
        return [];
      }
    }
  );

  const getExamStatus = (studentId: string) => {
    const studentResults = allGrades?.filter((g: any) => g.student_id === studentId) || [];
    if (studentResults.length === 0) return 'Not Applicable';
    
    if (studentResults.length < 3) return 'Not Yet Promoted';

    const average = studentResults.reduce((acc: number, g: any) => acc + (g.score || 0), 0) / studentResults.length;
    const hasFail = studentResults.some((g: any) => (g.score || 0) < 40);

    if (hasFail && average < 50) return 'Demoted';
    if (average >= 50) return 'Passed';
    return 'Not Yet Promoted';
  };

  const filteredStudents = students;

  // Handle checking all students
  const handleCheckAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Add all currently visible students
      const visibleIds = filteredStudents.map((s: any) => s.id);
      const newSet = new Set(selectedStudents);
      visibleIds.forEach(id => newSet.add(id));
      setSelectedStudents(newSet);
    } else {
      // Remove currently visible students
      const visibleIds = filteredStudents.map((s: any) => s.id);
      const newSet = new Set(selectedStudents);
      visibleIds.forEach(id => newSet.delete(id));
      setSelectedStudents(newSet);
    }
  };

  const handleCheckStudent = (id: string, checked: boolean) => {
    const newSet = new Set(selectedStudents);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedStudents(newSet);
  };

  const [nextGrades, setNextGrades] = useState<Record<string, string>>({});

  const suggestNextGrade = (currentGrade: string) => {
    const match = currentGrade.match(/\d+/);
    if (match) {
      const nextNum = parseInt(match[0]) + 1;
      const next = `Grade ${nextNum}`;
      if (classesList.includes(next)) return next;
    }
    return 'Graduated';
  };

  const handlePromote = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select students to promote');
      return;
    }

    setIsSubmitting(true);
    try {
      // We need the student objects for promotion, since they are paginated, we'd need to fetch them from the selected IDs
      // but to keep it simple and safe we can just fetch the selected students.
      const selectedArr = Array.from(selectedStudents);
      const { data: studentsToPromote, error: fetchErr } = await supabase.from('students').select('*').in('id', selectedArr);
      
      if (fetchErr || !studentsToPromote) throw new Error('Could not fetch selected students');

      const nextYear = activeAcademicYear ? 
        `${parseInt(activeAcademicYear.name.split('-')[1])}-${parseInt(activeAcademicYear.name.split('-')[1]) + 1}` : 
        '2026-2027';

      for (const student of studentsToPromote) {
        const targetGrade = nextGrades[student.id] || suggestNextGrade(student.grade);
        
        await supabase
          .from('students')
          .update({ 
            grade: targetGrade, 
            academic_year: nextYear 
          })
          .eq('id', student.id);

        await supabase
          .from('academic_enrollments')
          .insert([{
            student_id: student.id,
            academic_year: nextYear,
            grade: targetGrade,
            status: targetGrade === 'Graduated' ? 'completed' : 'active'
          }]);
      }

      toast.success(`Successfully promoted ${selectedStudents.size} students`);
      mutateStudents(); 
      mutate(['students_for_promotion', page, queryFilter, gradeFilter, activeAcademicYear?.name]); 
      setSelectedStudents(new Set());
      setNextGrades({});
    } catch (error) {
      console.error(error);
      toast.error('Failed to promote students');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAllVisibleSelected = filteredStudents.length > 0 && filteredStudents.every((s:any) => selectedStudents.has(s.id));

  return (
    <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
      <div className="bg-card dark:bg-slate-900 p-6 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t('student_promotions')}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t('student_promotions_desc') || 'Manage and approve student grade promotions for the upcoming academic year.'}</p>
          </div>
          <button
            onClick={handlePromote}
            disabled={selectedStudents.size === 0 || isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GraduationCap size={18} />
            Promote Selected ({selectedStudents.size})
          </button>
        </div>

        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              {(['all', 'grade'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setScope(s);
                    setSelectedStudents(new Set());
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${
                    scope === s
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {s === 'all' ? 'All School' : 'By Grade'}
                </button>
              ))}
            </div>

            {scope === 'grade' && (
              <select
                value={selectedGradeScope}
                onChange={(e) => setSelectedGradeScope(e.target.value)}
                className="px-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Grade</option>
                {classesList.map((g: string) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            )}

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground">
            <input
              type="checkbox"
              checked={forcePromote}
              onChange={(e) => setForcePromote(e.target.checked)}
              className="rounded border-border text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
            Force Promotions Override
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="bg-card dark:bg-slate-900 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 w-12">
                     <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={handleCheckAll}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-6 py-4 font-bold">{t('student')}</th>
                  <th className="px-6 py-4 font-bold">Current Grade</th>
                  <th className="px-6 py-4 font-bold">Exam Status</th>
                  <th className="px-6 py-4 font-bold">Promote To</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No students found.</td></tr>
                ) : (
                  filteredStudents.map((student: any) => {
                    const status = getExamStatus(student.id);
                    const canPromote = status !== 'Not Applicable';
                    
                    return (
                      <tr key={student.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-6 py-4">
                           <input
                            type="checkbox"
                            checked={selectedStudents.has(student.id)}
                            disabled={!canPromote && !forcePromote} 
                            onChange={(e) => handleCheckStudent(student.id, e.target.checked)}
                            className="rounded border-border text-primary focus:ring-primary disabled:opacity-30"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground">{student.name}</div>
                          <div className="text-xs text-muted-foreground">{student.roll_number || student.rollNumber}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-muted text-foreground border border-border">
                            {student.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            status === 'Passed' ? 'bg-emerald-500/10 text-emerald-500' : 
                            status === 'Demoted' ? 'bg-amber-500/10 text-amber-500' :
                            status === 'Not Applicable' ? 'bg-muted text-muted-foreground' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={nextGrades[student.id] || (status === 'Demoted' ? student.grade : suggestNextGrade(student.grade))}
                            onChange={(e) => setNextGrades({ ...nextGrades, [student.id]: e.target.value })}
                            className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-32"
                          >
                            {classesList.map((g: string) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                            <option value="Graduated">Graduated</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 0 && (
             <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
               <button
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 disabled={page === 1}
                 className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50"
               >
                 Previous
               </button>
               <span className="text-sm font-medium text-muted-foreground">
                  Page {page} of {totalPages}
               </span>
               <button
                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                 disabled={page === totalPages}
                 className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50"
               >
                 Next
               </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
