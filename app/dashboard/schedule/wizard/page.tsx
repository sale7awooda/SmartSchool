'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, ArrowRight, Save, Settings, BookOpen, LayoutGrid,
  CheckCircle2, Wand2, MapPin, User, AlertCircle, Plus, X, Trash2,
  Loader2, History, FolderOpen
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { getTeachers, saveScheduleDraft, getScheduleDrafts, publishSchedule, deleteScheduleDraft, getSchedules, getClasses, getSubjects, getActiveAcademicYear } from '@/lib/supabase-db';
import { toast } from 'sonner';
import { User as DBUser } from '@/lib/mock-db';
import useSWR from 'swr';
import { DraftsModal } from '@/components/dashboard/schedule/DraftsModal';

// Mock Data
const ALL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS = ALL_DAYS;
const SYSTEM_TEACHERS = ['Mr. Smith', 'Mrs. Davis', 'Dr. Brown', 'Ms. Wilson', 'Mr. Taylor', 'Ms. Anderson', 'Mr. Thomas', 'Mrs. Jackson', 'Mr. White'];
const COLORS = [
  'bg-blue-500/20 text-blue-800 border-blue-200', 
  'bg-emerald-500/20 text-emerald-800 border-emerald-500/20', 
  'bg-purple-500/20 text-purple-800 border-purple-500/20', 
  'bg-amber-100 text-amber-800 border-amber-500/20', 
  'bg-pink-100 text-pink-800 border-pink-200', 
  'bg-orange-100 text-orange-800 border-orange-200'
];

const getColorForSubject = (subject: string) => {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
};

const INITIAL_SCHEDULE: any[] = [];

