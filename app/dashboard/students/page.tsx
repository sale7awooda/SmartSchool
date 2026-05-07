'use client';

import useSWR from 'swr';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { User, Student, Parent, BehaviorRecord, TimelineEvent } from '@/types';
import { getPaginatedStudents, getPaginatedParents, createStudent, getBehaviorRecords, getTimelineRecords, getClasses, getActiveAcademicYear, getStudentCountForAcademicYear, getNextStudentId, getFeeItems, createFeeItem } from '@/lib/supabase-db';
import { processDeleteStudentAction } from '@/app/actions/students';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { 
  Search, Phone, Mail, UserCircle, GraduationCap, ChevronRight, Filter, 
  MapPin, Calendar, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown,
  Plus, X, Loader2, Camera, UserPlus, Settings, Trash2, Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { PromotionModal } from '@/components/dashboard/students/PromotionModal';
import { DeleteModal } from '@/components/dashboard/students/DeleteModal';
import { AddStudentModal } from '@/components/dashboard/students/AddStudentModal';
import { StudentProfileModal } from '@/components/dashboard/students/StudentProfileModal';
import { PromotionsTab } from '@/components/dashboard/students/PromotionsTab';

type DirectoryTab = 'students' | 'parents';
type ProfileTab = 'overview' | 'medical' | 'behavior' | 'timeline';

import { GradeCardsTab } from '@/components/dashboard/students/GradeCardsTab';

const isStudent = (person: User | Student | Parent | null): person is Student => {
  return !!(person && 'grade' in person);
};

export default function StudentsPage() {
  const { user } = useAuth();
  const { can, isRole } = usePermissions();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const [showFilters, setShowFilters] = useState(false);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterParentId, setFilterParentId] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterGender, setFilterGender] = useState('');

  const [selectedPerson, setSelectedPerson] = useState<User | Student | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('overview');
  const [mainTab, setMainTab] = useState<'directory' | 'gradecards' | 'promotions' | 'history'>('directory');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
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
    ['students', page, debouncedSearch, filterAcademicYear, mainTab === 'history', filterGrade, filterGender, filterParentId], 
    ([_, p, s, a, isDeleted, fGrade, fGender, fParent]) => getPaginatedStudents(p, limit, s, a || undefined, fGrade || undefined, isDeleted, fGender || undefined, fParent || undefined)
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
  const feeItems = feeItemsData || [];

  const [parentSearch, setParentSearch] = useState('');
  const { data: parentsSearchData } = useSWR(
    parentSearch.length >= 2 ? ['parents-search', parentSearch] : null,
    ([_, s]) => getPaginatedParents(1, 5, s)
  );
  const foundParents = parentsSearchData?.data || [];

  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    grade: '',
    dob: '',
    gender: 'Male',
    parentEmail: '',
    address: '',
    parentName: '',
    parentPhone: '',
    parentRelation: 'Father',
    feeType: 'predefined' as 'predefined' | 'manual',
    feeStructure: '',
    manualFeeItem: {
      name: '',
      amount: '',
      frequency: 'Per Term',
      category: 'Academic'
    },
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
    if (!studentToDelete || !deleteReason || !user) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('student_id', studentToDelete);
      formData.append('deletedBy', user.id);
      formData.append('reason', deleteReason);

      const result = await processDeleteStudentAction({ success: false, message: '' }, formData);
      
      if (!result.success) {
        toast.error("Error", { description: result.message });
        return;
      }
      
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

  const handleSaveStudent = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (isEditing && editingStudent) {
        const { error } = await supabase
          .from('students')
          .update({
            name: formData.name,
            roll_number: formData.studentId,
            grade: formData.grade,
            dob: formData.dob,
            gender: formData.gender,
            address: formData.address
          })
          .eq('id', editingStudent.id);
        if (error) throw error;
        toast.success("Student updated successfully");
      } else {
        await createStudent({
          name: formData.name,
          roll_number: formData.studentId,
          grade: formData.grade,
          dob: formData.dob,
          gender: formData.gender,
          address: formData.address,
          fee_structure: formData.feeStructure,
          additional_info: formData.additionalInfo
        });
        toast.success("Student created successfully");
      }
      mutateStudents();
      setIsAddStudentOpen(false);
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error('Failed to save student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (isEditing && !formData.studentId.trim()) errors.studentId = 'Student ID is required';
    
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
      parentEmail: '',
      address: '',
      parentName: '',
      parentPhone: '',
      parentRelation: 'Father',
      feeType: 'predefined',
      feeStructure: '',
      manualFeeItem: {
        name: '',
        amount: '',
        frequency: 'Per Term',
        category: 'Academic'
      },
      additionalInfo: ''
    });
    setIsAddStudentOpen(true);
    
    if (activeAcademicYear) {
      try {
        const generatedId = await getNextStudentId(activeAcademicYear.name);
        setFormData(prev => ({ ...prev, studentId: generatedId }));
      } catch (error) {
        console.error("Failed to generate student ID:", error);
      }
    }
  }, [activeAcademicYear]);

  const handleOpenEditStudent = (student: Student & { parents?: any[] }) => {
    setIsEditing(true);
    setEditingStudent(student);
    setFormData({
      name: student.name,
      studentId: String(student.roll_number || ''),
      grade: student.grade || '',
      dob: student.dob || '',
      gender: student.gender || 'Male',
      parentEmail: student.parents?.[0]?.parent?.email || '',
      address: student.address || '',
      parentName: student.parents?.[0]?.parent?.name || '',
      parentPhone: student.parents?.[0]?.parent?.phone || '',
      parentRelation: student.parents?.[0]?.relation || 'Father',
      feeType: student.fee_structure?.includes('$') ? 'manual' : 'predefined',
      feeStructure: student.fee_structure || '',
      manualFeeItem: {
        name: '',
        amount: '',
        frequency: 'Per Term',
        category: 'Academic'
      },
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
    return <div className="p-4">{t('no_permission')}</div>;
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('students_directory')}</h1>
          <p className="text-muted-foreground mt-2 font-medium">{t('students_directory_desc')}</p>
        </div>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button 
              onClick={handleOpenAddStudent}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 w-full sm:w-auto"
            >
              <UserPlus size={20} />
              {t('add_student')}
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide shrink-0">
        {(["directory", "gradecards", "promotions", "history"] as const)
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
            {tab === 'gradecards' ? t('grade_cards') || 'Grade Cards' : t(tab)}
          </button>
        ))}
      </div>

      {mainTab === 'directory' && (
        <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card dark:bg-slate-900 p-4 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm shrink-0">
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all border ${showFilters ? 'bg-primary/10 text-primary border-primary/20' : 'bg-card border-border text-muted-foreground hover:bg-muted hover:border-border'}`}>
                <Filter size={16} />
                {t('filters')}
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder={t('search_students')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-primary transition-all placeholder:text-muted-foreground dark:placeholder:text-muted-foreground text-foreground"
              />
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-card dark:bg-slate-900 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm shrink-0 overflow-hidden">
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Grade</label>
                    <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">All Grades</option>
                      {classesList.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Academic Year</label>
                    <select value={filterAcademicYear} onChange={e => setFilterAcademicYear(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">All Years</option>
                      <option value="2024-2025">2024-2025</option>
                      <option value="2025-2026">2025-2026</option>
                      <option value="2026-2027">2026-2027</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Gender</label>
                    <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">All</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Parent / Guardian Search</label>
                    {/* For simplicity we'll just have a parent search input that sets the parent id if selected from foundParents. 
                        A slightly simpler approach since we already have parentSearch and foundParents logic in this file */}
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Type to search parent..." 
                        value={parentSearch}
                        onChange={e => {
                          setParentSearch(e.target.value);
                          if (!e.target.value) setFilterParentId('');
                        }}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      {parentSearch.length >= 2 && foundParents.length > 0 && !filterParentId && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-40 overflow-auto">
                          {foundParents.map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setFilterParentId(p.id);
                                setParentSearch(p.name);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground"
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
            <div className="bg-card dark:bg-slate-900 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-bold">{t('student')}</th>
                      <th className="px-6 py-4 font-bold">{t('roll_number')}</th>
                      <th className="px-6 py-4 font-bold">{t('grade')}</th>
                      <th className="px-6 py-4 font-bold">{t('parent_guardian')}</th>
                      <th className="px-6 py-4 font-bold text-right rtl:text-left">{t('actions')}</th>
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
                          <td className="px-6 py-4 text-right rtl:text-left"><Skeleton className="h-8 w-8 rounded-lg ml-auto rtl:ml-0 rtl:mr-auto" /></td>
                        </tr>
                      ))
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                          {t('no_students_found')}
                        </td>
                      </tr>
                    ) : (
                      students.map((student: Student & { parents?: any[] }) => (
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
                          <td className="px-6 py-4 text-right rtl:text-left">
                            <div className="flex items-center justify-end gap-2 rtl:justify-start">
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
                {t('previous')}
              </button>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">
                  {t('page_of').replace('{page}', page.toString()).replace('{total}', totalPages.toString())}
                </span>
                <span className="text-sm font-medium text-muted-foreground border-l border-border pl-4 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-4">
                  {t('total')}: <span className="text-foreground font-bold">{totalCount}</span>
                </span>
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              >
                {t('next')}
              </button>
            </div>
          )}
        </div>
      )}

      {mainTab === 'history' && (
        <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card dark:bg-slate-900 p-4 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm shrink-0">
            <h2 className="text-xl font-bold text-foreground">{t('dropped_deleted_students')}</h2>
            <div className="relative w-full sm:w-72">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
              <input 
                type="text" 
                placeholder={t('search_history')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-primary transition-all placeholder:text-muted-foreground dark:placeholder:text-muted-foreground text-foreground rtl:pl-4 rtl:pr-12"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
            <div className="bg-card dark:bg-slate-900 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-bold">{t('student')}</th>
                      <th className="px-6 py-4 font-bold">{t('roll_number')}</th>
                      <th className="px-6 py-4 font-bold">{t('grade')}</th>
                      <th className="px-6 py-4 font-bold">{t('reason')}</th>
                      <th className="px-6 py-4 font-bold text-right rtl:text-left">{t('actions')}</th>
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
                          <td className="px-6 py-4 text-right rtl:text-left"><Skeleton className="h-8 w-8 rounded-lg ml-auto rtl:ml-0 rtl:mr-auto" /></td>
                        </tr>
                      ))
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                          {t('no_data')}
                        </td>
                      </tr>
                    ) : (
                      students.map((student: Student) => (
                        <tr 
                          key={student.id} 
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
                            {student.deleted_reason || t('none')}
                          </td>
                          <td className="px-6 py-4 text-right rtl:text-left">
                            <button 
                              onClick={() => handleRestoreStudent(student.id)}
                              className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                              {t('restore')}
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

      {mainTab === 'gradecards' && (
        <GradeCardsTab />
      )}

      {mainTab === 'promotions' && (
        <PromotionsTab 
          activeAcademicYear={activeAcademicYear} 
          mutateStudents={mutateStudents} 
          t={t} 
        />
      )}

      <PromotionModal isPromotionModalOpen={isPromotionModalOpen} setIsPromotionModalOpen={setIsPromotionModalOpen} promotionType={promotionType} setPromotionType={setPromotionType} promotionValue={promotionValue} setPromotionValue={setPromotionValue} targetGrade={targetGrade} setTargetGrade={setTargetGrade} isSubmitting={isSubmitting} handlePromoteStudents={handlePromoteStudents} classesList={classesList} t={t} />
      <DeleteModal isDeleteModalOpen={isDeleteModalOpen} setIsDeleteModalOpen={setIsDeleteModalOpen} setStudentToDelete={setStudentToDelete} deleteReason={deleteReason} setDeleteReason={setDeleteReason} isSubmitting={isSubmitting} handleDeleteStudent={handleDeleteStudent} t={t} />
      <AddStudentModal 
        isAddStudentOpen={isAddStudentOpen} 
        setIsAddStudentOpen={setIsAddStudentOpen} 
        isEditing={isEditing} 
        formData={formData} 
        setFormData={setFormData} 
        handleSaveStudent={handleSaveStudent} 
        isSubmitting={isSubmitting} 
        setIsSubmitting={setIsSubmitting}
        classesList={classesList} 
        feeItems={feeItems} 
        parentSearch={parentSearch} 
        setParentSearch={setParentSearch} 
        foundParents={foundParents} 
        t={t}
        validateForm={validateForm}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        activeAcademicYear={activeAcademicYear}
        editingStudent={editingStudent}
        mutateStudents={mutateStudents}
      />
      <StudentProfileModal selectedPerson={selectedPerson} setSelectedPerson={setSelectedPerson} activeProfileTab={activeProfileTab} setActiveProfileTab={setActiveProfileTab} behaviorRecords={behaviorRecords} timelineRecords={timelineRecords} t={t} isStudent={isStudent} handleCloseProfile={handleCloseProfile} />

    </motion.div>
  );
}
