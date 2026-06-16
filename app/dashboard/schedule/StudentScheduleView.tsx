'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  CalendarDays, 
  MapPin, 
  User, 
  ChevronDown,
  Clock,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { getStudents, getActiveAcademicYear } from '@/lib/supabase-db';
import { getSchedulesAction } from '@/app/actions/schedule';
import useSWR from 'swr';

const DAYS = [
  { id: 1, name: 'Sunday' },
  { id: 2, name: 'Monday' },
  { id: 3, name: 'Tuesday' },
  { id: 4, name: 'Wednesday' },
  { id: 5, name: 'Thursday' },
];

const COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200', 
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-purple-100 text-purple-800 border-purple-200', 
  'bg-amber-100 text-amber-800 border-amber-500/20', 
  'bg-pink-100 text-pink-800 border-pink-200', 
  'bg-orange-100 text-orange-800 border-orange-200'
];

const getColorForSubject = (subject: string) => {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
};

const PERIODS = [
  { id: 1, time: '08:00 AM - 08:50 AM' },
  { id: 2, time: '09:00 AM - 09:50 AM' },
  { id: 3, time: '10:00 AM - 10:50 AM' },
  { id: 'break', time: '10:50 AM - 11:20 AM', label: 'Break' },
  { id: 4, time: '11:20 AM - 12:10 PM' },
  { id: 5, time: '12:20 PM - 01:10 PM' },
  { id: 6, time: '01:20 PM - 02:10 PM' },
  { id: 7, time: '02:20 PM - 03:10 PM' },
];

export default function StudentScheduleView() {
  const { user } = useAuth();
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const { data: studentsData, isLoading: isStudentsLoading } = useSWR(
    activeAcademicYear ? ['students-for-schedule', activeAcademicYear.name] : null,
    () => getStudents(activeAcademicYear?.name)
  );

  const { data: schedulesData, isLoading: isSchedulesLoading, mutate: mutateSchedules } = useSWR(
    activeAcademicYear ? ['schedules-student-view', activeAcademicYear.name] : null,
    () => getSchedulesAction(undefined, activeAcademicYear?.name)
  );

  const students = useMemo(() => {
    if (!studentsData) return [];
    let filteredStudents: any[] = [];
    if (user?.role === 'parent' && user.studentIds) {
      filteredStudents = studentsData.filter(s => user.studentIds?.includes(s.id));
    } else if (user?.role === 'student' || user?.studentId) {
      const studentData = studentsData.find(s => s.id === user.studentId);
      if (studentData) {
        filteredStudents = [studentData];
      }
    } else if (user?.role === 'teacher') {
      filteredStudents = studentsData;
    }

    if (filteredStudents.length === 0 && studentsData.length > 0) {
      filteredStudents = [studentsData[0]];
    }
    return filteredStudents;
  }, [studentsData, user]);

  const schedules = schedulesData || [];
  const isLoading = isStudentsLoading || isSchedulesLoading;

  useEffect(() => {
    if (students && students.length > 0 && !selectedStudentId) {
      const currentGlobalId = user?.studentId;
      const hasGlobalInFiltered = students.some(s => s.id === currentGlobalId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedStudentId(hasGlobalInFiltered && currentGlobalId ? currentGlobalId : students[0].id);
    }
  }, [students, user?.studentId, selectedStudentId]);

  useEffect(() => {
    // Real-time subscription
    const channel = supabase
      .channel('schedule_changes_student')
      .on('postgres_changes', { 
        event: '*', 
        table: 'schedules', 
        schema: 'public'
      }, () => {
        mutateSchedules();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutateSchedules]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeStudentId = user?.studentId;
  const currentStudentId = (user?.role === 'parent' && activeStudentId) ? activeStudentId : selectedStudentId;
  const selectedStudent = students.find(s => s.id === currentStudentId) || students[0];

  if (!selectedStudent) {
    return <div className="p-4">No student data available.</div>;
  }

  const getPeriodData = (dayName: string, periodId: number) => {
    const grade = selectedStudent.grade || 'Grade 4';
    
    // Check real data first
    const realSchedule = schedules.find(s => 
      s.class?.name === grade && 
      s.period === periodId && 
      s.day_of_week === dayName
    );

    if (realSchedule) {
      return {
        subject: realSchedule.subject?.name || 'Unknown',
        teacherName: realSchedule.teacher?.name || 'Unknown',
        color: getColorForSubject(realSchedule.subject?.name || 'Unknown')
      };
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Weekly Schedule Grid */}
      <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden overflow-x-auto">
        <div className="min-w-[1100px]">
          {/* Header Row (Periods) */}
          <div 
            className="grid border-b border-border bg-muted/80"
            style={{ gridTemplateColumns: '120px repeat(3, 1fr) 60px repeat(4, 1fr)' }}
          >
            <div className="p-4 border-r border-border flex items-center justify-center font-bold text-muted-foreground">
              <CalendarDays size={20} className="mr-2 text-primary" />
              Days
            </div>
            {PERIODS.map((period, index) => (
              <div key={index} className="p-3 border-r border-border last:border-0 flex flex-col items-center justify-center text-center">
                {typeof period.id === 'string' ? (
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{period.label}</span>
                ) : (
                  <>
                    <span className="text-xs font-bold text-foreground">Period {period.id}</span>
                    <span className="text-[10px] font-medium text-muted-foreground mt-1">{period.time}</span>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="divide-y divide-slate-100">
            {DAYS.map(day => (
              <div 
                key={day.id} 
                className="grid"
                style={{ gridTemplateColumns: '120px repeat(3, 1fr) 60px repeat(4, 1fr)' }}
              >
                {/* Day Column */}
                <div className="p-4 border-r border-border flex items-center justify-center bg-muted/30 font-bold text-foreground">
                  {day.name}
                </div>

                {/* Period Columns */}
                {PERIODS.map((period, index) => {
                  if (typeof period.id === 'string') {
                    return (
                      <div key={`${day.id}-break-${index}`} className="p-2 border-r border-border bg-muted/50 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                      </div>
                    );
                  }

                  const classData = getPeriodData(day.name, period.id as number);

                  return (
                    <div 
                      key={`${day.id}-${period.id}`}
                      className="p-2 border-r border-border last:border-0 min-h-[70px] transition-colors"
                    >
                      {classData ? (
                        <div
                          className={`h-full p-2 rounded-xl border ${classData.color} flex flex-col justify-between shadow-sm`}
                        >
                          <div>
                            <h4 className="font-bold text-sm leading-tight">{classData.subject}</h4>
                          </div>
                          <p className="text-xs font-medium opacity-90 mt-2 flex items-center gap-1 truncate">
                            <User size={12} /> {classData.teacherName}
                          </p>
                        </div>
                      ) : (
                        <div className="h-full rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground font-medium">Free</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
