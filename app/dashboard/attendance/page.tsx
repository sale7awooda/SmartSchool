'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { Student } from '@/lib/mock-db';
import { getStudents, getAttendance, saveAttendance } from '@/lib/supabase-db';
import { CheckCircle2, XCircle, Clock, Save, Loader2, ChevronLeft, Calendar, Filter, X, ChevronRight, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from "sonner";

type AttendanceStatus = 'present' | 'absent' | 'late' | null;

export default function AttendancePage() {
  const { user } = useAuth();
  const { can, isRole } = usePermissions();
  
  if (!user) return null;

  if (!can('view', 'attendance')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  if (isRole(['teacher'])) return <TeacherAttendance />;
  if (isRole('parent')) return <ParentAttendance />;
  if (isRole(['admin'])) return <AdminAttendance />;

  return <div className="p-4">You do not have permission to view this page.</div>;
}

function TeacherAttendance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function loadData() {
      try {
        const [studentsData, attendanceData] = await Promise.all([
          getStudents(),
          getAttendance(selectedDate)
        ]);
        
        setStudents(studentsData);
        
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
  }, [selectedDate]);

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
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Loading attendance...</p>
      </div>
    );
  }

  if (activeTab === 'history') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Attendance History</h1>
            <p className="text-muted-foreground mt-2 font-medium">Review past attendance records for your classes.</p>
          </div>
          <button 
            onClick={() => setActiveTab('mark')}
            className="px-5 py-2.5 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-2"
          >
            <ChevronLeft size={18} />
            Back to Marking
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
          {[
            { date: '2023-10-26', present: 28, absent: 2, late: 0 },
            { date: '2023-10-25', present: 29, absent: 1, late: 0 },
            { date: '2023-10-24', present: 27, absent: 2, late: 1 },
            { date: '2023-10-23', present: 30, absent: 0, late: 0 },
          ].map((record, i) => (
            <div key={i} className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm flex items-center justify-between hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/5 text-primary">
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-sm font-medium text-muted-foreground">Grade 4 - A • {record.present + record.absent + record.late} Students</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-emerald-500">{record.present} Present</p>
                  <p className="text-sm font-bold text-destructive">{record.absent} Absent</p>
                </div>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Mark Attendance</h1>
          <p className="text-muted-foreground mt-2 font-medium">Grade 4 - A • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('history')}
            className="px-5 py-2.5 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-2"
          >
            <Clock size={18} />
            History
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 pb-24">
        {students.map((student) => {
          const status = attendance[student.id];
          return (
            <div key={student.id} className="bg-card p-5 rounded-[1.5rem] border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground font-bold text-lg">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-foreground">{student.name}</p>
                  <p className="text-xs font-medium text-muted-foreground">ID: {student.id}</p>
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
                  <span className="sm:hidden md:inline">Present</span>
                </button>
                <button
                  onClick={() => handleStatusChange(student.id, 'late')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    status === 'late' ? 'bg-card text-amber-500 shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Clock size={18} className={status === 'late' ? 'fill-amber-500/20' : ''} />
                  <span className="sm:hidden md:inline">Late</span>
                </button>
                <button
                  onClick={() => handleStatusChange(student.id, 'absent')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    status === 'absent' ? 'bg-card text-destructive shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <XCircle size={18} className={status === 'absent' ? 'fill-destructive/20' : ''} />
                  <span className="sm:hidden md:inline">Absent</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-20 md:bottom-8 left-0 right-0 px-4 md:px-10 max-w-5xl mx-auto pointer-events-none z-30">
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: Object.keys(attendance).length > 0 ? 0 : 100, opacity: Object.keys(attendance).length > 0 ? 1 : 0 }}
          className="bg-background/90 backdrop-blur-md p-4 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border flex items-center justify-between pointer-events-auto"
        >
          <div className="hidden sm:block px-4">
            <p className="text-sm font-bold text-foreground">
              {Object.keys(attendance).length} / {students.length} Marked
            </p>
            {!allMarked && <p className="text-xs font-semibold text-amber-500 mt-0.5">Please mark all students</p>}
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
                Saved Successfully
              </>
            ) : (
              <>
                <Save size={20} />
                Submit Attendance
              </>
            )}
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ParentAttendance() {
  const { user } = useAuth();
  const presentDays = 26, absentDays = 2, lateDays = 2;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Attendance Record</h1>
        <p className="text-muted-foreground mt-2 font-medium">Viewing records for Bart Simpson ({user?.studentId})</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          <div className="bg-emerald-500/10 p-5 rounded-[1.5rem] border border-emerald-500/20 text-center shadow-sm">
            <p className="text-3xl font-bold text-emerald-500">{presentDays}</p>
            <p className="text-xs font-bold text-emerald-500/70 mt-2 uppercase tracking-wider">Present</p>
          </div>
          <div className="bg-destructive/10 p-5 rounded-[1.5rem] border border-destructive/20 text-center shadow-sm">
            <p className="text-3xl font-bold text-destructive">{absentDays}</p>
            <p className="text-xs font-bold text-destructive/70 mt-2 uppercase tracking-wider">Absent</p>
          </div>
          <div className="bg-amber-500/10 p-5 rounded-[1.5rem] border border-amber-500/20 text-center shadow-sm">
            <p className="text-3xl font-bold text-amber-500">{lateDays}</p>
            <p className="text-xs font-bold text-amber-500/70 mt-2 uppercase tracking-wider">Late</p>
          </div>
        </div>

        <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between bg-muted/50">
            <h3 className="font-bold text-foreground flex items-center gap-2 text-lg">
              <Calendar size={20} className="text-primary" />
              Recent Activity
            </h3>
            <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">October 2023</span>
          </div>
          
          <div className="divide-y divide-border">
            {[
              { date: 'Today, Oct 24', status: 'present', note: '' },
              { date: 'Yesterday, Oct 23', status: 'present', note: '' },
              { date: 'Monday, Oct 22', status: 'late', note: 'Arrived at 09:15 AM' },
              { date: 'Friday, Oct 19', status: 'absent', note: 'Medical Leave' },
              { date: 'Thursday, Oct 18', status: 'present', note: '' },
            ].map((record, i) => (
              <div key={i} className="p-5 flex items-center justify-between hover:bg-muted transition-colors">
                <div>
                  <p className="font-bold text-foreground">{record.date}</p>
                  {record.note && <p className="text-sm font-medium text-muted-foreground mt-1">{record.note}</p>}
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2
                  ${record.status === 'present' ? 'bg-emerald-500/10 text-emerald-500' : 
                    record.status === 'absent' ? 'bg-destructive/10 text-destructive' : 
                    'bg-amber-500/10 text-amber-500'}`}
                >
                  {record.status === 'present' && <CheckCircle2 size={14} />}
                  {record.status === 'absent' && <XCircle size={14} />}
                  {record.status === 'late' && <Clock size={14} />}
                  {record.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AdminAttendance() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const attendanceHistory = [
    { date: '2023-10-26', present: 1165, absent: 75, late: 15, status: 'complete' },
    { date: '2023-10-25', present: 1180, absent: 60, late: 12, status: 'complete' },
    { date: '2023-10-24', present: 1150, absent: 90, late: 20, status: 'complete' },
    { date: '2023-10-23', present: 1175, absent: 65, late: 10, status: 'complete' },
    { date: '2023-10-20', present: 1140, absent: 100, late: 25, status: 'complete' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">School Attendance</h1>
          <p className="text-muted-foreground mt-2 font-medium">Today&apos;s overview across all classes.</p>
        </div>
        <button 
          onClick={() => setIsHistoryOpen(true)}
          className="px-5 py-2.5 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-2 self-start"
        >
          <Calendar size={18} />
          View History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-primary rounded-[2rem] p-8 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden flex flex-col justify-center">
            <div className="relative z-10">
              <p className="text-primary-foreground/80 text-sm font-semibold uppercase tracking-wider mb-2">Overall Attendance Today</p>
              <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4">
                <h2 className="text-6xl font-bold tracking-tight">94.5%</h2>
                <p className="text-primary-foreground/90 font-medium text-lg mb-1">1,171 / 1,240 Students</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          </div>

          <div className="bg-card rounded-[2rem] border border-border p-8 flex flex-col justify-between shadow-sm">
            <div>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">Staff Attendance</p>
              <h3 className="text-3xl font-bold text-foreground">98.2%</h3>
            </div>
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Present</span>
                <span className="text-foreground font-bold">112</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98.2%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Late Arrivals', value: '12', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock },
            { label: 'Unexcused', value: '8', color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle },
            { label: 'Medical Leave', value: '15', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: CheckCircle2 },
            { label: 'Early Departures', value: '3', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Clock },
          ].map((stat, i) => (
            <div key={i} className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
                <stat.icon size={20} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/50 flex items-center justify-between">
            <h3 className="font-bold text-foreground text-lg">Class Breakdown</h3>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                <Filter size={18} />
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-border">
            {[
              { cls: 'Grade 4 - A', teacher: 'Edna Krabappel', total: 30, present: 28, status: 'submitted' },
              { cls: 'Grade 4 - B', teacher: 'Elizabeth Hoover', total: 28, present: 28, status: 'submitted' },
              { cls: 'Grade 5 - A', teacher: 'Dewey Largo', total: 32, present: 0, status: 'pending' },
              { cls: 'Grade 5 - B', teacher: 'Audrey McConnell', total: 29, present: 27, status: 'submitted' },
              { cls: 'Grade 6 - A', teacher: 'Brunella Pommelhorst', total: 31, present: 30, status: 'submitted' },
            ].map((row, i) => (
              <div key={i} className="p-5 flex items-center justify-between hover:bg-muted transition-colors">
                <div>
                  <p className="font-bold text-foreground text-lg">{row.cls}</p>
                  <p className="text-sm font-medium text-muted-foreground mt-1">{row.teacher}</p>
                </div>
                
                <div className="text-right">
                  {row.status === 'submitted' ? (
                    <>
                      <p className="font-bold text-foreground text-xl">{Math.round((row.present / row.total) * 100)}%</p>
                      <p className="text-xs font-bold text-emerald-500 mt-1 uppercase tracking-wider">{row.present}/{row.total} Present</p>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold uppercase tracking-wider">
                      <Clock size={14} />
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
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
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">Attendance History</h2>
                  <p className="text-sm font-medium text-muted-foreground mt-2">Daily records for the entire school.</p>
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
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search by date..." 
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                {attendanceHistory
                  .filter(h => h.date.includes(historySearch))
                  .map((record, i) => (
                    <div key={i} className="p-5 rounded-2xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-all group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-primary/5 text-primary">
                            <Calendar size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-lg text-foreground">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">Present: {record.present}</span>
                              <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md">Absent: {record.absent}</span>
                              <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">Late: {record.late}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 justify-between sm:justify-end">
                          <div className="text-right">
                            <p className="text-xl font-black text-foreground">{((record.present / (record.present + record.absent)) * 100).toFixed(1)}%</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Attendance Rate</p>
                          </div>
                          <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="p-6 border-t border-border bg-muted/50 shrink-0 flex justify-end">
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="px-6 py-2.5 bg-background border border-border rounded-xl font-bold text-sm hover:bg-accent transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
