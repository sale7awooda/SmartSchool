'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  User, 
  Wand2,
  AlertCircle,
  LayoutGrid,
  Users,
  BookOpen,
  BarChart3,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { supabase } from '@/lib/supabase/client';
import { getSchedules, getClasses, getTeachers, getActiveAcademicYear } from '@/lib/supabase-db';
import useSWR from 'swr';
import { MOCK_SCHEDULE } from '@/lib/mock-db';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const PERIODS = [
  { id: 1, time: '08:00 AM - 08:50 AM' },
  { id: 2, time: '09:00 AM - 09:50 AM' },
  { id: 3, time: '10:00 AM - 10:50 AM' },
  { id: 'break', time: '10:50 AM - 11:20 AM', label: 'Breakfast Break' },
  { id: 4, time: '11:20 AM - 12:10 PM' },
  { id: 5, time: '12:20 PM - 01:10 PM' },
  { id: 6, time: '01:20 PM - 02:10 PM' },
  { id: 7, time: '02:20 PM - 03:10 PM' },
];

type ViewMode = 'overview' | 'grade' | 'teacher' | 'statistics' | 'load';

export default function AdminScheduleView() {
  const { user } = useAuth();
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { can } = usePermissions();
  const { data: classesData } = useSWR('classes', getClasses);
  const { data: teachersData } = useSWR('teachers', getTeachers);
  
  const grades = useMemo(() => classesData?.map(c => c.name) || ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'], [classesData]);
  const teachers = useMemo(() => teachersData?.map(t => t.name) || ['Mr. Smith', 'Mrs. Davis', 'Dr. Brown'], [teachersData]);

  let availableTabs = [
    { id: 'overview', label: 'School Overview', icon: LayoutGrid },
    { id: 'grade', label: 'Grade View', icon: Users },
    { id: 'teacher', label: 'Teacher View', icon: BookOpen },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'load', label: 'Teacher Load', icon: Briefcase },
  ];

  if (user?.role === 'teacher') {
    availableTabs = [{ id: 'teacher', label: 'My Schedule', icon: BookOpen }];
  } else if (user?.role === 'staff' || user?.role === 'accountant') {
    availableTabs = [{ id: 'overview', label: 'School Overview', icon: LayoutGrid }];
  }

  const [activeTab, setActiveTab] = useState<ViewMode>(availableTabs[0].id as ViewMode);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [selectedGrade, setSelectedGrade] = useState(grades[0]);
  const [selectedTeacher, setSelectedTeacher] = useState(user?.role === 'teacher' ? user.name : teachers[0]);

  useEffect(() => {
    if (grades.length > 0 && !selectedGrade) setSelectedGrade(grades[0]);
    if (teachers.length > 0 && !selectedTeacher && user?.role !== 'teacher') setSelectedTeacher(teachers[0]);
  }, [grades, teachers, selectedGrade, selectedTeacher, user?.role]);

  useEffect(() => {
    async function loadSchedules() {
      try {
        const data = await getSchedules(undefined, activeAcademicYear?.name);
        setSchedules(data);
      } catch (error) {
        console.error('Error loading schedules:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSchedules();

    const channel = supabase
      .channel('schedule_changes_admin')
      .on('postgres_changes', { 
        event: '*', 
        table: 'schedules', 
        schema: 'public'
      }, () => {
        loadSchedules();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeAcademicYear]);

  const getPeriodData = (grade: string, periodId: number, day: string) => {
    const dayIndex = DAYS.indexOf(day) + 1;
    
    const realSchedule = schedules.find(s => 
      s.class_id === grade && 
      s.period === periodId && 
      s.day_of_week === dayIndex
    );

    if (realSchedule) {
      return {
        subject: realSchedule.subject,
        room: realSchedule.room,
        teacherName: realSchedule.teacher?.name || 'Unknown',
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      };
    }

    return MOCK_SCHEDULE.find(s => 
      s.classId === grade && 
      s.period === periodId && 
      s.dayOfWeek === dayIndex
    );
  };

  const getTeacherPeriodData = (teacherName: string, periodId: number, day: string) => {
    const dayIndex = DAYS.indexOf(day) + 1;
    
    const realSchedule = schedules.find(s => 
      s.teacher?.name === teacherName && 
      s.period === periodId && 
      s.day_of_week === dayIndex
    );

    if (realSchedule) {
      return {
        subject: realSchedule.subject,
        room: realSchedule.room,
        grade: realSchedule.class_id,
        color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      };
    }

    return MOCK_SCHEDULE.find(s => 
      s.teacherName === teacherName && 
      s.period === periodId && 
      s.dayOfWeek === dayIndex
    );
  };

  const tabs = availableTabs;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ViewMode)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'bg-muted text-muted-foreground hover:bg-slate-200'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
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

      {/* View Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {DAYS.map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
                      selectedDay === day ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' : 'bg-muted text-muted-foreground hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden overflow-x-auto">
                <div className="min-w-[1000px]">
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

                  <div className="divide-y divide-slate-100">
                    {grades.map(grade => (
                      <div key={grade} className="grid grid-cols-[120px_repeat(7,1fr)]">
                        <div className="p-4 border-r border-border flex items-center justify-center bg-muted/30 font-bold text-foreground">
                          {grade}
                        </div>

                        {PERIODS.map((period, index) => {
                          if (typeof period.id === 'string') {
                            return (
                              <div key={`${grade}-break-${index}`} className="p-2 border-r border-border bg-muted/50 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                              </div>
                            );
                          }

                          const classData = getPeriodData(grade, period.id as number, selectedDay);

                          return (
                            <div key={`${grade}-${period.id}`} className="p-2 border-r border-border last:border-0 min-h-[100px] transition-colors">
                              {classData ? (
                                <div className={`h-full p-2 rounded-xl border ${classData.color} flex flex-col justify-between shadow-sm`}>
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
          )}

          {activeTab === 'grade' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border border-border">
                <label className="font-bold text-sm text-foreground">Select Grade:</label>
                <select 
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="p-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-sm"
                >
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden overflow-x-auto">
                <div className="min-w-[1000px]">
                  <div className="grid grid-cols-[120px_repeat(7,1fr)] border-b border-border bg-muted/80">
                    <div className="p-4 border-r border-border flex items-center justify-center font-bold text-muted-foreground">
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

                  <div className="divide-y divide-slate-100">
                    {DAYS.map(day => (
                      <div key={day} className="grid grid-cols-[120px_repeat(7,1fr)]">
                        <div className="p-4 border-r border-border flex items-center justify-center bg-muted/30 font-bold text-foreground">
                          {day}
                        </div>

                        {PERIODS.map((period, index) => {
                          if (typeof period.id === 'string') {
                            return (
                              <div key={`${day}-break-${index}`} className="p-2 border-r border-border bg-muted/50 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                              </div>
                            );
                          }

                          const classData = getPeriodData(selectedGrade, period.id as number, day);

                          return (
                            <div key={`${day}-${period.id}`} className="p-2 border-r border-border last:border-0 min-h-[100px] transition-colors">
                              {classData ? (
                                <div className={`h-full p-2 rounded-xl border ${classData.color} flex flex-col justify-between shadow-sm`}>
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
          )}

          {activeTab === 'teacher' && (
            <div className="space-y-4">
              {user?.role !== 'teacher' && (
                <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border border-border">
                  <label className="font-bold text-sm text-foreground">Select Teacher:</label>
                  <select 
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className="p-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-sm"
                  >
                    {teachers.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden overflow-x-auto">
                <div className="min-w-[1000px]">
                  <div className="grid grid-cols-[120px_repeat(7,1fr)] border-b border-border bg-muted/80">
                    <div className="p-4 border-r border-border flex items-center justify-center font-bold text-muted-foreground">
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

                  <div className="divide-y divide-slate-100">
                    {DAYS.map(day => (
                      <div key={day} className="grid grid-cols-[120px_repeat(7,1fr)]">
                        <div className="p-4 border-r border-border flex items-center justify-center bg-muted/30 font-bold text-foreground">
                          {day}
                        </div>

                        {PERIODS.map((period, index) => {
                          if (typeof period.id === 'string') {
                            return (
                              <div key={`${day}-break-${index}`} className="p-2 border-r border-border bg-muted/50 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                              </div>
                            );
                          }

                          const classData = getTeacherPeriodData(selectedTeacher, period.id as number, day);

                          return (
                            <div key={`${day}-${period.id}`} className="p-2 border-r border-border last:border-0 min-h-[100px] transition-colors">
                              {classData ? (
                                <div className={`h-full p-2 rounded-xl border ${classData.color} flex flex-col justify-between shadow-sm`}>
                                  <div>
                                    <h4 className="font-bold text-xs leading-tight">{classData.subject}</h4>
                                    <p className="text-[10px] opacity-80 mt-1 flex items-center gap-1">
                                      <MapPin size={10} /> {classData.room}
                                    </p>
                                  </div>
                                  <p className="text-[10px] font-medium opacity-90 mt-2 flex items-center gap-1 truncate">
                                    <Users size={10} /> {classData.grade}
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
          )}

          {activeTab === 'statistics' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-4">Total Classes</h3>
                <p className="text-4xl font-black text-primary">{schedules.length}</p>
                <p className="text-sm text-muted-foreground mt-2">Scheduled across all grades</p>
              </div>
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-4">Active Teachers</h3>
                <p className="text-4xl font-black text-emerald-500">
                  {new Set(schedules.filter(s => s.teacher).map(s => s.teacher.id)).size}
                </p>
                <p className="text-sm text-muted-foreground mt-2">Currently assigned to classes</p>
              </div>
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-4">Grades Scheduled</h3>
                <p className="text-4xl font-black text-amber-500">{grades.length}</p>
                <p className="text-sm text-muted-foreground mt-2">With active timetables</p>
              </div>
            </div>
          )}

          {activeTab === 'load' && (
            <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="p-4 font-bold text-foreground">Teacher Name</th>
                    <th className="p-4 font-bold text-foreground">Total Periods / Week</th>
                    <th className="p-4 font-bold text-foreground">Unique Subjects</th>
                    <th className="p-4 font-bold text-foreground">Unique Grades</th>
                    <th className="p-4 font-bold text-foreground">Load Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map(teacher => {
                    const teacherSchedules = schedules.filter(s => s.teacher?.name === teacher);
                    const totalPeriods = teacherSchedules.length;
                    const uniqueSubjects = new Set(teacherSchedules.map(s => s.subject)).size;
                    const uniqueGrades = new Set(teacherSchedules.map(s => s.class_id)).size;
                    
                    let loadStatus = { label: 'Optimal', color: 'text-emerald-500 bg-emerald-500/10' };
                    if (totalPeriods > 25) loadStatus = { label: 'Overloaded', color: 'text-red-500 bg-red-500/10' };
                    else if (totalPeriods < 10) loadStatus = { label: 'Underutilized', color: 'text-amber-500 bg-amber-500/10' };

                    return (
                      <tr key={teacher} className="hover:bg-muted/50">
                        <td className="p-4 font-bold text-foreground">{teacher}</td>
                        <td className="p-4">{totalPeriods}</td>
                        <td className="p-4">{uniqueSubjects}</td>
                        <td className="p-4">{uniqueGrades}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${loadStatus.color}`}>
                            {loadStatus.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      
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
