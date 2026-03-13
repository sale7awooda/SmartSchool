'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wand2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { TimetablePeriod } from '@/lib/mock-db';

interface GenerateTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (newSchedule: TimetablePeriod[]) => void;
}

export default function GenerateTimetableModal({ isOpen, onClose, onGenerate }: GenerateTimetableModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [periodsPerDay, setPeriodsPerDay] = useState(6);
  const [periodLength, setPeriodLength] = useState(50);
  
  const handleGenerate = () => {
    setIsGenerating(true);
    
    // Simulate generation delay
    setTimeout(() => {
      // In a real app, this would call an API with a complex algorithm.
      // For this MVP, we'll just generate a basic mock schedule based on the parameters.
      
      const newSchedule: TimetablePeriod[] = [];
      const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
      const subjects = [
        { name: 'Mathematics', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        { name: 'Science', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        { name: 'English', color: 'bg-purple-100 text-purple-700 border-purple-200' },
        { name: 'History', color: 'bg-amber-100 text-amber-700 border-amber-200' },
        { name: 'Physical Ed', color: 'bg-rose-100 text-rose-700 border-rose-200' },
        { name: 'Art', color: 'bg-pink-100 text-pink-700 border-pink-200' },
        { name: 'Music', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
        { name: 'Geography', color: 'bg-amber-100 text-amber-700 border-amber-200' },
        { name: 'Computer Sci', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
      ];
      const teachers = ['Edna Krabappel', 'Professor Frink', 'Elizabeth Hoover', 'Coach Krupt', 'Dewey Largo', 'Database Admin', 'Librarian'];
      
      let idCounter = 1;
      
      for (let day = 1; day <= 5; day++) {
        for (let grade of grades) {
          // Simple round-robin assignment for demonstration
          let subjectOffset = (day + grades.indexOf(grade)) % subjects.length;
          
          for (let period = 1; period <= periodsPerDay; period++) {
            const subject = subjects[(subjectOffset + period) % subjects.length];
            const teacher = teachers[(subjectOffset + period) % teachers.length];
            
            newSchedule.push({
              id: `gen-${idCounter++}`,
              classId: grade,
              subject: subject.name,
              teacherName: teacher,
              room: `Room ${100 + grades.indexOf(grade) + period}`,
              dayOfWeek: day,
              period: period,
              startTime: '00:00', // Mock time
              endTime: '00:00',   // Mock time
              color: subject.color
            });
          }
        }
      }
      
      onGenerate(newSchedule);
      setIsGenerating(false);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }} 
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Wand2 size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Generate Timetable</h2>
                <p className="text-sm text-slate-500 font-medium">Auto-schedule classes based on constraints</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-8">
            {/* General Constraints */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">General Constraints</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Periods per Day</label>
                  <input 
                    type="number" 
                    value={periodsPerDay}
                    onChange={(e) => setPeriodsPerDay(parseInt(e.target.value) || 6)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Period Length (mins)</label>
                  <input 
                    type="number" 
                    value={periodLength}
                    onChange={(e) => setPeriodLength(parseInt(e.target.value) || 50)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>
            </section>

            {/* Teacher Constraints (Mock UI) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Teacher Constraints</h3>
                <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  <Plus size={16} /> Add Rule
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">Edna Krabappel</p>
                    <p className="text-xs text-slate-500 font-medium">Max 4 classes per day, Max 18 per week</p>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">Professor Frink</p>
                    <p className="text-xs text-slate-500 font-medium">Not available on Fridays</p>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </section>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm font-medium">
                Generating a new timetable will overwrite the existing schedule. This action cannot be undone.
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 size={18} />
                  Generate Now
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
