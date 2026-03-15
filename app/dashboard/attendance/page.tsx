'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { MOCK_STUDENTS } from '@/lib/mock-db';
import { CheckCircle2, XCircle, Clock, Save, Loader2, ChevronLeft, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from "sonner";

type AttendanceStatus = 'present' | 'absent' | 'late' | null;

export default function AttendancePage() {
  const { user } = useAuth();
  const { can, isRole } = usePermissions();
  
  if (!user) return null;

  if (!can('view', 'attendance')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  if (isRole('teacher')) return <TeacherAttendance />;
  if (isRole(['parent', 'student'])) return <ParentAttendance />;
  if (isRole(['schoolAdmin', 'superadmin'])) return <AdminAttendance />;

  return <div className="p-4">You do not have permission to view this page.</div>;
}

function TeacherAttendance() {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const classes = ['Grade 4 - Section A', 'Grade 4 - Section B', 'Grade 5 - Section A'];

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
    setIsSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSaving(false);
    setIsSaved(true);
    toast.success("Attendance saved successfully", {
      description: `Marked ${Object.keys(attendance).length} students for ${selectedClass}.`,
    });
  };

  const allMarked = MOCK_STUDENTS.every(s => attendance[s.id] !== undefined && attendance[s.id] !== null);

  if (!selectedClass) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Take Attendance</h1>
          <p className="text-muted-foreground mt-2 font-medium">Select a class to mark today&apos;s attendance.</p>
        </div>

        <div className="space-y-4">
          {classes.map((cls, i) => (
            <motion.button
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              key={i}
              onClick={() => setSelectedClass(cls)}
              className="w-full flex items-center justify-between p-6 rounded-[1.5rem] border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all text-left group"
            >
              <div>
                <h3 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">{cls}</h3>
                <p className="text-sm font-medium text-muted-foreground mt-1">09:00 AM • {MOCK_STUDENTS.length} Students</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <ChevronLeft size={24} className="text-muted-foreground rotate-180 group-hover:text-primary" />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-[1.5rem] border border-border shadow-sm">
        <button 
          onClick={() => { setSelectedClass(null); setAttendance({}); setIsSaved(false); }}
          className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{selectedClass}</h1>
          <p className="text-sm font-medium text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button 
          onClick={() => {
            const allPresent = MOCK_STUDENTS.reduce((acc, s) => ({ ...acc, [s.id]: 'present' }), {});
            setAttendance(allPresent);
            setIsSaved(false);
          }}
          className="flex-1 py-3.5 bg-emerald-500/10 text-emerald-500 rounded-xl text-sm font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors active:scale-[0.98]"
        >
          Mark All Present
        </button>
      </div>

      {/* Student List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
        {MOCK_STUDENTS.map((student) => {
          const status = attendance[student.id];
          return (
            <div key={student.id} className="bg-card p-5 rounded-[1.5rem] border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm shrink-0 border border-border">
                  {student.rollNumber}
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">{student.name}</p>
                  <p className="text-xs font-medium text-muted-foreground">ID: {student.id}</p>
                </div>
              </div>

              {/* Status Toggles */}
              <div className="flex bg-muted/50 p-1.5 rounded-2xl shrink-0 border border-border">
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

      {/* Floating Save Button */}
      <div className="fixed bottom-20 md:bottom-8 left-0 right-0 px-4 md:px-10 max-w-5xl mx-auto pointer-events-none z-30">
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: Object.keys(attendance).length > 0 ? 0 : 100, opacity: Object.keys(attendance).length > 0 ? 1 : 0 }}
          className="bg-background/90 backdrop-blur-md p-4 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border flex items-center justify-between pointer-events-auto"
        >
          <div className="hidden sm:block px-4">
            <p className="text-sm font-bold text-foreground">
              {Object.keys(attendance).length} / {MOCK_STUDENTS.length} Marked
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
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">School Attendance</h1>
        <p className="text-muted-foreground mt-2 font-medium">Today&apos;s overview across all classes.</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
        <div className="bg-primary rounded-[2rem] p-8 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-primary-foreground/80 text-sm font-semibold uppercase tracking-wider mb-2">Overall Attendance Today</p>
          <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4">
            <h2 className="text-5xl font-bold tracking-tight">94.5%</h2>
            <p className="text-primary-foreground/90 font-medium text-lg mb-1">1,171 / 1,240 Students</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/50">
          <h3 className="font-bold text-foreground text-lg">Class Breakdown</h3>
        </div>
        
        <div className="divide-y divide-border">
          {[
            { cls: 'Grade 4 - A', teacher: 'Edna Krabappel', total: 30, present: 28, status: 'submitted' },
            { cls: 'Grade 4 - B', teacher: 'Elizabeth Hoover', total: 28, present: 28, status: 'submitted' },
            { cls: 'Grade 5 - A', teacher: 'Dewey Largo', total: 32, present: 0, status: 'pending' },
            { cls: 'Grade 5 - B', teacher: 'Audrey McConnell', total: 29, present: 27, status: 'submitted' },
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
    </motion.div>
  );
}
