'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { format, addDays, subDays } from 'date-fns';
import { 
  CalendarDays, 
  MapPin, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Wand2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/lib/permissions';
import { supabase } from '@/lib/supabase/client';
import { getSchedules, getClasses } from '@/lib/supabase-db';
import useSWR from 'swr';

import { MOCK_SCHEDULE } from '@/lib/mock-db';

// Mock data for the master schedule
const GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
const PERIODS = [
  { id: 1, time: '08:00 AM - 08:50 AM' },
  { id: 2, time: '09:00 AM - 09:50 AM' },
  { id: 3, time: '10:00 AM - 10:50 AM' },
  { id: 'break', time: '10:50 AM - 11:20 AM', label: 'Breakfast Break' },
  { id: 4, time: '11:20 AM - 12:10 PM' },
  { id: 5, time: '12:20 PM - 01:10 PM' },
  { id: 6, time: '01:20 PM - 02:10 PM' },
];

export default function AdminScheduleView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { can } = usePermissions();
  const { data: classesData } = useSWR('classes', getClasses);
  const grades = classesData?.map(c => c.name) || ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

  useEffect(() => {
    async function loadSchedules() {
      try {
        const data = await getSchedules();
        setSchedules(data);
      } catch (error) {
        console.error('Error loading schedules:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSchedules();

    // Real-time subscription
    const channel = supabase
      .channel('schedule_changes_admin')
      .on('postgres_changes', { event: '*', table: 'schedules', schema: 'public' }, () => {
        loadSchedules();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handlePreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));

  const getPeriodData = (grade: string, periodId: number) => {
    const dayOfWeek = selectedDate.getDay(); // 0 is Sunday, 1 is Monday...
    // Adjust dayOfWeek to match our 1-5 (Mon-Fri) system
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    // Check real data first
    const realSchedule = schedules.find(s => 
      s.class_id === grade && 
      s.period === periodId && 
      s.day_of_week === adjustedDay
    );

    if (realSchedule) {
      return {
        subject: realSchedule.subject,
        room: realSchedule.room,
        teacherName: realSchedule.teacher?.name || 'Unknown',
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' // Default color
      };
    }

    // Fallback to mock data if no real data
    return MOCK_SCHEDULE.find(s => 
      s.classId === grade && 
      s.period === periodId && 
      s.dayOfWeek === adjustedDay
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-muted rounded-xl p-1 border border-border">
            <button 
              onClick={handlePreviousDay}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-card rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 py-2 font-bold text-foreground min-w-[140px] text-center flex items-center justify-center gap-2">
              <CalendarDays size={18} className="text-primary" />
              {format(selectedDate, 'EEEE, MMM d')}
            </div>
            <button 
              onClick={handleNextDay}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-card rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {can('create', 'schedule') && (
            <Link 
              href="/dashboard/schedule/wizard"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
            >
              <Wand2 size={16} />
              Timetable Wizard
            </Link>
          )}
        </div>
      </div>

      {/* Master Schedule Grid */}
      <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Header Row (Periods) */}
          <div className="grid grid-cols-[120px_repeat(7,1fr)] border-b border-border bg-muted/80">
            <div className="p-4 border-r border-border flex items-center justify-center font-bold text-muted-foreground">
              Grades
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
            {grades.map(grade => (
              <div key={grade} className="grid grid-cols-[120px_repeat(7,1fr)]">
                {/* Grade Column */}
                <div className="p-4 border-r border-border flex items-center justify-center bg-muted/30 font-bold text-foreground">
                  {grade}
                </div>

                {/* Period Columns */}
                {PERIODS.map((period, index) => {
                  if (typeof period.id === 'string') {
                    return (
                      <div key={`${grade}-break-${index}`} className="p-2 border-r border-border bg-muted/50 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                      </div>
                    );
                  }

                  const classData = getPeriodData(grade, period.id as number);

                  return (
                    <div 
                      key={`${grade}-${period.id}`}
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
      
      <div className="bg-blue-500/10 text-blue-500 p-4 rounded-xl flex items-start gap-3 text-sm">
        <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold">Read-Only Master Schedule</p>
          <p className="mt-1 opacity-90">This view is read-only. To resolve conflicts, map subjects, or create a new schedule, please open the Timetable Wizard.</p>
        </div>
      </div>
    </div>
  );
}
