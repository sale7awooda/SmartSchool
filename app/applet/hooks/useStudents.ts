import useSWR from 'swr';
import { 
  getPaginatedStudents, 
  getBehaviorRecords, 
  getTimelineRecords,
  getClasses,
  getFeeItems,
  getPaginatedParents,
  getActiveAcademicYear
} from '@/lib/supabase-db';

export function useStudents(page: number, limit: number, search: string, academicYear?: string, isDeleted: boolean = false) {
  const { data, error, isLoading, mutate } = useSWR(
    ['students', page, search, academicYear, isDeleted],
    () => getPaginatedStudents(page, limit, search, academicYear, isDeleted)
  );

  return {
    students: data?.data || [],
    total: data?.count || 0,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    mutate
  };
}

export function useStudentDetails(studentId: string | null) {
  const { data: behaviorData, isLoading: isBehaviorLoading } = useSWR(
    studentId ? ['behavior', studentId] : null,
    () => getBehaviorRecords(studentId!)
  );

  const { data: timelineData, isLoading: isTimelineLoading } = useSWR(
    studentId ? ['timeline', studentId] : null,
    () => getTimelineRecords(studentId!)
  );

  return {
    behaviorData,
    timelineData,
    isLoading: isBehaviorLoading || isTimelineLoading
  };
}

export function useStudentFormData() {
  const { data: classesData } = useSWR('classes', getClasses);
  const { data: feeItemsData } = useSWR('fee_items', getFeeItems);
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);

  return {
    classesData,
    feeItemsData,
    activeAcademicYear
  };
}

export function useParentSearch(searchQuery: string) {
  const { data, isLoading } = useSWR(
    searchQuery.length >= 2 ? ['parents_search', searchQuery] : null,
    () => getPaginatedParents(1, 10, searchQuery)
  );

  return {
    parents: data?.data || [],
    isLoading
  };
}