export default function TimetableWizard() {
  const router = useRouter();
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [schedule, setSchedule] = useState<any[]>(INITIAL_SCHEDULE);
  const [draftSaved, setDraftSaved] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<DBUser[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);

  const { data: classesData } = useSWR('classes', getClasses);
  const { data: subjectsData } = useSWR('subjects', getSubjects);

  const GRADES = useMemo(() => classesData?.map(c => c.name) || ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'], [classesData]);
  const SYSTEM_SUBJECTS = useMemo(() => subjectsData?.map(s => s.name) || ['Mathematics', 'English', 'Science', 'History', 'Geography', 'Art', 'Physical Education', 'Music', 'Computer Science'], [subjectsData]);

  // Step 1 State: Constraints
  const [constraints, setConstraints] = useState({
    periodsPerDay: 7,
    daysPerWeek: 5,
    periodLength: 50,
    breakLength: 30,
    startTime: '08:00',
    startOfWeek: 'Sunday'
  });

  const activeDays = useMemo(() => {
    const startIndex = ALL_DAYS.indexOf(constraints.startOfWeek);
    if (startIndex === -1) return ALL_DAYS.slice(0, constraints.daysPerWeek);
    const days = [];
    for (let i = 0; i < constraints.daysPerWeek; i++) {
      days.push(ALL_DAYS[(startIndex + i) % 7]);
    }
    return days;
  }, [constraints.startOfWeek, constraints.daysPerWeek]);

  // Step 2 State: Subject Mapping
  const [mappings, setMappings] = useState<{
    id: string, 
    grade: string, 
    subject: string, 
    teacher: string, 
    classesPerWeek: number,
    doublePeriods?: boolean,
    beforeBreakfast?: boolean,
    linkedGrade?: string
  }[]>([]);
  const [newMapping, setNewMapping] = useState({ 
    grade: '', 
    subject: '', 
    teacher: '', 
    classesPerWeek: 1,
    doublePeriods: false,
    beforeBreakfast: false,
    linkedGrade: ''
  });

  useEffect(() => {
    if (GRADES.length > 0 && SYSTEM_SUBJECTS.length > 0 && !newMapping.grade) {
      setNewMapping(prev => ({
        ...prev,
        grade: GRADES[0],
        subject: SYSTEM_SUBJECTS[0]
      }));
    }
  }, [GRADES, SYSTEM_SUBJECTS, newMapping.grade]);

  useEffect(() => {
    async function loadData() {
      try {
        const fetchedTeachers = await getTeachers();
        setTeachers(fetchedTeachers);
        if (fetchedTeachers.length > 0) {
          setNewMapping(prev => ({ ...prev, teacher: fetchedTeachers[0].name }));
        }

        const draftsData = await getScheduleDrafts(activeAcademicYear?.name);
        setDrafts(draftsData);
        
        if (draftsData && draftsData.length > 0) {
          const latest = draftsData[0];
          setConstraints(latest.constraints);
          setMappings(latest.mappings);
          setSchedule(latest.schedule);
        }
      } catch (error) {
        console.error('Error loading schedule data:', error);
        toast.error('Failed to load schedule data');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [activeAcademicYear?.name]);

  // Step 3 State: Builder
  const [selectedDay, setSelectedDay] = useState(ALL_DAYS[0]);

  useEffect(() => {
    if (activeDays.length > 0 && !activeDays.includes(selectedDay)) {
      setSelectedDay(activeDays[0]);
    }
  }, [activeDays, selectedDay]);
  const [selectedSlot, setSelectedSlot] = useState<{grade: string, period: number} | null>(null);
  const [slotForm, setSlotForm] = useState({ mappingId: '', room: '' });

  const steps = [
    { id: 1, title: 'Constraints', icon: Settings, description: 'Set periods and timing' },
    { id: 2, title: 'Subject Mapping', icon: BookOpen, description: 'Assign subjects & teachers' },
    { id: 3, title: 'Builder', icon: LayoutGrid, description: 'Drag & drop or auto-generate' },
  ];

  const periods = useMemo(() => {
    const p = [];
    for (let i = 1; i <= constraints.periodsPerDay; i++) {
      p.push({ id: i, label: `Period ${i}` });
      if (i === 3) {
        p.push({ id: 'break', label: 'Breakfast Break' });
      }
    }
    return p;
  }, [constraints.periodsPerDay]);

  const totalAvailable = GRADES.length * constraints.periodsPerDay * constraints.daysPerWeek;
  const totalMapped = mappings.reduce((acc, m) => acc + m.classesPerWeek, 0);
  const progressPercent = Math.min(100, Math.round((totalMapped / totalAvailable) * 100));

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSaveDraft = async () => {
    try {
      const draftName = `Draft ${new Date().toLocaleString()}`;
      await saveScheduleDraft({
        name: draftName,
        constraints,
        mappings,
        schedule,
        academic_year: activeAcademicYear?.name
      });
      setDraftSaved(`Draft Saved`);
      toast.success('Draft saved successfully');
      
      // Refresh drafts list
      const draftsData = await getScheduleDrafts(activeAcademicYear?.name);
      setDrafts(draftsData);
      
      setTimeout(() => setDraftSaved(null), 3000);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    }
  };

  const handleLoadDraft = (draft: any) => {
    setConstraints(draft.constraints);
    setMappings(draft.mappings);
    setSchedule(draft.schedule);
    setIsDraftModalOpen(false);
    toast.success(`Loaded draft: ${draft.name}`);
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      await deleteScheduleDraft(id);
      setDrafts(drafts.filter(d => d.id !== id));
      toast.success('Draft deleted');
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error('Failed to delete draft');
    }
  };

  const handleLoadCurrentSchedule = async () => {
    try {
      setIsLoading(true);
      const currentSchedules = await getSchedules();
      
      if (!currentSchedules || currentSchedules.length === 0) {
        toast.info('No published schedule found');
        return;
      }

      // Convert Supabase format back to Wizard format
      const convertedSchedule = currentSchedules.map((s: any) => ({
        id: s.id,
        day: DAYS[s.day_of_week - 1],
        grade: s.class_id,
        period: s.period,
        subject: s.subject,
        teacher: s.teacher?.name || 'Unknown',
        room: s.room || 'TBD',
        color: getColorForSubject(s.subject)
      }));

      // Extract mappings
      const extractedMappings: any[] = [];
      const mappingCounts: Record<string, number> = {};

      convertedSchedule.forEach((s: any) => {
        const key = `${s.grade}-${s.subject}-${s.teacher}`;
        mappingCounts[key] = (mappingCounts[key] || 0) + 1;
      });

      Object.entries(mappingCounts).forEach(([key, count]) => {
        const [grade, subject, teacher] = key.split('-');
        extractedMappings.push({
          id: `m${Date.now()}-${Math.random()}`,
          grade,
          subject,
          teacher,
          classesPerWeek: count
        });
      });

      setSchedule(convertedSchedule);
      setMappings(extractedMappings);
      toast.success('Loaded current published schedule');
    } catch (error) {
      console.error('Error loading current schedule:', error);
      toast.error('Failed to load current schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!activeAcademicYear) {
      toast.error('Active academic year not found');
      return;
    }
    try {
      const scheduleItems = schedule.map(s => ({
        class_id: s.grade,
        day_of_week: DAYS.indexOf(s.day) + 1,
        period: s.period,
        subject: s.subject,
        teacher_id: teachers.find(t => t.name === s.teacher)?.id,
        room: s.room
      }));

      await publishSchedule(scheduleItems, activeAcademicYear.name);
      toast.success('Schedule published successfully');
      router.push('/dashboard/schedule');
    } catch (error) {
      console.error('Error publishing schedule:', error);
      toast.error('Failed to publish schedule');
    }
  };

  const handleAddMapping = () => {
    if (!newMapping.subject || !newMapping.teacher) return;
    setMappings([...mappings, { ...newMapping, id: `m${Date.now()}` }]);
    setNewMapping({ 
      grade: newMapping.grade, // Keep the same grade selected
      subject: '', 
      teacher: '', 
      classesPerWeek: 1,
      doublePeriods: false,
      beforeBreakfast: false,
      linkedGrade: ''
    });
  };

  const handleRemoveMapping = (id: string) => {
    setMappings(mappings.filter(m => m.id !== id));
  };

  const handleGenerateTimetable = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newSchedule: any[] = [];
      let idCounter = 1;

      // Sort mappings to handle linked grades and double periods first
      const sortedMappings = [...mappings].sort((a, b) => {
        if (a.linkedGrade && !b.linkedGrade) return -1;
        if (!a.linkedGrade && b.linkedGrade) return 1;
        if (a.doublePeriods && !b.doublePeriods) return -1;
        if (!a.doublePeriods && b.doublePeriods) return 1;
        return b.classesPerWeek - a.classesPerWeek;
      });

      sortedMappings.forEach((mapping) => {
        const color = getColorForSubject(mapping.subject);
        let classesPlaced = 0;
        let attempts = 0;

        while (classesPlaced < mapping.classesPerWeek && attempts < 500) {
          attempts++;
          const randomDay = activeDays[Math.floor(Math.random() * activeDays.length)];
          
          // Determine valid periods based on constraints
          let validPeriods = Array.from({ length: constraints.periodsPerDay }, (_, i) => i + 1);
          
          if (mapping.beforeBreakfast) {
            // Assuming breakfast is after period 2 or 3. Let's say periods 1 and 2 are before breakfast.
            validPeriods = [1, 2];
          }

          const randomPeriod = validPeriods[Math.floor(Math.random() * validPeriods.length)];

          // Check for conflicts
          // 1. Class conflict (grade already has a class in this period)
          const isClassOccupied = newSchedule.some(s => s.day === randomDay && s.grade === mapping.grade && s.period === randomPeriod);
          
          // 2. Teacher conflict (teacher is already teaching another class in this period)
          // UNLESS it's a linked grade scenario where they are supposed to teach both at the same time
          const isTeacherOccupied = newSchedule.some(s => 
            s.day === randomDay && 
            s.teacher === mapping.teacher && 
            s.period === randomPeriod &&
            !(mapping.linkedGrade === s.grade && s.subject === mapping.subject) // Allow if it's the linked grade
          );

          if (!isClassOccupied && !isTeacherOccupied) {
            
            // Handle double periods
            if (mapping.doublePeriods && classesPlaced < mapping.classesPerWeek - 1) {
              const nextPeriod = randomPeriod + 1;
              if (nextPeriod <= constraints.periodsPerDay) {
                const isNextClassOccupied = newSchedule.some(s => s.day === randomDay && s.grade === mapping.grade && s.period === nextPeriod);
                const isNextTeacherOccupied = newSchedule.some(s => s.day === randomDay && s.teacher === mapping.teacher && s.period === nextPeriod);
                
                if (!isNextClassOccupied && !isNextTeacherOccupied) {
                  // Place both
                  newSchedule.push({
                    id: `gen-${idCounter++}`, day: randomDay, grade: mapping.grade, period: randomPeriod, subject: mapping.subject, teacher: mapping.teacher, room: 'TBD', color
                  });
                  newSchedule.push({
                    id: `gen-${idCounter++}`, day: randomDay, grade: mapping.grade, period: nextPeriod, subject: mapping.subject, teacher: mapping.teacher, room: 'TBD', color
                  });
                  classesPlaced += 2;
                  continue;
                }
              }
            }

            // Normal placement
            newSchedule.push({
              id: `gen-${idCounter++}`,
              day: randomDay,
              grade: mapping.grade,
              period: randomPeriod,
              subject: mapping.subject,
              teacher: mapping.teacher,
              room: 'TBD',
              color: color
            });
            classesPlaced++;
          }
        }
      });

      setSchedule(newSchedule);
      setIsGenerating(false);
    }, 1000);
  };

  const handleAddClass = () => {
    const mapping = mappings.find(m => m.id === slotForm.mappingId);
    if (!mapping || !selectedSlot) return;
    
    const newClass = {
      id: `manual-${Date.now()}`,
      day: selectedDay,
      grade: selectedSlot.grade,
      period: selectedSlot.period,
      subject: mapping.subject,
      teacher: mapping.teacher,
      room: slotForm.room || 'TBD',
      color: getColorForSubject(mapping.subject)
    };
    
    setSchedule([...schedule, newClass]);
    setSelectedSlot(null);
    setSlotForm({ mappingId: '', room: '' });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;

    if (sourceId === destId) return;

    const [sourceGrade, sourcePeriodStr] = sourceId.split('-');
    const [destGrade, destPeriodStr] = destId.split('-');
    const sourcePeriod = parseInt(sourcePeriodStr);
    const destPeriod = parseInt(destPeriodStr);

    setSchedule(prev => {
      const newSchedule = [...prev];
      const draggedItemIndex = newSchedule.findIndex(
        s => s.day === selectedDay && s.grade === sourceGrade && s.period === sourcePeriod
      );
      
      if (draggedItemIndex === -1) return prev;

      const destItemIndex = newSchedule.findIndex(
        s => s.day === selectedDay && s.grade === destGrade && s.period === destPeriod
      );

      if (destItemIndex !== -1) {
        const tempGrade = newSchedule[draggedItemIndex].grade;
        const tempPeriod = newSchedule[draggedItemIndex].period;
        
        newSchedule[draggedItemIndex].grade = newSchedule[destItemIndex].grade;
        newSchedule[draggedItemIndex].period = newSchedule[destItemIndex].period;
        
        newSchedule[destItemIndex].grade = tempGrade;
        newSchedule[destItemIndex].period = tempPeriod;
      } else {
        newSchedule[draggedItemIndex].grade = destGrade;
        newSchedule[draggedItemIndex].period = destPeriod;
      }

      return newSchedule;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard/schedule')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ArrowLeft size={20} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Timetable Wizard</h1>
            <p className="text-sm text-muted-foreground">Create or modify the master schedule</p>
          </div>
        </div>
        
        {currentStep === 3 && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsDraftModalOpen(true)}
              className="px-4 py-2 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors shadow-sm flex items-center gap-2"
            >
              <FolderOpen size={16} />
              Drafts
            </button>
            <button 
              onClick={handleSaveDraft}
              className="px-4 py-2 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors shadow-sm flex items-center gap-2"
            >
              <Save size={16} />
              Save Draft
            </button>
            <button 
              onClick={handlePublish}
              className="px-4 py-2 bg-emerald-500 text-primary-foreground rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              Publish Schedule
            </button>
          </div>
        )}
      </div>

      {draftSaved && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-emerald-500/10 text-emerald-500 p-3 rounded-xl flex items-center gap-2 text-sm font-medium border border-emerald-500/20"
        >
          <CheckCircle2 size={16} />
          {draftSaved} saved successfully.
        </motion.div>
      )}

      {/* Stepper */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center justify-between max-w-3xl mx-auto relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full -z-10"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full -z-10 transition-all duration-500"
            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
          ></div>
          
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep >= step.id;
            const isCurrent = currentStep === step.id;
            
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 bg-card px-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border text-muted-foreground'
                }`}>
                  <Icon size={18} />
                </div>
                <div className="text-center">
                  <p className={`text-sm font-bold ${isCurrent ? 'text-indigo-900' : isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground hidden sm:block">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-card rounded-[1.5rem] border border-border shadow-sm p-6 min-h-[400px]">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <h2 className="text-xl font-bold text-foreground">General Constraints</h2>
              <p className="text-muted-foreground text-sm">Define the basic structure of your school week.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Days per Week</label>
                  <input 
                    type="number" 
                    min="1" max="7"
                    value={constraints.daysPerWeek}
                    onChange={(e) => setConstraints({...constraints, daysPerWeek: parseInt(e.target.value) || 5})}
                    className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Periods per Day</label>
                  <input 
                    type="number" 
                    min="1" max="10"
                    value={constraints.periodsPerDay}
                    onChange={(e) => setConstraints({...constraints, periodsPerDay: parseInt(e.target.value) || 6})}
                    className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Period Length (mins)</label>
                  <input 
                    type="number" 
                    value={constraints.periodLength}
                    onChange={(e) => setConstraints({...constraints, periodLength: parseInt(e.target.value) || 50})}
                    className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Breakfast Break Length (mins)</label>
                  <input 
                    type="number" 
                    value={constraints.breakLength}
                    onChange={(e) => setConstraints({...constraints, breakLength: parseInt(e.target.value) || 30})}
                    className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Start of Day Time</label>
                  <input 
                    type="time" 
                    value={constraints.startTime}
                    onChange={(e) => setConstraints({...constraints, startTime: e.target.value})}
                    className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Start of Week</label>
                  <select 
                    value={constraints.startOfWeek}
                    onChange={(e) => setConstraints({...constraints, startOfWeek: e.target.value})}
                    className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <button 
                  onClick={handleLoadCurrentSchedule}
                  className="w-full py-4 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-2xl font-bold hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <History size={20} />
                  Load Current Published Schedule
                </button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  This will overwrite your current draft with the published timetable.
                </p>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-5xl mx-auto space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-foreground">Subject Mapping</h2>
                <p className="text-muted-foreground text-sm">Assign subjects and required classes per week to each grade.</p>
              </div>

              {/* Progress Indicator */}
              <div className="bg-muted p-6 rounded-2xl border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-foreground">Mapping Progress</h3>
                  <span className="text-sm font-bold text-primary">{totalMapped} / {totalAvailable} Periods</span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Based on {constraints.periodsPerDay} periods/day over {constraints.daysPerWeek} days for {GRADES.length} grades.
                </p>
              </div>

              {/* Add Mapping Form */}
              <div className="bg-muted/50 p-4 rounded-xl border border-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Grade</label>
                    <select 
                      value={newMapping.grade}
                      onChange={e => setNewMapping({...newMapping, grade: e.target.value, subject: ''})}
                      className="w-full p-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                    >
                      {GRADES.map(g => {
                        const used = mappings.filter(m => m.grade === g).reduce((acc, m) => acc + m.classesPerWeek, 0);
                        const total = constraints.periodsPerDay * constraints.daysPerWeek;
                        return (
                          <option key={g} value={g}>
                            {g} ({total - used}/{total} remaining)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Subject</label>
                    <select 
                      value={newMapping.subject}
                      onChange={e => setNewMapping({...newMapping, subject: e.target.value})}
                      className="w-full p-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                    >
                      <option value="">Select Subject</option>
                      {SYSTEM_SUBJECTS.filter(s => !mappings.some(m => m.grade === newMapping.grade && m.subject === s)).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Teacher</label>
                    <select 
                      value={newMapping.teacher}
                      onChange={e => setNewMapping({...newMapping, teacher: e.target.value})}
                      className="w-full p-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Classes / Week</label>
                    <input 
                      type="number" min="1" placeholder="Classes/Week"
                      value={newMapping.classesPerWeek}
                      onChange={e => setNewMapping({...newMapping, classesPerWeek: parseInt(e.target.value) || 1})}
                      className="w-full p-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="doublePeriods"
                      checked={newMapping.doublePeriods}
                      onChange={e => setNewMapping({...newMapping, doublePeriods: e.target.checked})}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="doublePeriods" className="text-sm font-medium text-foreground">Prefers Double Periods</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="beforeBreakfast"
                      checked={newMapping.beforeBreakfast}
                      onChange={e => setNewMapping({...newMapping, beforeBreakfast: e.target.checked})}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="beforeBreakfast" className="text-sm font-medium text-foreground">Prefers Before Breakfast</label>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Link with Grade (Optional)</label>
                    <select 
                      value={newMapping.linkedGrade}
                      onChange={e => setNewMapping({...newMapping, linkedGrade: e.target.value})}
                      className="w-full p-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary text-sm"
                    >
                      <option value="">None</option>
                      {GRADES.filter(g => g !== newMapping.grade).map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    onClick={handleAddMapping}
                    disabled={!newMapping.subject || !newMapping.teacher}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Add Mapping
                  </button>
                </div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="p-4 font-bold text-foreground">Grade</th>
                      <th className="p-4 font-bold text-foreground">Subject</th>
                      <th className="p-4 font-bold text-foreground">Teacher</th>
                      <th className="p-4 font-bold text-foreground">Details</th>
                      <th className="p-4 font-bold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mappings.map((mapping) => (
                      <tr key={mapping.id} className="hover:bg-muted/50">
                        <td className="p-4 font-medium">{mapping.grade}</td>
                        <td className="p-4">{mapping.subject}</td>
                        <td className="p-4">{mapping.teacher}</td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1 text-xs">
                            <span>{mapping.classesPerWeek} classes/wk</span>
                            {mapping.doublePeriods && <span className="text-indigo-500 font-medium">Double Periods</span>}
                            {mapping.beforeBreakfast && <span className="text-emerald-500 font-medium">Before Breakfast</span>}
                            {mapping.linkedGrade && <span className="text-amber-500 font-medium">Linked: {mapping.linkedGrade}</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => handleRemoveMapping(mapping.id)}
                            className="text-red-500 hover:text-destructive font-medium text-xs flex items-center gap-1"
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {mappings.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No subjects mapped yet. Add one above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Timetable Builder</h2>
                  <p className="text-muted-foreground text-sm">Drag and drop to resolve conflicts, or auto-generate based on mappings.</p>
                </div>
                <button 
                  onClick={handleGenerateTimetable}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Wand2 size={16} />
                  )}
                  {isGenerating ? 'Generating...' : 'Auto-Generate'}
                </button>
              </div>

              {/* Day Tabs */}
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                {activeDays.map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
                      selectedDay === day ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              <div className="border border-border rounded-2xl overflow-hidden overflow-x-auto bg-muted/30">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <div className="min-w-[1000px]">
                    <div 
                      className="grid border-b border-border bg-card"
                      style={{ gridTemplateColumns: `120px repeat(${periods.length}, minmax(120px, 1fr))` }}
                    >
                      <div className="p-4 border-r border-border flex items-center justify-center font-bold text-muted-foreground">
                        Grades
                      </div>
                      {periods.map((period, index) => (
                        <div key={index} className="p-3 border-r border-border last:border-0 flex flex-col items-center justify-center text-center">
                          {period.id === 'break' ? (
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{period.label}</span>
                          ) : (
                            <span className="text-xs font-bold text-foreground">{period.label}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="divide-y divide-slate-200 bg-card">
                      {GRADES.map(grade => (
                        <div 
                          key={grade} 
                          className="grid"
                          style={{ gridTemplateColumns: `120px repeat(${periods.length}, minmax(120px, 1fr))` }}
                        >
                          <div className="p-4 border-r border-border flex items-center justify-center bg-muted/50 font-bold text-foreground">
                            {grade}
                          </div>

                          {periods.map((period, index) => {
                            if (period.id === 'break') {
                              return (
                                <div key={`${grade}-break-${index}`} className="p-2 border-r border-border bg-muted/50 flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                </div>
                              );
                            }

                            const classData = schedule.find(s => s.day === selectedDay && s.grade === grade && s.period === period.id);
                            const droppableId = `${grade}-${period.id}`;

                            return (
                              <Droppable key={droppableId} droppableId={droppableId}>
                                {(provided, snapshot) => (
                                  <div 
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    onClick={() => !classData && setSelectedSlot({ grade, period: period.id as number })}
                                    className={`p-2 border-r border-border last:border-0 min-h-[100px] transition-colors ${
                                      snapshot.isDraggingOver ? 'bg-primary/10' : !classData ? 'hover:bg-muted cursor-pointer' : ''
                                    }`}
                                  >
                                    {classData ? (
                                      <Draggable draggableId={classData.id} index={0}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`group h-full p-2 rounded-xl border ${classData.color} flex flex-col justify-between cursor-grab active:cursor-grabbing ${
                                              snapshot.isDragging ? 'shadow-lg scale-105 z-50' : 'shadow-sm hover:scale-[1.02] transition-transform'
                                            }`}
                                            style={provided.draggableProps.style}
                                          >
                                            <div>
                                              <div className="flex items-start justify-between">
                                                <h4 className="font-bold text-xs leading-tight">{classData.subject}</h4>
                                                <button 
                                                  onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setSchedule(schedule.filter(s => s.id !== classData.id)); 
                                                  }}
                                                  className="opacity-0 hover:opacity-100 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                                                >
                                                  <X size={12} />
                                                </button>
                                              </div>
                                              <p className="text-[10px] opacity-80 mt-1 flex items-center gap-1">
                                                <MapPin size={10} /> {classData.room}
                                              </p>
                                            </div>
                                            <p className="text-[10px] font-medium opacity-90 mt-2 flex items-center gap-1 truncate">
                                              <User size={10} /> {classData.teacher}
                                            </p>
                                          </div>
                                        )}
                                      </Draggable>
                                    ) : (
                                      <div className="h-full rounded-xl border border-dashed border-border bg-muted/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <Plus size={16} className="text-muted-foreground" />
                                      </div>
                                    )}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </DragDropContext>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className="px-6 py-3 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        
        {currentStep < 3 ? (
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
          >
            Next Step
            <ArrowRight size={16} />
          </button>
        ) : (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle size={16} />
            Don&apos;t forget to save your drafts or publish.
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      <AnimatePresence>
        {selectedSlot && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">Add Class</h3>
                <button onClick={() => setSelectedSlot(null)} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Subject & Teacher</label>
                  <select 
                    value={slotForm.mappingId}
                    onChange={(e) => setSlotForm({...slotForm, mappingId: e.target.value})}
                    className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                  >
                    <option value="">Select a mapped subject...</option>
                    {mappings.filter(m => m.grade === selectedSlot.grade).map(m => (
                      <option key={m.id} value={m.id}>{m.subject} ({m.teacher})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Room</label>
                  <input 
                    type="text"
                    placeholder="e.g. Room 101"
                    value={slotForm.room}
                    onChange={(e) => setSlotForm({...slotForm, room: e.target.value})}
                    className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-primary"
                  />
                </div>
                
                <button 
                  onClick={handleAddClass}
                  disabled={!slotForm.mappingId}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Add to Schedule
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drafts Modal */}
      <DraftsModal isDraftModalOpen={isDraftModalOpen} setIsDraftModalOpen={setIsDraftModalOpen} drafts={drafts} loadDraft={handleLoadDraft} handleDeleteDraft={handleDeleteDraft} isSubmitting={isSubmitting} />
    </div>
  );
}