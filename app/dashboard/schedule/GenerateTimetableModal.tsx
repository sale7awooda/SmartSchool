'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wand2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { TimetablePeriod } from '@/lib/mock-db';
import { getSubjects, getTeachers, getClasses } from '@/lib/supabase-db';

interface GenerateTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (newSchedule: TimetablePeriod[]) => void;
}

export default function GenerateTimetableModal({ isOpen, onClose, onGenerate }: GenerateTimetableModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [periodsPerDay, setPeriodsPerDay] = useState(6);
  const [periodLength, setPeriodLength] = useState(50);
  const [systemData, setSystemData] = useState<{subjects: any[], teachers: any[], classes: any[]}>({
    subjects: [],
    teachers: [],
    classes: []
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [subs, tchs, clss] = await Promise.all([
          getSubjects(),
          getTeachers(),
          getClasses()
        ]);
        setSystemData({ subjects: subs, teachers: tchs, classes: clss });
      } catch (error) {
        console.error('Error loading system data for modal:', error);
      }
    }
    if (isOpen) loadData();
  }, [isOpen]);
  
  const handleGenerate = () => {
    setIsGenerating(true);
    
    // Simulate generation delay
    setTimeout(() => {
      const newSchedule: TimetablePeriod[] = [];
      
      const grades = systemData.classes.length > 0 
        ? systemData.classes.map(c => c.name) 
        : ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
        
      const subjects = systemData.subjects.length > 0
        ? systemData.subjects.map(s => ({ name: s.name, color: 'bg-primary/20 text-primary border-primary/20' }))
        : [
            { name: 'Mathematics', color: 'bg-blue-500/20 text-blue-500 border-blue-500/20' },
            { name: 'Science', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' },
            { name: 'English', color: 'bg-purple-500/20 text-purple-500 border-purple-500/20' },
          ];

      const teachers = systemData.teachers.length > 0
        ? systemData.teachers.map(t => t.name)
        : ['Teacher A', 'Teacher B', 'Teacher C'];
      
      let idCounter = 1;
      
      for (let day = 1; day <= 5; day++) {
        for (let grade of grades) {
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
              startTime: '00:00',
              endTime: '00:00',
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
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }} 
          className="relative w-full max-w-2xl bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-border flex items-center justify-between bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                <Wand2 size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Generate Timetable</h2>
                <p className="text-sm text-muted-foreground font-medium">Auto-schedule classes based on constraints</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-8">
            {/* General Constraints */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">General Constraints</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Periods per Day</label>
                  <input 
                    type="number" 
                    value={periodsPerDay}
                    onChange={(e) => setPeriodsPerDay(parseInt(e.target.value) || 6)}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Period Length (mins)</label>
                  <input 
                    type="number" 
                    value={periodLength}
                    onChange={(e) => setPeriodLength(parseInt(e.target.value) || 50)}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary transition-all font-medium"
                  />
                </div>
              </div>
            </section>

            {/* Teacher Constraints (Mock UI) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Teacher Constraints</h3>
                <button className="text-sm font-bold text-primary hover:text-primary flex items-center gap-1">
                  <Plus size={16} /> Add Rule
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">Edna Krabappel</p>
                    <p className="text-xs text-muted-foreground font-medium">Max 4 classes per day, Max 18 per week</p>
                  </div>
                  <button className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">Professor Frink</p>
                    <p className="text-xs text-muted-foreground font-medium">Not available on Fridays</p>
                  </div>
                  <button className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </section>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-amber-800">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm font-medium">
                Generating a new timetable will overwrite the existing schedule. This action cannot be undone.
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-border bg-muted/50 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-muted-foreground font-bold hover:bg-muted rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
