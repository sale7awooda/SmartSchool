'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { Student } from '@/lib/mock-db';
import { supabase } from '@/lib/supabase/client';
import { getStudents, getAttendance, saveAttendance, getAttendanceHistory, getStudentAttendance, getAttendanceByClass, getStudentById, getActiveAcademicYear } from '@/lib/supabase-db';
import { CheckCircle2, XCircle, Clock, Save, Loader2, ChevronLeft, Calendar, Filter, X, ChevronRight, Search, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from "sonner";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type AttendanceStatus = 'present' | 'absent' | 'late' | null;

export default function AttendancePage() {
  const { user } = useAuth();
  const { can, isRole } = usePermissions();
  
  if (!user) return null;

  if (!can('view', 'attendance')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  if (isRole(['teacher'])) return <TeacherAttendance />;
  if (isRole(['parent', 'student'])) return <StudentAttendanceView />;
  if (isRole(['admin', 'staff', 'accountant'])) return <AdminAttendance />;

  return <div className="p-4">You do not have permission to view this page.</div>;
}

function TeacherAttendance() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const classFilter = searchParams.get('class');
  
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function loadData() {
      try {
        const [studentsData, attendanceData, historyData] = await Promise.all([
          getStudents(activeAcademicYear?.name, false, classFilter || undefined),
          getAttendance(selectedDate),
          getAttendanceHistory()
        ]);
        
        setStudents(studentsData);
        setHistory(historyData);
        
        const initialAttendance: Record<string, AttendanceStatus> = {};
        attendanceData.forEach((record: any) => {
          initialAttendance[record.student_id] = record.status;
        });
        setAttendance(initialAttendance);
      } catch (error) {
        console.error('Error loading attendance data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    // Real-time subscription
    const channel = supabase
      .channel('attendance_changes')
      .on('postgres_changes', { event: '*', table: 'attendance', schema: 'public' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, activeAcademicYear?.name]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
    setIsSaved(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const attendancePayload = Object.entries(attendance)
        .filter(([_, status]) => status !== null)
        .map(([studentId, status]) => ({
          student_id: studentId,
          status,
          date: selectedDate,
          marked_by: user.id
        }));

      await saveAttendance(attendancePayload);
      setIsSaved(true);
      toast.success("Attendance saved successfully", {
        description: `Recorded attendance for ${attendancePayload.length} students.`,
      });
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error("Failed to save attendance");
    } finally {
      setIsSaving(false);
    }
  };

  const allMarked = students.length > 0 && Object.keys(attendance).length === students.length;

  if (isLoading) {
    return (
      <div className="space-y-8 h-full flex flex-col p-4 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-muted rounded-xl" />
            <div className="h-5 w-96 bg-muted rounded-xl" />
          </div>
          <div className="h-12 w-48 bg-muted rounded-xl" />
        </div>
        <div className="flex gap-4">
          <div className="h-12 w-48 bg-muted rounded-xl" />
          <div className="h-12 w-48 bg-muted rounded-xl" />
        </div>
        <div className="flex-1">
          <div className="h-full min-h-[400px] bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (activeTab === 'history') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('attendance_history')}</h1>
            <p className="text-muted-foreground mt-2 font-medium">{t('attendance_history_desc')}</p>
          </div>
          <button 
            onClick={() => setActiveTab('mark')}
            className="px-5 py-2.5 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-2"
          >
            <ChevronLeft size={18} className="rtl:rotate-180" />
            {t('back_to_marking')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-medium">{t('no_history_found')}</p>
            </div>
          ) : (
            history.map((record, i) => (
              <div key={i} className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary/5 text-primary">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-lg">{new Date(record.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-sm font-medium text-muted-foreground">{record.present + record.absent + record.late + record.excused} {t('students_marked')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-emerald-500">{record.present} {t('present')}</p>
                    <p className="text-sm font-bold text-destructive">{record.absent} {t('absent')}</p>
                  </div>
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                    <ChevronRight size={20} className="rtl:rotate-180" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('mark_attendance')}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-muted-foreground font-medium focus:ring-0 cursor-pointer hover:text-foreground transition-colors"
              />
            </div>
            {classFilter && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                {t('class')}: {classFilter}
                <Link href="/dashboard/attendance" className="hover:text-primary/80">
                  <X size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('history')}
            className="px-5 py-2.5 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-2"
          >
            <Clock size={18} />
            {t('history')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 pb-24">
        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card rounded-[2rem] border border-border border-dashed">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground mb-4">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-bold text-foreground">{t('no_students_found')}</h3>
            <p className="text-muted-foreground mt-2 text-center max-w-xs">
              {t('no_students_attendance_desc')}
            </p>
            <Link 
              href="/dashboard/students?add=true"
              className="mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              {t('register_student')}
            </Link>
          </div>
        ) : (
          students.map((student) => {
            const status = attendance[student.id];
            return (
              <div key={student.id} className="bg-card p-5 rounded-[1.5rem] border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground font-bold text-lg">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{student.name}</p>
                    <p className="text-xs font-medium text-muted-foreground">ID: {student.roll_number || student.id.substring(0, 8)}</p>
                  </div>
                </div>

                <div className="flex gap-2 bg-muted/50 p-1.5 rounded-2xl">
                  <button
                    onClick={() => handleStatusChange(student.id, 'present')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      status === 'present' ? 'bg-card text-emerald-500 shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <CheckCircle2 size={18} className={status === 'present' ? 'fill-emerald-500/20' : ''} />
                    <span className="sm:hidden md:inline">{t('present')}</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange(student.id, 'late')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      status === 'late' ? 'bg-card text-amber-500 shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Clock size={18} className={status === 'late' ? 'fill-amber-500/20' : ''} />
                    <span className="sm:hidden md:inline">{t('late')}</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange(student.id, 'absent')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      status === 'absent' ? 'bg-card text-destructive shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <XCircle size={18} className={status === 'absent' ? 'fill-destructive/20' : ''} />
                    <span className="sm:hidden md:inline">{t('absent')}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="fixed bottom-20 md:bottom-8 left-0 right-0 px-4 md:px-10 max-w-5xl mx-auto pointer-events-none z-30">
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: Object.keys(attendance).length > 0 ? 0 : 100, opacity: Object.keys(attendance).length > 0 ? 1 : 0 }}
          className="bg-background/90 backdrop-blur-md p-4 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border flex items-center justify-between pointer-events-auto"
        >
          <div className="hidden sm:block px-4">
            <p className="text-sm font-bold text-foreground">
              {Object.keys(attendance).length} / {students.length} {t('marked')}
            </p>
            {!allMarked && <p className="text-xs font-semibold text-amber-500 mt-0.5">{t('please_mark_all')}</p>}
          </div>
          
          <button
            onClick={handleSave}
            disabled={!allMarked || isSaving || isSaved}
            className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              isSaved 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                : allMarked 
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20' 
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <Loader2 size={20} className="animate-spin" />
            ) : isSaved ? (
              <>
                <CheckCircle2 size={20} />
                {t('saved_successfully')}
              </>
            ) : (
              <>
                <Save size={20} />
                {t('submit_attendance')}
              </>
            )}
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

function StudentAttendanceView() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.studentId) {
        setIsLoading(false);
        return;
      }
      try {
        const [attendanceData, studentData] = await Promise.all([
          getStudentAttendance(user.studentId),
          getStudentById(user.studentId)
        ]);
        setAttendance(attendanceData);
        setStudent(studentData);
      } catch (error) {
        console.error('Error loading attendance:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    // Real-time subscription
    const channel = supabase
      .channel(`student_attendance_${user?.studentId}`)
      .on('postgres_changes', { 
        event: '*', 
        table: 'attendance', 
        schema: 'public',
        filter: `student_id=eq.${user?.studentId}`
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.studentId]);

  const presentDays = attendance.filter(r => r.status === 'present').length;
  const absentDays = attendance.filter(r => r.status === 'absent').length;
  const lateDays = attendance.filter(r => r.status === 'late').length;

  if (isLoading) {
    return (
      <div className="space-y-8 h-full flex flex-col p-4 animate-pulse">
        <div className="h-10 w-64 bg-muted rounded-xl" />
        <div className="grid grid-cols-3 gap-6">
          <div className="h-32 bg-muted rounded-[1.5rem]" />
          <div className="h-32 bg-muted rounded-[1.5rem]" />
          <div className="h-32 bg-muted rounded-[1.5rem]" />
        </div>
        <div className="h-64 bg-muted rounded-[1.5rem]" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('attendance_record')}</h1>
        <p className="text-muted-foreground mt-2 font-medium">{t('viewing_records_for')} {student?.name || t('your_student')}</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          <div className="bg-emerald-500/10 p-5 rounded-[1.5rem] border border-emerald-500/20 text-center shadow-sm">
            <p className="text-3xl font-bold text-emerald-500">{presentDays}</p>
            <p className="text-xs font-bold text-emerald-500/70 mt-2 uppercase tracking-wider">{t('present')}</p>
          </div>
          <div className="bg-destructive/10 p-5 rounded-[1.5rem] border border-destructive/20 text-center shadow-sm">
            <p className="text-3xl font-bold text-destructive">{absentDays}</p>
            <p className="text-xs font-bold text-destructive/70 mt-2 uppercase tracking-wider">{t('absent')}</p>
          </div>
          <div className="bg-amber-500/10 p-5 rounded-[1.5rem] border border-amber-500/20 text-center shadow-sm">
            <p className="text-3xl font-bold text-amber-500">{lateDays}</p>
            <p className="text-xs font-bold text-amber-500/70 mt-2 uppercase tracking-wider">{t('late')}</p>
          </div>
        </div>

        <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between bg-muted/50">
            <h3 className="font-bold text-foreground flex items-center gap-2 text-lg">
              <Calendar size={20} className="text-primary" />
              {t('recent_activity')}
            </h3>
          </div>
          
          <div className="divide-y divide-border">
            {attendance.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">{t('no_records_found')}</div>
            ) : (
              attendance.slice(0, 10).map((record, i) => (
                <div key={i} className="p-5 flex items-center justify-between hover:bg-muted transition-colors">
                  <div>
                    <p className="font-bold text-foreground">
                      {new Date(record.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                    {record.remarks && <p className="text-sm font-medium text-muted-foreground mt-1">{record.remarks}</p>}
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2
                    ${record.status === 'present' ? 'bg-emerald-500/10 text-emerald-500' : 
                      record.status === 'absent' ? 'bg-destructive/10 text-destructive' : 
                      record.status === 'excused' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-amber-500/10 text-amber-500'}`}
                  >
                    {record.status === 'present' && <CheckCircle2 size={14} />}
                    {record.status === 'absent' && <XCircle size={14} />}
                    {record.status === 'late' && <Clock size={14} />}
                    {record.status === 'excused' && <CheckCircle2 size={14} />}
                    {t(record.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AdminAttendance() {
  const { t, language } = useLanguage();
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [classStats, setClassStats] = useState<any[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function loadData() {
      try {
        const [historyData, studentsData, classData] = await Promise.all([
          getAttendanceHistory(),
          getStudents(activeAcademicYear?.name),
          getAttendanceByClass(selectedDate)
        ]);
        setHistory(historyData);
        setStudentsCount(studentsData.length);
        setClassStats(classData);
      } catch (error) {
        console.error('Error loading admin attendance:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    // Real-time subscription
    const channel = supabase
      .channel('admin_attendance_changes')
      .on('postgres_changes', { event: '*', table: 'attendance', schema: 'public' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, activeAcademicYear?.name]);

  const selectedStats = history.find(h => h.date === selectedDate) || { present: 0, absent: 0, late: 0, excused: 0 };
  const totalSelected = selectedStats.present + selectedStats.absent + selectedStats.late + selectedStats.excused;
  
  // Calculate percentage based on total students marked for selected date, or total students in school
  const baseCount = totalSelected > 0 ? totalSelected : studentsCount;
  const presentCount = selectedStats.present + selectedStats.late; // Late is usually counted as present for overall %
  const attendancePercentage = baseCount > 0 ? ((presentCount / baseCount) * 100).toFixed(1) : '0.0';

  const filteredHistory = history.filter(h => 
    h.date.includes(historySearch)
  );

  if (isLoading) {
    return (
      <div className="space-y-8 h-full flex flex-col p-4 animate-pulse">
        <div className="h-10 w-64 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 gap-6">
          <div className="h-64 bg-muted rounded-[2rem]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 bg-muted rounded-[1.5rem]" />
          <div className="h-32 bg-muted rounded-[1.5rem]" />
          <div className="h-32 bg-muted rounded-[1.5rem]" />
          <div className="h-32 bg-muted rounded-[1.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('school_attendance')}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Calendar size={16} className="text-muted-foreground" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-muted-foreground font-medium focus:ring-0 cursor-pointer hover:text-foreground transition-colors"
            />
          </div>
        </div>
        <button 
          onClick={() => setIsHistoryOpen(true)}
          className="px-5 py-2.5 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-2 self-start"
        >
          <Calendar size={18} />
          {t('view_history')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-primary rounded-[2rem] p-8 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden flex flex-col justify-center min-h-[200px]">
            <div className="relative z-10">
              <p className="text-primary-foreground/80 text-sm font-semibold uppercase tracking-wider mb-2">
                {t('overall_attendance_for')} {new Date(selectedDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4">
                <h2 className="text-6xl font-bold tracking-tight">{attendancePercentage}%</h2>
                <p className="text-primary-foreground/90 font-medium text-lg mb-1">{presentCount} / {baseCount} {t('students')}</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t('late_arrivals'), value: selectedStats.late.toString(), color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock },
            { label: t('absences'), value: selectedStats.absent.toString(), color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle },
            { label: t('excused'), value: selectedStats.excused.toString(), color: 'text-blue-500', bg: 'bg-blue-500/10', icon: CheckCircle2 },
            { label: t('unmarked'), value: (studentsCount - totalSelected).toString(), color: 'text-muted-foreground', bg: 'bg-muted', icon: Clock },
          ].map((stat, i) => (
            <div key={i} className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/50 flex items-center justify-between">
            <h3 className="font-bold text-foreground text-lg">{t('class_breakdown')}</h3>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                <Filter size={18} />
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-border">
            {classStats.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">{t('no_class_data')}</div>
            ) : (
              classStats.map((row, i) => (
                <div key={i} className="p-5 flex items-center justify-between hover:bg-muted transition-colors">
                  <div>
                    <p className="font-bold text-foreground text-lg">{row.cls}</p>
                    <p className="text-sm font-medium text-muted-foreground mt-1">{row.total} {t('students')}</p>
                  </div>
                  
                  <div className="text-right">
                    {row.status === 'submitted' ? (
                      <>
                        <p className="font-bold text-foreground text-xl">{Math.round((row.present / row.total) * 100)}%</p>
                        <p className="text-xs font-bold text-emerald-500 mt-1 uppercase tracking-wider">{row.present}/{row.total} {t('present')}</p>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold uppercase tracking-wider">
                        <Clock size={14} />
                        {t('pending')}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">{t('attendance_history')}</h2>
                  <p className="text-sm font-medium text-muted-foreground mt-2">{t('attendance_history_all_desc')}</p>
                </div>
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 border-b border-border bg-muted/30 shrink-0">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-4" />
                  <input 
                    type="text" 
                    placeholder={t('search_by_date')} 
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all rtl:pl-4 rtl:pr-11"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground font-medium">{t('no_history_found')}</p>
                  </div>
                ) : (
                  filteredHistory.map((record, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        setSelectedDate(record.date);
                        setIsHistoryOpen(false);
                      }}
                      className="p-5 rounded-2xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-all group cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Calendar size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-lg text-foreground">{new Date(record.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">{t('present')}: {record.present}</span>
                              <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md">{t('absent')}: {record.absent}</span>
                              <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">{t('late')}: {record.late}</span>
                              <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">{t('excused')}: {record.excused}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 justify-between sm:justify-end">
                          <div className="text-right">
                            <p className="text-xl font-black text-foreground">
                              {((record.present + record.late) / (record.present + record.absent + record.late + record.excused) * 100 || 0).toFixed(1)}%
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('attendance_rate')}</p>
                          </div>
                          <div className="p-2 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 rounded-lg transition-all">
                            <ChevronRight size={20} className="rtl:rotate-180" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 border-t border-border bg-muted/50 shrink-0 flex justify-end">
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="px-6 py-2.5 bg-background border border-border rounded-xl font-bold text-sm hover:bg-accent transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
