'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { User, Student, Parent } from '@/lib/mock-db';
import { getPaginatedStudents, getPaginatedParents, createStudent, getBehaviorRecords, getTimelineRecords } from '@/lib/supabase-db';
import { 
  Search, Phone, Mail, UserCircle, GraduationCap, ChevronRight, Filter, 
  MapPin, Calendar, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown,
  Plus, X, Loader2, Camera, UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

type DirectoryTab = 'students' | 'parents';
type ProfileTab = 'overview' | 'medical' | 'behavior' | 'timeline';

export default function StudentsPage() {
  const { user } = useAuth();
  const { can, isRole } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const [selectedPerson, setSelectedPerson] = useState<User | Student | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('overview');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isPromotionOpen, setIsPromotionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search query to avoid spamming the server
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: studentsResponse, isLoading: isStudentsLoading } = useSWR(
    ['students', page, debouncedSearch], 
    ([_, p, s]) => getPaginatedStudents(p, limit, s)
  );
  
  const students = studentsResponse?.data || [];
  const totalPages = studentsResponse?.totalPages || 1;
  const totalCount = studentsResponse?.count || 0;
  const isLoadingData = isStudentsLoading;

  const { data: behaviorData } = useSWR(
    selectedPerson && isStudent(selectedPerson) ? `behavior-${selectedPerson.id}` : null,
    () => getBehaviorRecords(selectedPerson!.id)
  );
  const { data: timelineData } = useSWR(
    selectedPerson && isStudent(selectedPerson) ? `timeline-${selectedPerson.id}` : null,
    () => getTimelineRecords(selectedPerson!.id)
  );
  
  const behaviorRecords = behaviorData || [];
  const timelineRecords = timelineData || [];

  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    grade: '',
    dob: '',
    gender: 'Male',
    bloodGroup: 'A+',
    address: '',
    parentName: '',
    parentPhone: '',
    photo: null as string | null
  });

  const isAdmin = isRole(['admin']);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('add') === 'true' && isAdmin) {
      const timer = setTimeout(() => {
        setIsAddStudentOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, isAdmin]);

  const isStudent = (person: User | Student): person is Student => {
    return 'grade' in person;
  };

  if (!user) return null;

  if (!can('view', 'students')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  let studentMembers = students;

  if (isRole('teacher')) {
    // Teachers see their students
    // Assuming we would filter this on the backend ideally, but keeping local filter for now
  } else if (isRole('student')) {
    // Students see only themselves
    studentMembers = studentMembers.filter(s => s.id === user.id || s.id === user.studentId);
  } else if (isRole('parent')) {
    // Parents see their children
    studentMembers = studentMembers.filter(s => s.id === user.studentId);
  }

  const filteredStudents = studentMembers;

  const handleCloseProfile = () => {
    setSelectedPerson(null);
    setActiveProfileTab('overview');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-500/20 text-purple-500 border-purple-500/20';
      case 'teacher': return 'bg-primary/20 text-primary border-primary/20';
      case 'accountant': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
      case 'staff': return 'bg-muted text-foreground border-border';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Students Directory</h1>
          <p className="text-muted-foreground mt-2 font-medium">Find contact information and detailed profiles for students and parents.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsPromotionOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-secondary text-secondary-foreground rounded-xl font-bold hover:bg-secondary/80 transition-all active:scale-[0.98] shadow-sm"
            >
              <GraduationCap size={20} />
              Promote Students
            </button>
            <button 
              onClick={() => setIsAddStudentOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
            >
              <UserPlus size={20} />
              Add Student
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card dark:bg-slate-900 p-4 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm shrink-0">
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all bg-card border border-border text-muted-foreground hover:bg-muted hover:border-border">
              <Filter size={16} />
              Filters
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-primary transition-all placeholder:text-muted-foreground dark:placeholder:text-muted-foreground text-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
          <div className="bg-card dark:bg-slate-900 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-bold">Student</th>
                    <th className="px-6 py-4 font-bold">Roll Number</th>
                    <th className="px-6 py-4 font-bold">Grade</th>
                    <th className="px-6 py-4 font-bold">Parent/Guardian</th>
                    <th className="px-6 py-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr 
                        key={student.id} 
                        onClick={() => setSelectedPerson(student)}
                        className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-lg shadow-inner border border-emerald-500/20">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-foreground group-hover:text-emerald-500 transition-colors">{student.name}</div>
                              <div className="text-xs text-muted-foreground">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">
                          {student.rollNumber}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-muted text-foreground border border-border">
                            <GraduationCap size={14} />
                            {student.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-medium">
                          {/* @ts-ignore */}
                          {student.parentNames || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-muted-foreground hover:text-emerald-500 transition-colors rounded-lg hover:bg-emerald-500/10">
                            <ChevronRight size={20} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 rounded-xl mt-4 shrink-0">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                Page <span className="text-foreground font-bold">{page}</span> of <span className="text-foreground font-bold">{totalPages}</span>
              </span>
              <span className="text-sm font-medium text-muted-foreground border-l border-border pl-4">
                Total: <span className="text-foreground font-bold">{totalCount}</span>
              </span>
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAddStudentOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">Register New Student</h2>
                  <p className="text-sm font-medium text-muted-foreground mt-2">Add a new student to the school database.</p>
                </div>
                <button 
                  onClick={() => setIsAddStudentOpen(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  
                  try {
                    const newStudent = await createStudent(formData);
                    
                    toast.success("Student registered successfully", {
                      description: `${formData.name} has been added to Grade ${formData.grade}.`
                    });
                    
                    // Refresh data
                    const [studentsData, parentsData] = await Promise.all([
                      getStudents(),
                      getParents()
                    ]);
                    setStudents(studentsData);
                    setParents(parentsData);
                    
                    setIsAddStudentOpen(false);
                    // Reset form
                    setFormData({
                      name: '',
                      studentId: '',
                      grade: '',
                      dob: '',
                      gender: 'Male',
                      bloodGroup: 'A+',
                      address: '',
                      parentName: '',
                      parentPhone: '',
                      photo: null
                    });
                  } catch (error) {
                    console.error('Error registering student:', error);
                    toast.error('Failed to register student');
                  } finally {
                    setIsSubmitting(false);
                  }
                }} 
                className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar"
              >
                <div className="flex flex-col items-center gap-4 py-4 border-b border-border mb-6">
                  <div 
                    onClick={() => {
                      // Simulate image upload
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            setFormData(prev => ({ ...prev, photo: e.target?.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground relative group cursor-pointer border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden"
                  >
                    {formData.photo ? (
                      <Image src={formData.photo} alt="Preview" fill className="object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Camera size={32} />
                    )}
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                      <Plus size={24} className="text-white" />
                    </div>
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {formData.photo ? 'Change Photo' : 'Upload Photo'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Full Name</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g., Bart Simpson" 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Student ID</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g., STU004" 
                      value={formData.studentId}
                      onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Grade</label>
                    <select 
                      required 
                      value={formData.grade}
                      onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
                    >
                      <option value="">Select Grade</option>
                      <option value="1">Grade 1</option>
                      <option value="2">Grade 2</option>
                      <option value="3">Grade 3</option>
                      <option value="4">Grade 4</option>
                      <option value="5">Grade 5</option>
                      <option value="6">Grade 6</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Date of Birth</label>
                    <input 
                      required 
                      type="date" 
                      value={formData.dob}
                      onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Gender</label>
                    <select 
                      required 
                      value={formData.gender}
                      onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Blood Group</label>
                    <select 
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData(prev => ({ ...prev, bloodGroup: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Residential Address</label>
                  <textarea 
                    rows={3} 
                    placeholder="Enter full address..." 
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium resize-none"
                  ></textarea>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="font-bold text-foreground mb-4">Parent/Guardian Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Parent Name</label>
                      <input 
                        required 
                        type="text" 
                        placeholder="e.g., Homer Simpson" 
                        value={formData.parentName}
                        onChange={(e) => setFormData(prev => ({ ...prev, parentName: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Contact Number</label>
                      <input 
                        required 
                        type="tel" 
                        placeholder="+1 234 567 890" 
                        value={formData.parentPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, parentPhone: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium" 
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsAddStudentOpen(false)}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Register Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedPerson && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 dark:bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-card dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-border dark:border-slate-800 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 sm:p-8 border-b border-border dark:border-slate-800 flex items-center gap-5 relative bg-muted/50 dark:bg-slate-800/50 shrink-0">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-bold text-3xl shrink-0 shadow-inner ${
                  'role' in selectedPerson && selectedPerson.role === 'parent' ? 'bg-amber-500/100/10 text-amber-500 border border-amber-500/20' :
                  isStudent(selectedPerson) ? 'bg-emerald-500/100/10 text-emerald-500 border border-emerald-500/20' :
                  'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {selectedPerson.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">{selectedPerson.name}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      'role' in selectedPerson ? getRoleBadgeColor(selectedPerson.role) : 'bg-emerald-500/100/10 text-emerald-500 border-emerald-500/20'
                    }`}>
                      {'role' in selectedPerson ? selectedPerson.role.replace(/([A-Z])/g, ' $1').trim() : 'Student'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleCloseProfile}
                  className="absolute top-6 right-6 p-2 bg-card rounded-xl border border-border text-muted-foreground hover:text-muted-foreground dark:hover:text-slate-300 transition-colors"
                >
                  <ChevronRight size={20} className="rotate-90 sm:rotate-0" />
                </button>
              </div>
              
              {/* Tabs */}
              {isStudent(selectedPerson) && (
                <div className="flex border-b border-border dark:border-slate-800 px-6 sm:px-8 overflow-x-auto scrollbar-hide shrink-0">
                  <button
                    onClick={() => setActiveProfileTab('overview')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'overview' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    Overview
                  </button>
                  
                  <button
                    onClick={() => setActiveProfileTab('medical')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'medical' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    Medical
                  </button>
                  <button
                    onClick={() => setActiveProfileTab('behavior')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'behavior' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    Behavior
                  </button>
                  <button
                    onClick={() => setActiveProfileTab('timeline')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'timeline' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    Timeline
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="p-6 sm:p-8 overflow-y-auto">
                {/* Overview Tab */}
                {activeProfileTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Contact Info */}
                      {'email' in selectedPerson && selectedPerson.email && (
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                          <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Mail size={20} /></div>
                          <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</p>
                            <p className="text-sm font-bold text-foreground mt-0.5 break-all">{selectedPerson.email}</p>
                          </div>
                        </div>
                      )}

                      {'phone' in selectedPerson && selectedPerson.phone && (
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                          <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Phone size={20} /></div>
                          <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone Number</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.phone}</p>
                          </div>
                        </div>
                      )}

                      {/* Student Specific Overview */}
                      {isStudent(selectedPerson) && (
                        <>
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><GraduationCap size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Grade</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.grade}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><UserCircle size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Roll No.</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.rollNumber}</p>
                            </div>
                          </div>
                          {selectedPerson.dob && (
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                              <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Calendar size={20} /></div>
                              <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date of Birth</p>
                                <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.dob}</p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {isStudent(selectedPerson) && selectedPerson.address && (
                      <div className="flex items-start gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                        <div className="p-3 bg-muted rounded-xl text-muted-foreground"><MapPin size={20} /></div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Address</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.address}</p>
                        </div>
                      </div>
                    )}

                    {isStudent(selectedPerson) && selectedPerson.medical?.emergencyContact && (
                      <div className="bg-destructive/10 rounded-2xl p-5 border border-destructive/20">
                        <h3 className="text-destructive dark:text-rose-400 font-bold flex items-center gap-2 mb-3">
                          <AlertCircle size={18} /> Emergency Contact
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-bold text-destructive/70 dark:text-rose-400/70 uppercase tracking-wider">Name</p>
                            <p className="text-sm font-bold text-foreground dark:text-rose-100">{selectedPerson.medical.emergencyContact.name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-destructive/70 dark:text-rose-400/70 uppercase tracking-wider">Relation</p>
                            <p className="text-sm font-bold text-foreground dark:text-rose-100">{selectedPerson.medical.emergencyContact.relation}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-destructive/70 dark:text-rose-400/70 uppercase tracking-wider">Phone</p>
                            <p className="text-sm font-bold text-foreground dark:text-rose-100">{selectedPerson.medical.emergencyContact.phone}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Student Medical Tab */}
                {activeProfileTab === 'medical' && isStudent(selectedPerson) && (
                  <div className="space-y-6">
                    {selectedPerson.medical ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-card dark:bg-slate-900 p-5 rounded-2xl border border-border dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-destructive/10 text-destructive rounded-lg"><Activity size={20} /></div>
                              <h3 className="font-bold text-foreground">Blood Group</h3>
                            </div>
                            <p className="text-2xl font-bold text-foreground">{selectedPerson.medical.bloodGroup}</p>
                          </div>
                          <div className="bg-card dark:bg-slate-900 p-5 rounded-2xl border border-border dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-primary/10 text-primary rounded-lg"><Heart size={20} /></div>
                              <h3 className="font-bold text-foreground">Conditions</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedPerson.medical.conditions.length > 0 ? (
                                selectedPerson.medical.conditions.map((c, i) => (
                                  <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-bold border border-primary/20">{c}</span>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">None listed</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-card dark:bg-slate-900 p-5 rounded-2xl border border-border dark:border-slate-800 shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-amber-500/100/10 text-amber-500 rounded-lg"><AlertCircle size={20} /></div>
                            <h3 className="font-bold text-foreground">Allergies</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedPerson.medical.allergies.length > 0 ? (
                              selectedPerson.medical.allergies.map((a, i) => (
                                <span key={i} className="px-3 py-1 bg-amber-500/100/10 text-amber-500 rounded-lg text-sm font-bold border border-amber-500/20 dark:border-amber-500/20">{a}</span>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">No known allergies</span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">No medical records available.</div>
                    )}
                  </div>
                )}

                {/* Student Behavior Tab */}
                {activeProfileTab === 'behavior' && isStudent(selectedPerson) && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-500/100/10 p-5 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/20 text-center">
                        <div className="w-10 h-10 mx-auto bg-card rounded-full flex items-center justify-center text-emerald-500 mb-2 shadow-sm">
                          <ThumbsUp size={20} />
                        </div>
                        <p className="text-3xl font-bold text-emerald-500">{selectedPerson.merits || 0}</p>
                        <p className="text-xs font-bold text-emerald-500/70 uppercase tracking-wider mt-1">Total Merits</p>
                      </div>
                      <div className="bg-destructive/10 p-5 rounded-2xl border border-destructive/20 text-center">
                        <div className="w-10 h-10 mx-auto bg-card rounded-full flex items-center justify-center text-destructive mb-2 shadow-sm">
                          <ThumbsDown size={20} />
                        </div>
                        <p className="text-3xl font-bold text-destructive">{selectedPerson.demerits || 0}</p>
                        <p className="text-xs font-bold text-destructive/70 uppercase tracking-wider mt-1">Total Demerits</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-bold text-foreground">Recent Records</h3>
                      {behaviorRecords.length > 0 ? (
                        behaviorRecords.map((record) => (
                          <div key={record.id} className="bg-card dark:bg-slate-900 p-4 rounded-xl border border-border dark:border-slate-800 shadow-sm flex gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              record.type === 'merit' ? 'bg-emerald-500/20 dark:bg-emerald-500/100/20 text-emerald-500' : 'bg-destructive/20 dark:bg-destructive/100/20 text-destructive'
                            }`}>
                              {record.type === 'merit' ? <Star size={18} /> : <AlertCircle size={18} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-foreground">{record.title || record.type}</h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                  record.type === 'merit' ? 'bg-emerald-500/100/20 text-emerald-500' : 'bg-destructive/20 text-destructive'
                                }`}>
                                  {record.type === 'merit' ? '+' : '-'}{record.points} pts
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{record.description}</p>
                              <p className="text-xs font-medium text-muted-foreground mt-2">{new Date(record.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">No behavior records found.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Student Timeline Tab */}
                {activeProfileTab === 'timeline' && isStudent(selectedPerson) && (
                  <div className="space-y-6">
                    {timelineRecords.length > 0 ? (
                      <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                        {timelineRecords.map((event) => (
                          <div key={event.id} className="relative">
                            <div className="absolute -left-[39px] w-8 h-8 rounded-full bg-card dark:bg-slate-900 border-2 border-primary/20 dark:border-indigo-900 flex items-center justify-center text-primary shadow-sm z-10">
                              {event.type === 'award' ? <Star size={14} /> : 
                               event.type === 'alert' ? <AlertCircle size={14} /> :
                               event.type === 'file' ? <Activity size={14} /> :
                               <Calendar size={14} />}
                            </div>
                            <div className="bg-card dark:bg-slate-900 p-4 rounded-xl border border-border dark:border-slate-800 shadow-sm">
                              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md mb-2 inline-block">
                                {new Date(event.date).toLocaleDateString()}
                              </span>
                              <h4 className="font-bold text-foreground">{event.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">No timeline events available.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-border dark:border-slate-800 bg-muted/50 dark:bg-slate-800/50">
                <button 
                  onClick={handleCloseProfile}
                  className="w-full px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-card border border-border hover:bg-muted transition-all active:scale-[0.98] shadow-sm"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Promotion Modal */}
      <AnimatePresence>
        {isPromotionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-[2rem] shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <GraduationCap className="text-primary" />
                  Promote Students
                </h2>
                <button onClick={() => setIsPromotionOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                <div className="bg-primary/10 text-primary p-4 rounded-xl text-sm font-medium">
                  This action will promote all eligible students to the next grade level and update their academic year. This process cannot be easily undone.
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Current Academic Year</label>
                    <input type="text" value="2023-2024" disabled className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-medium text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">New Academic Year</label>
                    <input type="text" value="2024-2025" disabled className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-medium text-foreground" />
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-border bg-muted/30 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsPromotionOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-muted-foreground bg-card border border-border hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsSubmitting(true);
                    setTimeout(() => {
                      setIsSubmitting(false);
                      setIsPromotionOpen(false);
                      toast.success('Students successfully promoted to the next academic year.');
                    }, 1500);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-70 flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Confirm Promotion'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
