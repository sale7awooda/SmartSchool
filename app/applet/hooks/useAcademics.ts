import useSWR from 'swr';
import { 
  getAcademicYears, 
  getClasses, 
  getSubjects,
  getActiveAcademicYear
} from '@/lib/supabase-db';

export function useAcademics() {
  const { data: academicYears, isLoading: isYearsLoading, mutate: mutateYears } = useSWR('academicYears', getAcademicYears);
  const { data: classes, isLoading: isClassesLoading, mutate: mutateClasses } = useSWR('classes', getClasses);
  const { data: subjects, isLoading: isSubjectsLoading, mutate: mutateSubjects } = useSWR('subjects', getSubjects);
  const { data: activeYear } = useSWR('activeAcademicYear', getActiveAcademicYear);

  return {
    academicYears,
    classes,
    subjects,
    activeYear,
    isLoading: isYearsLoading || isClassesLoading || isSubjectsLoading,
    mutateYears,
    mutateClasses,
    mutateSubjects
  };
}
