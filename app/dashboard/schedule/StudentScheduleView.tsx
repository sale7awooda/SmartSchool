'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  CalendarDays, 
  MapPin, 
  User, 
  ChevronDown,
  Clock
} from 'lucide-react';
import { MOCK_SCHEDULE, MOCK_STUDENTS, MOCK_PARENTS, Student } from '@/lib/mock-db';
import { useAuth } from '@/lib/auth-context';

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
  
  // Determine available students based on user role
  let availableStudents: Student[] = [];
  if (user?.role === 'parent') {
    const parentData = MOCK_PARENTS.find(p => p.id === user.id) || MOCK_PARENTS.find(p => p.email === user.email);
    if (parentData && parentData.studentIds) {
      availableStudents = MOCK_STUDENTS.filter(s => parentData.studentIds?.includes(s.id));
    }
  } else if (user?.role === 'student' || user?.studentId) {
    const studentData = MOCK_STUDENTS.find(s => s.id === user.studentId);
    if (studentData) {
      availableStudents = [studentData];
    }
  }

  // Fallback if no students found (e.g., mock data mismatch)
  if (availableStudents.length === 0) {
    availableStudents = [MOCK_STUDENTS[0]];
  }

  const [selectedStudentId, setSelectedStudentId] = useState(availableStudents[0].id);
  const selectedStudent = availableStudents.find(s => s.id === selectedStudentId) || availableStudents[0];

  const getPeriodData = (dayId: number, periodId: number) => {
    // In a real app, we'd filter by the student's classId
    return MOCK_SCHEDULE.find(s => s.dayOfWeek === dayId && s.period === periodId && s.classId === selectedStudent.grade);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shadow-inner">
            {selectedStudent.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{selectedStudent.name}</h3>
            <p className="text-xs font-medium text-slate-500">{selectedStudent.grade} • ID: {selectedStudent.id}</p>
          </div>
        </div>

        {availableStudents.length > 1 && (
          <div className="relative group">
            <select 
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors cursor-pointer"
            >
              {availableStudents.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Weekly Schedule Grid */}
      <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Header Row (Periods) */}
          <div className="grid grid-cols-[120px_repeat(8,1fr)] border-b border-slate-100 bg-slate-50/80">
            <div className="p-4 border-r border-slate-100 flex items-center justify-center font-bold text-slate-500">
              <CalendarDays size={20} className="mr-2 text-indigo-500" />
              Days
            </div>
            {PERIODS.map((period, index) => (
              <div key={index} className="p-3 border-r border-slate-100 last:border-0 flex flex-col items-center justify-center text-center">
                {typeof period.id === 'string' ? (
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{period.label}</span>
                ) : (
                  <>
                    <span className="text-xs font-bold text-slate-700">Period {period.id}</span>
                    <span className="text-[10px] font-medium text-slate-500 mt-1">{period.time}</span>
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
                <div className="p-4 border-r border-slate-100 flex items-center justify-center bg-slate-50/30 font-bold text-slate-700">
                  {day.name}
                </div>

                {/* Period Columns */}
                {PERIODS.map((period, index) => {
                  if (typeof period.id === 'string') {
                    return (
                      <div key={`${day.id}-break-${index}`} className="p-2 border-r border-slate-100 bg-slate-50/50 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                      </div>
                    );
                  }

                  const classData = getPeriodData(day.id, period.id as number);

                  return (
                    <div 
                      key={`${day.id}-${period.id}`}
                      className="p-2 border-r border-slate-100 last:border-0 min-h-[100px] transition-colors"
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
                        <div className="h-full rounded-xl border border-dashed border-slate-200 bg-slate-50/30 flex items-center justify-center">
                          <span className="text-[10px] text-slate-400 font-medium">Free</span>
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
