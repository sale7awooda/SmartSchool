import { useState, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { supabase } from '@/lib/supabase/client';
import { getPaginatedStudents, getClasses } from '@/lib/supabase-db';
import { Search, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

export function PromotionsTab({ activeAcademicYear, mutateStudents, t }: any) {
  const [scope, setScope] = useState<'all' | 'grade' | 'manual'>('all');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutate } = useSWRConfig();

  // We fetch a large number of students for this view, or we can use pagination.
  // For 'all' scope, practically we might need a lot 
  const { data: studentsResponse, isLoading } = useSWR(
    ['students_for_promotion', activeAcademicYear?.name],
    ([_, year]) => getPaginatedStudents(1, 1000, '', undefined, false) // Fetching up to 1000 for bulk promotion, passing undefined for year so all active show
  );

  const { data: classesData } = useSWR('classes', getClasses);
  const classesList = classesData?.map((c: any) => c.name) || [];

  const students = studentsResponse?.data || [];

  const filteredStudents = useMemo(() => {
    let list = [...students];
    if (scope === 'grade' && selectedGrade) {
      list = list.filter((s: any) => s.grade === selectedGrade);
    } else if (scope === 'manual' && searchQuery) {
      const lowerSearch = searchQuery.toLowerCase();
      list = list.filter((s: any) => 
        s.name?.toLowerCase().includes(lowerSearch) || 
        s.roll_number?.toLowerCase().includes(lowerSearch)
      );
    }
    // Sort by grade, then name
    return list.sort((a: any, b: any) => {
      const gCmp = (a.grade || '').localeCompare(b.grade || '');
      if (gCmp !== 0) return gCmp;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [students, scope, selectedGrade, searchQuery]);

  // Handle checking all students
  const handleCheckAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSet = new Set(filteredStudents.map((s: any) => s.id));
      setSelectedStudents(newSet);
    } else {
      setSelectedStudents(new Set());
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

  // Auto-suggest next grade
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
      const studentsToPromote = filteredStudents.filter((s: any) => selectedStudents.has(s.id));
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
      mutateStudents(); // Update main directory
      mutate(['students_for_promotion', activeAcademicYear?.name]); // Update promotions list specifically
      setSelectedStudents(new Set());
      setNextGrades({});
    } catch (error) {
      console.error(error);
      toast.error('Failed to promote students');
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <div className="mt-6 flex flex-col sm:flex-row gap-4 border-b border-border pb-4">
          <div className="flex gap-2">
            {(['all', 'grade', 'manual'] as const).map((s) => (
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
                {s === 'all' ? 'All School' : s === 'grade' ? 'By Grade' : 'Manual'}
              </button>
            ))}
          </div>

          {scope === 'grade' && (
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select Grade</option>
              {classesList.map((g: string) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          )}

          {scope === 'manual' && (
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
          )}
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
                      checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
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
                    const isPassed = true; // Simulating passed exams for now
                    return (
                      <tr key={student.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedStudents.has(student.id)}
                            onChange={(e) => handleCheckStudent(student.id, e.target.checked)}
                            className="rounded border-border text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground">{student.name}</div>
                          <div className="text-xs text-muted-foreground">{student.roll_number}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-muted text-foreground border border-border">
                            {student.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${isPassed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {isPassed ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={nextGrades[student.id] || suggestNextGrade(student.grade)}
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
        </div>
      </div>
    </div>
  );
}
