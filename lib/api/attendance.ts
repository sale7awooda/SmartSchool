import { supabase } from '@/lib/supabase/client';
import { Student, User, Parent } from '@/lib/mock-db';

export async function getAttendance(date: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('date', date);
  
  if (error) throw error;
  return data;
}


export async function getStudentAttendance(studentId: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data;
}


export async function getAttendanceByClass(date: string) {
  // Fetch all students with their grade
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, grade');
    
  if (studentsError) throw studentsError;

  // Fetch attendance for the specific date
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('date', date);
    
  if (attendanceError) throw attendanceError;

  // Group by class (grade)
  const classStats: Record<string, { cls: string, total: number, present: number, status: 'submitted' | 'pending' }> = {};

  students.forEach((student: any) => {
    const className = `${student.grade || 'Unknown'}`;
    if (!classStats[className]) {
      classStats[className] = { cls: className, total: 0, present: 0, status: 'pending' };
    }
    classStats[className].total++;
  });

  attendance.forEach((record: any) => {
    const student = students.find((s: any) => s.id === record.student_id);
    if (student) {
      const className = `${student.grade || 'Unknown'}`;
      if (classStats[className]) {
        classStats[className].status = 'submitted';
        if (record.status === 'present' || record.status === 'late') {
          classStats[className].present++;
        }
      }
    }
  });

  return Object.values(classStats).sort((a, b) => a.cls.localeCompare(b.cls));
}


export async function getAttendanceHistory() {
  // Get all attendance records and group them by date
  const { data, error } = await supabase
    .from('attendance')
    .select('date, status');
    
  if (error) throw error;
  
  // Group by date
  const history: Record<string, { present: number, absent: number, late: number, excused: number }> = {};
  
  data.forEach((record: any) => {
    if (!history[record.date]) {
      history[record.date] = { present: 0, absent: 0, late: 0, excused: 0 };
    }
    
    if (record.status === 'present') history[record.date].present++;
    else if (record.status === 'absent') history[record.date].absent++;
    else if (record.status === 'late') history[record.date].late++;
    else if (record.status === 'excused') history[record.date].excused++;
  });
  
  return Object.entries(history)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}


export async function saveAttendance(attendanceData: any[]) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(attendanceData, { onConflict: 'student_id,date' });
  
  if (error) throw error;
  return data;
}


export async function getAttendanceStats(academicYear?: string) {
  // In a real app, this would aggregate data from attendance table
  return {
    avgAttendance: 94.8,
    patterns: [
      { week: 'Week 1', present: 95, absent: 5, late: 2 },
      { week: 'Week 2', present: 94, absent: 6, late: 3 },
      { week: 'Week 3', present: 92, absent: 8, late: 4 },
      { week: 'Week 4', present: 96, absent: 4, late: 1 },
      { week: 'Week 5', present: 97, absent: 3, late: 2 },
      { week: 'Week 6', present: 93, absent: 7, late: 5 },
    ]
  };
}


