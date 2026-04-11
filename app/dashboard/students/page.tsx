'use client';

import useSWR from 'swr';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { User, Student, Parent } from '@/lib/mock-db';
import { getPaginatedStudents, getPaginatedParents, createStudent, getBehaviorRecords, getTimelineRecords, getClasses, getActiveAcademicYear, getStudentCountForAcademicYear, createFeeItem, getFeeItems } from '@/lib/supabase-db';
import { supabase } from '@/lib/supabase/client';
import { 
  Search, Phone, Mail, UserCircle, GraduationCap, ChevronRight, Filter, 
  MapPin, Calendar, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown,
  Plus, X, Loader2, Camera, UserPlus, Settings, Trash2, Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

type DirectoryTab = 'students' | 'parents';
type ProfileTab = 'overview' | 'medical' | 'behavior' | 'timeline';

const isStudent = (person: User | Student | Parent): person is Student => {
  return person && 'grade' in person;
};

export default function StudentsPage() {
  const { user } = useAuth();
  const { can, isRole } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const [selectedPerson, setSelectedPerson] = useState<User | Student | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('overview');
  const [mainTab, setMainTab] = useState<'directory' | 'history' | 'promotions'>('directory');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [promotionType, setPromotionType] = useState<'grade' | 'class' | 'manual'>('grade');
  const [promotionValue, setPromotionValue] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search query to avoid spamming the server
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);

  const { data: studentsResponse, isLoading: isStudentsLoading, mutate: mutateStudents } = useSWR(
    ['students', page, debouncedSearch, activeAcademicYear?.name, mainTab === 'history'], 
    ([_, p, s, a, isDeleted]) => getPaginatedStudents(p, limit, s, a, isDeleted)
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

  const { data: classesData } = useSWR('classes', getClasses);
  const classesList = classesData?.map(c => c.name) || [];

  const { data: feeItemsData } = useSWR('fee_items', getFeeItems);
  const feeItemsList = feeItemsData || [];

  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    grade: '',
    dob: '',
    gender: 'Male',
    bloodGroup: 'A+',
    address: '',
    parentName: '',
    parentRelation: 'Father',
    parentPhone: '',
    feeType: 'predefined' as 'predefined' | 'manual',
    feeStructure: '',
    manualFeeName: '',
    manualFeeAmount: '',
    manualFeeFrequency: 'Per Term',
    manualFeeCategory: 'Academic',
    additionalInfo: ''
  });

  const handleRestoreStudent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_deleted: false, deleted_reason: null })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success("Student restored successfully");
      mutateStudents();
    } catch (error) {
      console.error('Error restoring student:', error);
      toast.error('Failed to restore student');
    }
  };

  const handlePromoteStudents = async (type: 'grade' | 'class' | 'manual', value?: string) => {
    if (!targetGrade || !value) return;
    setIsSubmitting(true);
    try {
      // 1. Fetch students to promote
      let query = supabase.from('students').select('id, grade, academic_year').eq('is_deleted', false);
      
      if (type === 'grade') {
        query = query.eq('grade', value);
      } else if (type === 'class') {
        // Assuming class name is same as grade for now, or we'd need a class_id
        query = query.eq('grade', value);
      } else if (type === 'manual') {
        // Manual search logic - for now we'll just use the value as student name/id
        query = query.or(`name.ilike.%${value}%,roll_number.ilike.%${value}%`);
      }

      const { data: studentsToPromote, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (!studentsToPromote || studentsToPromote.length === 0) {
        toast.error("No students found to promote");
        return;
      }

      // 2. Update students and create enrollment records
      const nextYear = activeAcademicYear ? 
        `${parseInt(activeAcademicYear.name.split('-')[1])}-${parseInt(activeAcademicYear.name.split('-')[1]) + 1}` : 
        '2026-2027';

      for (const student of studentsToPromote) {
        // Update student
        const { error: updateError } = await supabase
          .from('students')
          .update({ 
            grade: targetGrade, 
            academic_year: nextYear 
          })
          .eq('id', student.id);
        
        if (updateError) throw updateError;

        // Create enrollment record
        await supabase
          .from('academic_enrollments')
          .insert([{
            student_id: student.id,
            academic_year: nextYear,
            grade: targetGrade,
            status: targetGrade === 'Graduated' ? 'completed' : 'active'
          }]);
      }

      toast.success(`Successfully promoted ${studentsToPromote.length} students to ${targetGrade}`);
      mutateStudents();
      setIsPromotionModalOpen(false);
      setPromotionValue('');
      setTargetGrade('');
    } catch (error) {
      console.error('Error promoting students:', error);
      toast.error('Failed to promote students');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete || !deleteReason) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ 
          is_deleted: true, 
          deleted_reason: deleteReason 
        })
        .eq('id', studentToDelete);
      
      if (error) throw error;
      
      toast.success("Student deleted successfully");
      mutateStudents();
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
      setDeleteReason('');
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.studentId.trim()) errors.studentId = 'Student ID is required';
    else if (!/^[a-zA-Z0-9]+$/.test(formData.studentId)) errors.studentId = 'Student ID must be alphanumeric';
    if (!formData.grade) errors.grade = 'Grade is required';
    if (!formData.dob) errors.dob = 'Date of birth is required';
    if (!formData.parentName.trim()) errors.parentName = 'Parent name is required';
    if (!formData.parentPhone.trim()) errors.parentPhone = 'Parent phone is required';
    else if (!/^\+?[0-9\s\-()]{7,15}$/.test(formData.parentPhone)) errors.parentPhone = 'Invalid phone number format';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isAdmin = isRole(['admin']);
  const searchParams = useSearchParams();

  const handleOpenAddStudent = useCallback(async () => {
    setIsEditing(false);
    setEditingStudent(null);
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
      feeType: 'predefined',
      feeStructure: '',
      additionalInfo: ''
    });
    setIsAddStudentOpen(true);
    
    if (activeAcademicYear) {
      try {
        const count = await getStudentCountForAcademicYear(activeAcademicYear.name);
        const yearSuffix = activeAcademicYear.name.split('-')[0].slice(-2); // e.g., "2025-2026" -> "25"
        const nextNumber = String(count + 1).padStart(3, '0');
        const generatedId = `S${yearSuffix}${nextNumber}`;
        
        setFormData(prev => ({ ...prev, studentId: generatedId }));
      } catch (error) {
        console.error("Failed to generate student ID:", error);
      }
    }
  }, [activeAcademicYear]);

  const handleOpenEditStudent = (student: any) => {
    setIsEditing(true);
    setEditingStudent(student);
    
    // Check if fee structure is predefined by searching in feeItemsList
    const isPredefined = feeItemsList.some((item: any) => item.name === student.fee_structure);
    
    setFormData({
      name: student.name,
      studentId: student.roll_number,
      grade: student.grade,
      dob: student.dob,
      gender: student.gender || 'Male',
      bloodGroup: student.blood_group || 'A+',
      address: student.address || '',
      parentName: student.parents?.[0]?.parent?.name || '',
      parentRelation: student.parents?.[0]?.relationship || 'Father',
      parentPhone: student.parents?.[0]?.parent?.phone || '',
      feeType: isPredefined || !student.fee_structure ? 'predefined' : 'manual',
      feeStructure: student.fee_structure || '',
      manualFeeName: '',
      manualFeeAmount: '',
      manualFeeFrequency: 'Per Term',
      manualFeeCategory: 'Academic',
      additionalInfo: student.additional_info || ''
    });
    setIsAddStudentOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('add') === 'true' && isAdmin) {
      const timer = setTimeout(() => {
        handleOpenAddStudent();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, isAdmin, handleOpenAddStudent]);

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
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button 
              onClick={handleOpenAddStudent}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 w-full sm:w-auto"
            >
              <UserPlus size={20} />
              Add Student
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide shrink-0">
        {(["directory", "history", "promotions"] as const)
          .filter(tab => tab === 'directory' || isAdmin)
          .map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition-all ${
              mainTab === tab
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-card text-muted-foreground hover:bg-muted border border-border"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {mainTab === 'directory' && (
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
                    {isLoadingData ? (
                      [1, 2, 3, 4, 5].map((i: number) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Skeleton className="w-10 h-10 rounded-xl" />
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-md" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                          <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></td>
                        </tr>
                      ))
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                          No students found.
                        </td>
                      </tr>
                    ) : (
                      students.map((student: any) => (
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
                            {student.roll_number}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-muted text-foreground border border-border">
                              <GraduationCap size={14} />
                              {student.grade}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground font-medium">
                            {student.parents?.[0]?.parent?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isAdmin && (
                                <>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditStudent(student);
                                    }}
                                    className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
                                  >
                                    <Edit size={18} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStudentToDelete(student.id);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    className="p-2 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </>
                              )}
                              <button className="p-2 text-muted-foreground hover:text-emerald-500 transition-colors rounded-lg hover:bg-emerald-500/10">
                                <ChevronRight size={20} />
                              </button>
                            </div>
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
      )}

      {mainTab === 'history' && (
        <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card dark:bg-slate-900 p-4 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm shrink-0">
            <h2 className="text-xl font-bold text-foreground">Dropped & Deleted Students</h2>
            <div className="relative w-full sm:w-72">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search history..."
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
                      <th className="px-6 py-4 font-bold">Reason</th>
                      <th className="px-6 py-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingData ? (
                      [1, 2, 3, 4, 5].map((i: number) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-6 py-4"><Skeleton className="h-10 w-40 rounded-xl" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-md" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                          <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></td>
                        </tr>
                      ))
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                          No history records found.
                        </td>
                      </tr>
                    ) : (
                      students.map((student: any) => (
                        <tr 
                          key={student.id} 
                          className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center font-bold text-lg border border-border">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-foreground">{student.name}</div>
                                <div className="text-xs text-muted-foreground">{student.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-foreground">
                            {student.roll_number}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-muted text-foreground border border-border">
                              {student.grade}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground font-medium">
                            {student.deleted_reason || 'No reason provided'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleRestoreStudent(student.id)}
                              className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                              Restore
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
        </div>
      )}

      {mainTab === 'promotions' && (
        <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
          <div className="bg-card dark:bg-slate-900 p-6 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm">
            <h2 className="text-2xl font-bold text-foreground">Student Promotions</h2>
            <p className="text-muted-foreground mt-1">Promote students to the next grade or academic year.</p>
            
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div 
                  onClick={() => {
                    setPromotionType('grade');
                    setIsPromotionModalOpen(true);
                  }}
                  className="p-6 bg-muted/50 rounded-2xl border border-border hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <GraduationCap size={24} />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">Promote by Grade</h3>
                  <p className="text-sm text-muted-foreground mt-2">Bulk promote all students in a specific grade to the next level.</p>
                  <button className="mt-4 text-sm font-bold text-primary flex items-center gap-1">
                    Start Promotion <ChevronRight size={16} />
                  </button>
                </div>
                
                <div 
                  onClick={() => {
                    setPromotionType('class');
                    setIsPromotionModalOpen(true);
                  }}
                  className="p-6 bg-muted/50 rounded-2xl border border-border hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UserCircle size={24} />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">Promote by Class</h3>
                  <p className="text-sm text-muted-foreground mt-2">Promote students from a specific class section.</p>
                  <button className="mt-4 text-sm font-bold text-primary flex items-center gap-1">
                    Start Promotion <ChevronRight size={16} />
                  </button>
                </div>
                
                <div 
                  onClick={() => {
                    setPromotionType('manual');
                    setIsPromotionModalOpen(true);
                  }}
                  className="p-6 bg-muted/50 rounded-2xl border border-border hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-accent/10 text-accent-foreground rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Search size={24} />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">Manual Promotion</h3>
                  <p className="text-sm text-muted-foreground mt-2">Select individual students to promote manually.</p>
                  <button className="mt-4 text-sm font-bold text-primary flex items-center gap-1">
                    Start Promotion <ChevronRight size={16} />
                  </button>
                </div>
              </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isPromotionModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">Promote Students</h2>
                  <p className="text-sm font-medium text-muted-foreground mt-2">
                    {promotionType === 'grade' ? 'Promote students by grade level' : 
                     promotionType === 'class' ? 'Promote students by class section' : 
                     'Manually select students to promote'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsPromotionModalOpen(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">
                      {promotionType === 'grade' ? 'Select Current Grade' : 
                       promotionType === 'class' ? 'Select Current Class' : 
                       'Search Student'}
                    </label>
                    {promotionType === 'manual' ? (
                      <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                          type="text"
                          placeholder="Search student name or ID..."
                          value={promotionValue}
                          onChange={(e) => setPromotionValue(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary outline-none transition-all font-medium"
                        />
                      </div>
                    ) : (
                      <select 
                        value={promotionValue}
                        onChange={(e) => setPromotionValue(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary outline-none transition-all font-medium"
                      >
                        <option value="">Select {promotionType === 'grade' ? 'Grade' : 'Class'}</option>
                        {classesList.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Target Grade (Promotion To)</label>
                    <select 
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary outline-none transition-all font-medium"
                    >
                      <option value="">Select Target Grade</option>
                      {classesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Graduated">Graduated / Completed</option>
                    </select>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
                    <AlertCircle size={20} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-primary font-medium leading-relaxed">
                      Promoting students will update their current grade and academic year. This action will also create a new enrollment record for the upcoming session.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsPromotionModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-border rounded-xl font-bold hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handlePromoteStudents(promotionType, promotionValue)}
                    disabled={isSubmitting || !promotionValue || !targetGrade}
                    className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Promotion'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border p-8"
            >
              <div className="flex items-center gap-4 text-red-500 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Delete Student</h2>
                  <p className="text-sm font-medium text-muted-foreground">This will soft-delete the student record.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Reason for Deletion</label>
                  <textarea 
                    required
                    placeholder="e.g., Graduated, Dropped out, Transferred..."
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-red-500 outline-none transition-all font-medium min-h-[100px]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setStudentToDelete(null);
                      setDeleteReason('');
                    }}
                    className="flex-1 px-6 py-3 border border-border rounded-xl font-bold hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteStudent}
                    disabled={isSubmitting || !deleteReason}
                    className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">
                    {isEditing ? 'Update Student Details' : 'Register New Student'}
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground mt-2">
                    {isEditing ? 'Modify existing student information.' : 'Add a new student to the school database.'}
                  </p>
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
                  if (!validateForm()) {
                    toast.error('Please fix the errors in the form');
                    return;
                  }
                  setIsSubmitting(true);
                  
                  try {
                    let finalFeeStructure = formData.feeStructure;
                    
                    if (formData.feeType === 'manual') {
                      if (!formData.manualFeeName || !formData.manualFeeAmount) {
                        toast.error('Please fill in all manual fee details');
                        setIsSubmitting(false);
                        return;
                      }
                      
                      // Create the new fee item
                      const newFeeItem = await createFeeItem({
                        name: formData.manualFeeName,
                        amount: parseFloat(formData.manualFeeAmount),
                        frequency: formData.manualFeeFrequency,
                        category: formData.manualFeeCategory
                      });
                      
                      finalFeeStructure = newFeeItem.name;
                    }

                    if (isEditing && editingStudent) {
                      // Update existing student
                      const { error } = await supabase
                        .from('students')
                        .update({
                          name: formData.name,
                          grade: formData.grade,
                          roll_number: formData.studentId,
                          dob: formData.dob,
                          gender: formData.gender,
                          blood_group: formData.bloodGroup,
                          fee_structure: finalFeeStructure,
                          additional_info: formData.additionalInfo
                        })
                        .eq('id', editingStudent.id);
                      
                      if (error) throw error;
                      toast.success("Student updated successfully");
                    } else {
                      // Create new student
                      const newStudent = await createStudent({
                        ...formData,
                        feeStructure: finalFeeStructure,
                        academicYear: activeAcademicYear?.name
                      });
                      
                      toast.success("Student registered successfully", {
                        description: `${formData.name} has been added to Grade ${formData.grade}.`
                      });
                    }
                    
                    // Refresh data
                    await mutateStudents();
                    
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
                      parentRelation: 'Father',
                      parentPhone: '',
                      feeType: 'predefined',
                      feeStructure: '',
                      manualFeeName: '',
                      manualFeeAmount: '',
                      manualFeeFrequency: 'Per Term',
                      manualFeeCategory: 'Academic',
                      additionalInfo: ''
                    });
                    setFormErrors({});
                  } catch (error) {
                    console.error('Error registering student:', error);
                    toast.error('Failed to register student');
                  } finally {
                    setIsSubmitting(false);
                  }
                }} 
                className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Full Name</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g., Bart Simpson" 
                      value={formData.name}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, name: e.target.value }));
                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl border bg-muted/50 focus:bg-background focus:ring-4 outline-none transition-all font-medium ${formErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`} 
                    />
                    {formErrors.name && <p className="text-xs text-red-500 font-medium">{formErrors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Student ID (Auto-generated)</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g., S26001" 
                      value={formData.studentId}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl border bg-muted/50 border-border font-medium text-muted-foreground cursor-not-allowed" 
                    />
                    {formErrors.studentId && <p className="text-xs text-red-500 font-medium">{formErrors.studentId}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Grade</label>
                    <select 
                      required 
                      value={formData.grade}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, grade: e.target.value }));
                        if (formErrors.grade) setFormErrors(prev => ({ ...prev, grade: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl border bg-muted/50 focus:bg-background focus:ring-4 outline-none transition-all font-medium ${formErrors.grade ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`}
                    >
                      <option value="">Select Grade</option>
                      {classesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {formErrors.grade && <p className="text-xs text-red-500 font-medium">{formErrors.grade}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Date of Birth</label>
                    <input 
                      required 
                      type="date" 
                      value={formData.dob}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, dob: e.target.value }));
                        if (formErrors.dob) setFormErrors(prev => ({ ...prev, dob: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl border bg-muted/50 focus:bg-background focus:ring-4 outline-none transition-all font-medium ${formErrors.dob ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`} 
                    />
                    {formErrors.dob && <p className="text-xs text-red-500 font-medium">{formErrors.dob}</p>}
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Parent Name (Searchable)</label>
                      <input 
                        required 
                        type="text" 
                        placeholder="e.g., Homer Simpson" 
                        value={formData.parentName}
                        onChange={async (e) => {
                          const name = e.target.value;
                          setFormData(prev => ({ ...prev, parentName: name }));
                          if (name.length >= 3) {
                            const { data } = await supabase
                              .from('users')
                              .select('phone')
                              .ilike('name', `%${name}%`)
                              .eq('role', 'parent')
                              .maybeSingle();
                            if (data) {
                              setFormData(prev => ({ ...prev, parentPhone: data.phone || '' }));
                              toast.info(`Found existing parent phone: ${data.phone}`);
                            }
                          }
                        }}
                        className={`w-full px-4 py-3 rounded-xl border bg-muted/50 focus:bg-background focus:ring-4 outline-none transition-all font-medium ${formErrors.parentName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Relation to Student</label>
                      <select 
                        required 
                        value={formData.parentRelation}
                        onChange={(e) => setFormData(prev => ({ ...prev, parentRelation: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
                      >
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Parent Phone</label>
                      <input 
                        required 
                        type="tel" 
                        placeholder="+1 234 567 890" 
                        value={formData.parentPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, parentPhone: e.target.value }))}
                        className={`w-full px-4 py-3 rounded-xl border bg-muted/50 focus:bg-background focus:ring-4 outline-none transition-all font-medium ${formErrors.parentPhone ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`} 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="font-bold text-foreground mb-4">Fee Structure</h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, feeType: 'predefined' }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${formData.feeType === 'predefined' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}
                      >
                        Predefined
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, feeType: 'manual' }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${formData.feeType === 'manual' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}
                      >
                        Manual Entry
                      </button>
                    </div>
                    {formData.feeType === 'predefined' ? (
                      <select 
                        value={formData.feeStructure}
                        onChange={(e) => setFormData(prev => ({ ...prev, feeStructure: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary outline-none transition-all font-medium"
                      >
                        <option value="">Select Fee Structure</option>
                        {feeItemsList.map((item: any) => (
                          <option key={item.id} value={item.name}>{item.name} - ${item.amount} ({item.frequency})</option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-4 p-4 border border-border rounded-xl bg-muted/20">
                        <h4 className="font-bold text-sm text-foreground">Add Fee Item</h4>
                        <div>
                          <label className="block text-sm font-bold text-foreground mb-2">Item Name</label>
                          <input 
                            required 
                            type="text" 
                            placeholder="e.g. Custom Scholarship" 
                            value={formData.manualFeeName}
                            onChange={(e) => setFormData(prev => ({ ...prev, manualFeeName: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-foreground mb-2">Amount ($)</label>
                            <input 
                              required 
                              type="number" 
                              min="0" 
                              placeholder="0.00" 
                              value={formData.manualFeeAmount}
                              onChange={(e) => setFormData(prev => ({ ...prev, manualFeeAmount: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-foreground mb-2">Frequency</label>
                            <select 
                              value={formData.manualFeeFrequency}
                              onChange={(e) => setFormData(prev => ({ ...prev, manualFeeFrequency: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                            >
                              <option>Per Term</option>
                              <option>Monthly</option>
                              <option>Annual</option>
                              <option>One-time</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-foreground mb-2">Category</label>
                          <select 
                            value={formData.manualFeeCategory}
                            onChange={(e) => setFormData(prev => ({ ...prev, manualFeeCategory: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                          >
                            <option>Academic</option>
                            <option>Transport</option>
                            <option>Extracurricular</option>
                            <option>Facility</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <label className="text-sm font-bold text-foreground">Additional Information</label>
                  <textarea 
                    placeholder="Any other details (medical, allergies, etc.)..."
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary outline-none transition-all font-medium min-h-[100px] mt-2"
                  />
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
                                selectedPerson.medical.conditions.map((c: string, i: number) => (
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
                              selectedPerson.medical.allergies.map((a: string, i: number) => (
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
                        behaviorRecords.map((record: any) => (
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
                        {timelineRecords.map((event: any) => (
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

    </motion.div>
  );
}
