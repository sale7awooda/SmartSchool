import useSWR from 'swr';
import { 
  getPaginatedStaff, 
  getLeaveRequests, 
  getPayslips 
} from '@/lib/supabase-db';

export function useStaff(page: number = 1, limit: number = 10, search: string = '') {
  const { data, isLoading, mutate } = useSWR(
    ['staff', page, search],
    () => getPaginatedStaff(page, limit, search)
  );

  return {
    staff: data?.staff || [],
    total: data?.total || 0,
    isLoading,
    mutate
  };
}

export function useLeaveRequests() {
  const { data, isLoading, mutate } = useSWR('leaveRequests', getLeaveRequests);

  return {
    leaveRequests: data || [],
    isLoading,
    mutate
  };
}

export function usePayslips() {
  const { data, isLoading, mutate } = useSWR('payslips', getPayslips);

  return {
    payslips: data || [],
    isLoading,
    mutate
  };
}
