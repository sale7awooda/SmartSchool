'use client';

import useSWR from 'swr';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { User, Student, Parent, BehaviorRecord, TimelineEvent } from '@/types';
import { getPaginatedStudents, getPaginatedParents, createStudent, getClasses, getActiveAcademicYear, getStudentCountForAcademicYear, getNextStudentId, getFeeItems, createFeeItem, getPaginatedInvoices, getStudentSubmissions } from '@/lib/supabase-db';
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
import { BulkOperationsTab } from '@/components/dashboard/students/BulkOperationsTab';
import { DirectoryTab } from '@/components/dashboard/students/DirectoryTab';
import { HistoryTab } from '@/components/dashboard/students/HistoryTab';

type DirectoryTabType = 'students' | 'parents';
type ProfileTab = 'overview' | 'statement' | 'assessments' | 'payments' | 'documents' | 'report-card';

const isStudent = (person: User | Student | Parent | null): person is Student => {
  return !!(person && 'grade' in person);
};

export default function StudentsPage() {
  const { user, switchStudent } = useAuth();
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
  const [mainTab, setMainTab] = useState<'directory' | 'promotions' | 'history' | 'bulk'>('directory');
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
    ([_, p, s, a, isDeleted, fGrade, fGender, fParent]) => {
      const forceStudentId = isRole('student') ? user?.studentId : undefined;
      const forceParentId = isRole('parent') ? user?.id : undefined;
      return getPaginatedStudents(p, limit, s, a || undefined, fGrade || undefined, isDeleted, fGender || undefined, fParent || undefined, forceStudentId, forceParentId);
    }
  );

  const students = useMemo(() => studentsResponse?.data || [], [studentsResponse]);
  const totalPages = studentsResponse?.totalPages || 1;
  const totalCount = studentsResponse?.count || 0;
  const isLoadingData = isStudentsLoading;

  const { data: paymentsData } = useSWR(
    selectedPerson && isStudent(selectedPerson) ? `payments-${selectedPerson.id}` : null,
    () => getPaginatedInvoices(1, 100, '', selectedPerson!.id)
  );
  const { data: assessmentsData } = useSWR(
    selectedPerson && isStudent(selectedPerson) ? `assessments-${selectedPerson.id}` : null,
    () => getStudentSubmissions(selectedPerson!.id)
  );
  
  const paymentRecords = paymentsData?.data || [];
  const assessmentRecords = assessmentsData || [];

  const { data: classesData } = useSWR('classes', getClasses);
  const classesList = classesData?.map(c => c.name) || [];

  const { data: feeItemsData } = useSWR('fee_items', getFeeItems);
  const feeItems = feeItemsData || [];

  const [parentSearch, setParentSearch] = useState('');
  const [debouncedParentSearch, setDebouncedParentSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedParentSearch(parentSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [parentSearch]);

  const { data: parentsSearchData } = useSWR(
    debouncedParentSearch.length >= 2 ? ['parents-search', debouncedParentSearch] : null,
    ([_, s]) => getPaginatedParents(1, 5, s)
  );
  const foundParents = parentsSearchData?.data || [];

  const [parentModalSearch, setParentModalSearch] = useState('');
  const [debouncedParentModalSearch, setDebouncedParentModalSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedParentModalSearch(parentModalSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [parentModalSearch]);

  const { data: parentsModalSearchData } = useSWR(
    debouncedParentModalSearch.length >= 1 ? ['parents-modal-search', debouncedParentModalSearch] : null,
    ([_, s]) => getPaginatedParents(1, 10, s)
  );
  const foundModalParents = parentsModalSearchData?.data || [];

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
    paymentStructure: 'Monthly',
    baseFeeAmount: '',
    isCustomFee: false,
    joiningDate: '',
    discountPercentage: '',
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
      paymentStructure: 'Term', // default 3 terms
      baseFeeAmount: '',
      isCustomFee: false,
      joiningDate: '',
      discountPercentage: '',
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
      feeType: 'predefined',
      feeStructure: student.fee_structure || '',
      paymentStructure: (student as any).payment_structure || 'Term',
      baseFeeAmount: (student as any).base_fee_amount ? String((student as any).base_fee_amount) : '',
      isCustomFee: (student as any).is_custom_fee || false,
      joiningDate: student.joining_date || '',
      discountPercentage: student.discount_percentage ? String(student.discount_percentage) : '',
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

  // Automatically select the active student when logged in as a student or parent
  useEffect(() => {
    const role = user?.role;
    if ((role === 'student' || role === 'parent') && students && students.length > 0) {
      if (role === 'parent' && user?.studentId) {
        const found = students.find((s: any) => s.id === user.studentId);
        if (found) {
          setSelectedPerson(found);
        } else {
          setSelectedPerson(students[0]);
        }
      } else {
        setSelectedPerson(students[0]);
      }
    }
  }, [students, user?.studentId, user?.role]);

  useEffect(() => {
    if (searchParams.get('add') === 'true' && isAdmin) {
      const timer = setTimeout(() => {
        handleOpenAddStudent();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, isAdmin, handleOpenAddStudent]);

  if (!user) return null;

  const isStudentOrParent = isRole('student') || isRole('parent');

  if (!can('view', 'students') && !isStudentOrParent) {
    return <div className="p-4">{t('no_permission')}</div>;
  }

  const filteredStudents = students;

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

  if (isStudentOrParent) {
    if (isLoadingData && !selectedPerson) {
      return (
        <div className="space-y-6 h-full flex flex-col justify-center items-center py-20">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">{t('loading_profile')}</p>
        </div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col overflow-y-auto custom-scrollbar pb-safe">
        {!isRole('parent') && (
          <div className="flex flex-col gap-2 shrink-0">
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              {t('my_profile')}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {t('access_credentials_desc')}
            </p>
          </div>
        )}

        <div className="flex-1 min-h-0">
          {selectedPerson ? (
            <StudentProfileModal
              selectedPerson={selectedPerson}
              setSelectedPerson={setSelectedPerson}
              activeProfileTab={activeProfileTab}
              setActiveProfileTab={setActiveProfileTab}
              paymentRecords={paymentRecords}
              assessmentRecords={assessmentRecords}
              t={t}
              isStudent={isStudent}
              handleCloseProfile={handleCloseProfile}
              isInline={true}
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-[2rem]">
              {t('no_associated_profiles')}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

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
        {(["directory", "promotions", "bulk", "history"] as const)
          .filter(tab => {
            if (tab === 'directory') return true;
            if (tab === 'promotions') return isRole(['admin']);
            if (tab === 'bulk') return isRole(['admin', 'staff', 'teacher']);
            if (tab === 'history') return isRole(['admin']);
            return false;
          })
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
            {t(tab)}
          </button>
        ))}
      </div>

      {mainTab === 'directory' && (
        <DirectoryTab
          t={t}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          filterGrade={filterGrade}
          setFilterGrade={setFilterGrade}
          filterAcademicYear={filterAcademicYear}
          setFilterAcademicYear={setFilterAcademicYear}
          filterGender={filterGender}
          setFilterGender={setFilterGender}
          filterParentId={filterParentId}
          setFilterParentId={setFilterParentId}
          parentSearch={parentSearch}
          setParentSearch={setParentSearch}
          foundParents={foundParents}
          classesList={classesList}
          isLoadingData={isLoadingData}
          students={students}
          isAdmin={isAdmin}
          setSelectedPerson={setSelectedPerson}
          handleOpenEditStudent={handleOpenEditStudent}
          setStudentToDelete={setStudentToDelete}
          setIsDeleteModalOpen={setIsDeleteModalOpen}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalCount={totalCount}
        />
      )}

      {mainTab === 'history' && (
        <HistoryTab
          t={t}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isLoadingData={isLoadingData}
          students={students}
          handleRestoreStudent={handleRestoreStudent}
        />
      )}

      {mainTab === 'promotions' && (
        <PromotionsTab 
          activeAcademicYear={activeAcademicYear} 
          mutateStudents={mutateStudents} 
          t={t} 
        />
      )}

      {mainTab === 'bulk' && isRole(['admin', 'staff', 'teacher']) && (
        <BulkOperationsTab 
          activeAcademicYear={activeAcademicYear} 
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
        parentSearch={parentModalSearch} 
        setParentSearch={setParentModalSearch} 
        foundParents={foundModalParents} 
        t={t}
        validateForm={validateForm}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        activeAcademicYear={activeAcademicYear}
        editingStudent={editingStudent}
        mutateStudents={mutateStudents}
      />
      <StudentProfileModal selectedPerson={selectedPerson} setSelectedPerson={setSelectedPerson} activeProfileTab={activeProfileTab} setActiveProfileTab={setActiveProfileTab} paymentRecords={paymentRecords} assessmentRecords={assessmentRecords} t={t} isStudent={isStudent} handleCloseProfile={handleCloseProfile} />

    </motion.div>
  );
}
