'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CalendarDays, 
  MapPin, 
  User, 
  ChevronDown,
  Clock,
  Loader2
} from 'lucide-react';
import { MOCK_SCHEDULE } from '@/lib/mock-db';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { getStudents, getSchedules, getActiveAcademicYear } from '@/lib/supabase-db';
import useSWR from 'swr';

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
];

const PERIODS = [
  { id: 1, time: '08:00 AM - 08:50 AM' },
  { id: 2, time: '09:00 AM - 09:50 AM' },
  { id: 'break', time: '09:50 AM - 10:10 AM', label: 'Morning Break' },
  { id: 3, time: '10:10 AM - 11:00 AM' },
  { id: 4, time: '11:10 AM - 12:00 PM' },
  { id: 'lunch', time: '12:00 PM - 12:50 PM', label: 'Lunch Break' },
  { id: 5, time: '12:50 PM - 01:40 PM' },
  { id: 6, time: '01:50 PM - 02:40 PM' },
];

export default function StudentScheduleView() {
  const { user } = useAuth();
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const [students, setStudents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [studentsData, schedulesData] = await Promise.all([
          getStudents(activeAcademicYear?.name),
          getSchedules(undefined, activeAcademicYear?.name)
        ]);
        
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

        setStudents(filteredStudents);
        if (filteredStudents.length > 0) {
          setSelectedStudentId(filteredStudents[0].id);
        }
        setSchedules(schedulesData);
      } catch (error) {
        console.error('Error loading schedule data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    // Real-time subscription
    const channel = supabase
      .channel('schedule_changes_student')
      .on('postgres_changes', { 
        event: '*', 
        table: 'schedules', 
        schema: 'public'
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeAcademicYear]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];

  if (!selectedStudent) {
    return <div className="p-4">No student data available.</div>;
  }

  const getPeriodData = (dayId: number, periodId: number) => {
    const grade = selectedStudent.grade || 'Grade 4';
    
    // Check real data first
    const realSchedule = schedules.find(s => 
      s.class_id === grade && 
      s.period === periodId && 
      s.day_of_week === dayId
    );

    if (realSchedule) {
      return {
        subject: realSchedule.subject,
        room: realSchedule.room,
        teacherName: realSchedule.teacher?.name || 'Unknown',
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      };
    }

    // Fallback to mock data
    return MOCK_SCHEDULE.find(s => s.dayOfWeek === dayId && s.period === periodId && s.classId === grade);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold shadow-inner">
            {selectedStudent.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-foreground">{selectedStudent.name}</h3>
            <p className="text-xs font-medium text-muted-foreground">{selectedStudent.grade} • ID: {selectedStudent.id}</p>
          </div>
        </div>

        {students.length > 1 && (
          <div className="relative group">
            <select 
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-muted border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors cursor-pointer"
            >
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}
      </div>

      {/* Weekly Schedule Grid */}
      <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Header Row (Periods) */}
          <div className="grid grid-cols-[120px_repeat(8,1fr)] border-b border-border bg-muted/80">
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
              <div key={day.id} className="grid grid-cols-[120px_repeat(8,1fr)]">
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

                  const classData = getPeriodData(day.id, period.id as number);

                  return (
                    <div 
                      key={`${day.id}-${period.id}`}
                      className="p-2 border-r border-border last:border-0 min-h-[100px] transition-colors"
                    >
                      {classData ? (
                        <div
                          className={`h-full p-2 rounded-xl border ${classData.color} flex flex-col justify-between shadow-sm`}
                        >
                          <div>
                            <h4 className="font-bold text-xs leading-tight">{classData.subject}</h4>
                            <p className="text-[10px] opacity-80 mt-1 flex items-center gap-1">
                              <MapPin size={10} /> {classData.room}
                            </p>
                          </div>
                          <p className="text-[10px] font-medium opacity-90 mt-2 flex items-center gap-1 truncate">
                            <User size={10} /> {classData.teacherName}
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
