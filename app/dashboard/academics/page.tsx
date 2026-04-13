"use client";

import useSWR from 'swr';
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/lib/permissions";
import { Student } from "@/lib/mock-db";
import { useLanguage } from "@/lib/language-context";
import { 
  getAssessments, 
  createAssessment, 
  getSubmissions, 
  updateSubmission,
  getStudents,
  getStudentByUserId,
  getParentByUserId,
  getStudentSubmissions,
  getAcademicYears,
  getClasses,
  getSubjects,
  createAcademicYear,
  createClass,
  createSubject,
  getActiveAcademicYear,
  updateAcademicYear,
  updateClass,
  updateSubject,
  deleteAcademicYear,
  deleteClass,
  deleteSubject
} from "@/lib/supabase-db";
import { supabase } from "@/lib/supabase/client";
import {
  BookOpen,
  GraduationCap,
  Award,
  Plus,
  Save,
  Loader2,
  ChevronLeft,
  FileText,
  TrendingUp,
  Calendar,
  Settings,
  Users,
  Monitor,
  PenTool,
  ClipboardList,
  Filter,
  CheckCircle2,
  Clock,
  UploadCloud,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Trash2,
  Edit2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export default function AcademicsPage() {
  const { user } = useAuth();
  const { can, isRole } = usePermissions();
  const { t } = useLanguage();

  if (!user) return null;

  if (!can('view', 'academics')) {
    return <div className="p-4">{t('no_permission')}</div>;
  }

  if (isRole("teacher")) return <TeacherAcademics />;
  if (isRole(["parent", "student"])) return <ParentAcademics />;
  if (isRole(["admin"]))
    return <AdminAcademics />;

  return (
    <div className="p-4">You do not have permission to view this page.</div>
  );
}

// --- Admin View ---
function AdminAcademics() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    "overview" | "years" | "classes" | "subjects"
  >("overview");

  const [isAddYearOpen, setIsAddYearOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<any>(null);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: academicYearsData, isLoading: isYearsLoading, mutate: mutateYears } = useSWR('academicYears', () => getAcademicYears());
  const { data: classesData, isLoading: isClassesLoading, mutate: mutateClasses } = useSWR('classes', () => getClasses());
  const { data: subjectsData, isLoading: isSubjectsLoading, mutate: mutateSubjects } = useSWR('subjects', () => getSubjects());

  const isLoading = isYearsLoading || isClassesLoading || isSubjectsLoading;
  const academicYears = academicYearsData || [];
  const classes = classesData || [];
  const subjects = subjectsData || [];

  const handleCreateYear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const yearData = {
      name: formData.get("name") as string,
      start_date: formData.get("startDate") as string,
      end_date: formData.get("endDate") as string,
      is_active: editingYear ? editingYear.is_active : true
    };

    try {
      if (editingYear) {
        const updatedYear = await updateAcademicYear(editingYear.id, yearData);
        mutateYears(academicYears.map(y => y.id === editingYear.id ? updatedYear : y));
        toast.success("Academic year updated successfully");
      } else {
        const newYear = await createAcademicYear(yearData);
        mutateYears([newYear, ...academicYears]);
        toast.success("Academic year created successfully");
      }
      setIsAddYearOpen(false);
      setEditingYear(null);
    } catch (error) {
      console.error("Error saving academic year:", error);
      toast.error("Failed to save academic year");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteYear = async (id: string) => {
    try {
      await deleteAcademicYear(id);
      mutateYears(academicYears.filter(y => y.id !== id));
      toast.success("Academic year deleted successfully");
    } catch (error) {
      console.error("Error deleting academic year:", error);
      toast.error("Failed to delete academic year");
    }
  };

  const handleCreateClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const classData = {
      name: formData.get("name") as string,
      grade: formData.get("grade") as string,
      section: formData.get("section") as string,
      academic_year_id: formData.get("academicYearId") as string
    };

    try {
      if (editingClass) {
        const updatedClass = await updateClass(editingClass.id, classData);
        mutateClasses(classes.map(c => c.id === editingClass.id ? updatedClass : c));
        toast.success("Class updated successfully");
      } else {
        const newClass = await createClass(classData);
        mutateClasses([newClass, ...classes]);
        toast.success("Class created successfully");
      }
      setIsAddClassOpen(false);
      setEditingClass(null);
    } catch (error) {
      console.error("Error saving class:", error);
      toast.error("Failed to save class");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    try {
      await deleteClass(id);
      mutateClasses(classes.filter(c => c.id !== id));
      toast.success("Class deleted successfully");
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Failed to delete class");
    }
  };

  const handleCreateSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const subjectData = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      description: formData.get("description") as string
    };

    try {
      if (editingSubject) {
        const updatedSubject = await updateSubject(editingSubject.id, subjectData);
        mutateSubjects(subjects.map(s => s.id === editingSubject.id ? updatedSubject : s));
        toast.success("Subject updated successfully");
      } else {
        const newSubject = await createSubject(subjectData);
        mutateSubjects([newSubject, ...subjects]);
        toast.success("Subject created successfully");
      }
      setIsAddSubjectOpen(false);
      setEditingSubject(null);
    } catch (error) {
      console.error("Error saving subject:", error);
      toast.error("Failed to save subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await deleteSubject(id);
      mutateSubjects(subjects.filter(s => s.id !== id));
      toast.success("Subject deleted successfully");
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("Failed to delete subject");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 h-full flex flex-col p-4 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-muted rounded-xl" />
            <div className="h-5 w-96 bg-muted rounded-xl" />
          </div>
          <div className="h-12 w-48 bg-muted rounded-xl" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-muted rounded-full" />
          <div className="h-10 w-24 bg-muted rounded-full" />
          <div className="h-10 w-24 bg-muted rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-32 bg-muted rounded-2xl" />
        </div>
        <div className="flex-1">
          <div className="h-full min-h-[400px] bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {t('academics')}
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            {t('academics_desc')}
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide shrink-0">
        {(["overview", "years", "classes", "subjects"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:bg-muted hover:border-border"
            }`}
          >
            {t(tab === 'years' ? 'academic_years' : tab)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Calendar size={24} />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {t('active')} {t('date')}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {academicYears.find(y => y.is_active)?.name || t('none')}
              </p>
              <p className="text-xs font-medium text-emerald-500 mt-2 bg-emerald-500/10 w-fit px-2 py-1 rounded-md">
                {t('academics')}
              </p>
            </div>
            <div className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                <BookOpen size={24} />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {t('total')} {t('classes')}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{classes.length}</p>
              <p className="text-xs font-medium text-muted-foreground mt-2">
                {t('across_all_grades')}
              </p>
            </div>
            <div className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                <Award size={24} />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {t('total')} {t('subjects')}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{subjects.length}</p>
              <p className="text-xs font-medium text-muted-foreground mt-2">
                {t('active_curriculum')}
              </p>
            </div>
          </div>
        )}

        {activeTab === "classes" && (
          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/50">
              <h3 className="font-bold text-foreground text-lg">
                {t('classes_sections')}
              </h3>
              <button 
                onClick={() => setIsAddClassOpen(true)}
                className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus size={16} /> {t('add_class')}
              </button>
            </div>
            <div className="divide-y divide-border">
              {classes.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground font-medium">
                  {t('no_data')}
                </div>
              ) : (
                classes.map((cls, i) => (
                  <div
                    key={cls.id}
                    className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-foreground text-lg">
                        {cls.name}
                      </h4>
                      <p className="text-sm font-medium text-muted-foreground mt-1">
                        {cls.grade} • {t('section')} {cls.section || t('none')}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground mt-1">
                        {t('year')}: {cls.academic_year?.name} • {t('teacher')}: {cls.teacher?.name || t('none')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          setEditingClass(cls);
                          setIsAddClassOpen(true);
                        }}
                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(t('confirm_delete'))) {
                            handleDeleteClass(cls.id);
                          }
                        }}
                        className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "years" && (
          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/50">
              <h3 className="font-bold text-foreground text-lg">
                {t('academic_years')}
              </h3>
              <button 
                onClick={() => setIsAddYearOpen(true)}
                className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus size={16} /> {t('add_year')}
              </button>
            </div>
            <div className="divide-y divide-border">
              {academicYears.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground font-medium">
                  {t('no_data')}
                </div>
              ) : (
                academicYears.map((year) => (
                  <div
                    key={year.id}
                    className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-foreground text-lg">
                        {year.name}
                      </h4>
                      <p className="text-sm font-medium text-muted-foreground mt-1">
                        {year.start_date} {t('to')} {year.end_date}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        year.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                      }`}>
                        {year.is_active ? t('active') : t('inactive')}
                      </span>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setEditingYear(year);
                            setIsAddYearOpen(true);
                          }}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(t('confirm_delete'))) {
                              handleDeleteYear(year.id);
                            }
                          }}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "subjects" && (
          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/50">
              <h3 className="font-bold text-foreground text-lg">
                {t('curriculum_subjects')}
              </h3>
              <button 
                onClick={() => setIsAddSubjectOpen(true)}
                className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus size={16} /> {t('add_subject')}
              </button>
            </div>
            <div className="divide-y divide-border">
              {subjects.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground font-medium">
                  {t('no_data')}
                </div>
              ) : (
                subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-foreground text-lg">
                        {subject.name}
                      </h4>
                      <p className="text-sm font-medium text-muted-foreground mt-1">
                        {t('subject_code')}: {subject.code || t('none')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-muted-foreground max-w-xs truncate">
                        {subject.description || t('no_data')}
                      </p>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setEditingSubject(subject);
                            setIsAddSubjectOpen(true);
                          }}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(t('confirm_delete'))) {
                              handleDeleteSubject(subject.id);
                            }
                          }}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAddYearOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{editingYear ? t('edit_year') : t('add_year')}</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">{editingYear ? t('update_academic_year_desc') : t('create_academic_year_desc')}</p>
              </div>
              
              <form onSubmit={handleCreateYear} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('year_name')}</label>
                  <input required name="name" type="text" defaultValue={editingYear?.name} placeholder="e.g., 2024 - 2025" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('start_date')}</label>
                    <input required name="startDate" type="date" defaultValue={editingYear?.start_date} className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('end_date')}</label>
                    <input required name="endDate" type="date" defaultValue={editingYear?.end_date} className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground" />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddYearOpen(false);
                      setEditingYear(null);
                    }}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (editingYear ? t('save_changes') : t('add_year'))}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddClassOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{editingClass ? t('edit_class') : t('add_class')}</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">{editingClass ? t('update_class_desc') : t('create_class_desc')}</p>
              </div>
              
              <form onSubmit={handleCreateClass} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('class_name')}</label>
                  <input required name="name" type="text" defaultValue={editingClass?.name} placeholder="e.g., Grade 4 - Section A" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('grade')}</label>
                    <input required name="grade" type="text" defaultValue={editingClass?.grade} placeholder="e.g., Grade 4" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('section')}</label>
                    <input name="section" type="text" defaultValue={editingClass?.section} placeholder="e.g., A" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('academic_year')}</label>
                  <select required name="academicYearId" defaultValue={editingClass?.academic_year_id} className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                    {academicYears.map(year => (
                      <option key={year.id} value={year.id}>{year.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddClassOpen(false);
                      setEditingClass(null);
                    }}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (editingClass ? t('save_changes') : t('add_class'))}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddSubjectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{editingSubject ? t('edit_subject') : t('add_subject')}</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">{editingSubject ? t('update_subject_desc') : t('create_subject_desc')}</p>
              </div>
              
              <form onSubmit={handleCreateSubject} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('subject_name')}</label>
                  <input required name="name" type="text" defaultValue={editingSubject?.name} placeholder="e.g., Mathematics" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('subject_code')}</label>
                  <input required name="code" type="text" defaultValue={editingSubject?.code} placeholder="e.g., MATH101" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('description')}</label>
                  <textarea name="description" rows={3} defaultValue={editingSubject?.description} placeholder="Brief description of the subject..." className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddSubjectOpen(false);
                      setEditingSubject(null);
                    }}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (editingSubject ? t('save_changes') : t('add_subject'))}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Types & Mock Data for Assessments ---
type AssessmentType =
  | "Homework"
  | "Assignment"
  | "Online Exam"
  | "Offline Exam";

interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  subject: string;
  class: string;
  maxScore: number;
  date: string;
  status: "Draft" | "Published" | "Graded";
  description?: string;
  attachments?: string[];
}

interface StudentSubmission {
  id: string;
  assessmentId: string;
  studentId: string;
  status: "To Do" | "In Progress" | "Submitted" | "Graded";
  submittedAt?: string;
  files?: string[];
  score?: number;
  feedback?: string;
}

const MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: "a1",
    title: "Algebra Chapter 1",
    type: "Homework",
    subject: "Mathematics",
    class: "Grade 4 - Section A",
    maxScore: 10,
    date: "2023-10-15",
    status: "Graded",
    description: "Complete exercises 1-20 on page 45.",
  },
  {
    id: "a2",
    title: "Midterm Exam",
    type: "Offline Exam",
    subject: "Mathematics",
    class: "Grade 4 - Section A",
    maxScore: 100,
    date: "2023-10-20",
    status: "Published",
  },
  {
    id: "a3",
    title: "Cell Structure Quiz",
    type: "Online Exam",
    subject: "Science",
    class: "Grade 4 - Section A",
    maxScore: 20,
    date: "2023-10-22",
    status: "Published",
  },
  {
    id: "a4",
    title: "Lab Report 1",
    type: "Assignment",
    subject: "Science",
    class: "Grade 4 - Section A",
    maxScore: 50,
    date: "2023-10-25",
    status: "Draft",
    description:
      "Write a detailed report on the photosynthesis experiment. Include your hypothesis, methodology, results, and conclusion.",
  },
  {
    id: "a5",
    title: "Solar System Project",
    type: "Assignment",
    subject: "Science",
    class: "Grade 4 - Section A",
    maxScore: 100,
    date: "2023-11-05",
    status: "Published",
    description:
      "Create a model of the solar system and write a 2-page report on your favorite planet.",
  },
];

const MOCK_SUBMISSIONS: StudentSubmission[] = [
  {
    id: "sub1",
    assessmentId: "a5",
    studentId: "STU001",
    status: "In Progress",
  },
  { id: "sub2", assessmentId: "a4", studentId: "STU001", status: "To Do" },
  {
    id: "sub3",
    assessmentId: "a1",
    studentId: "STU001",
    status: "Graded",
    score: 10,
    feedback: "Excellent work!",
  },
];

const getAssessmentIcon = (type: AssessmentType) => {
  switch (type) {
    case "Homework":
      return <FileText size={18} />;
    case "Assignment":
      return <ClipboardList size={18} />;
    case "Online Exam":
      return <Monitor size={18} />;
    case "Offline Exam":
      return <PenTool size={18} />;
  }
};

const getAssessmentColor = (type: AssessmentType) => {
  switch (type) {
    case "Homework":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "Assignment":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "Online Exam":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "Offline Exam":
      return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  }
};

// --- Teacher View ---
function TeacherAcademics() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const [activeTab, setActiveTab] = useState<
    "assessments" | "gradebook" | "submissions"
  >("assessments");
  const [showNewAssessment, setShowNewAssessment] = useState(false);

  // Gradebook Flow State
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Submissions State
  const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<any | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedSubmissionToReview, setSelectedSubmissionToReview] = useState<any>(null);

  const { data: assessmentsData, isLoading: isAssessmentsLoading, mutate: mutateAssessments } = useSWR(
    ['assessments', activeAcademicYear?.name], 
    () => getAssessments()
  );
  const { data: studentsData, isLoading: isStudentsLoading } = useSWR(
    ['students', activeAcademicYear?.name], 
    ([_, a]) => getStudents(a)
  );
  const { data: submissionsData, isLoading: isSubmissionsLoading, mutate: mutateSubmissions } = useSWR(
    activeTab === 'submissions' ? 'submissions' : null, 
    () => getSubmissions()
  );

  const isLoading = isAssessmentsLoading || isStudentsLoading;
  const assessments = assessmentsData || [];
  const students = studentsData || [];
  const submissions = submissionsData || [];

  const handleReviewSubmission = (submission: any) => {
    setSelectedSubmissionToReview(submission);
    setIsReviewModalOpen(true);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmissionToReview) return;
    
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      await updateSubmission(selectedSubmissionToReview.id, {
        score: Number(formData.get('score')),
        feedback: formData.get('feedback'),
        status: 'Graded'
      });
      
      toast.success("Submission graded successfully");
      setIsReviewModalOpen(false);
      // Refresh submissions
      mutateSubmissions();
    } catch (error) {
      console.error('Error grading submission:', error);
      toast.error("Failed to grade submission");
    } finally {
      setIsSaving(false);
    }
  };

  // Mock state for grades: { assessmentId: { studentId: score } }
  const [grades, setGrades] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [feedbacks, setFeedbacks] = useState<
    Record<string, Record<string, string>>
  >({});

  const { data: classesData } = useSWR('classes', getClasses);
  const { data: subjectsData } = useSWR('subjects', getSubjects);

  const classes = classesData?.map(c => c.name) || ["Loading..."];
  const subjects = subjectsData?.map(s => s.name) || ["Loading..."];

  const handleGradeChange = (studentId: string, value: string) => {
    if (!selectedAssessment) return;
    setGrades((prev) => ({
      ...prev,
      [selectedAssessment.id]: {
        ...(prev[selectedAssessment.id] || {}),
        [studentId]: value,
      },
    }));
  };

  const handleFeedbackChange = (studentId: string, value: string) => {
    if (!selectedAssessment) return;
    setFeedbacks((prev) => ({
      ...prev,
      [selectedAssessment.id]: {
        ...(prev[selectedAssessment.id] || {}),
        [studentId]: value,
      },
    }));
  };

  const handleSaveGrades = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (selectedAssessment) {
      mutateAssessments(
        assessments.map((a: any) =>
          a.id === selectedAssessment.id ? { ...a, status: "Graded" } : a,
        ),
      );
    }

    setIsSaving(false);
    toast.success("Grades saved successfully", {
      description: `Updated records for ${selectedAssessment?.title}.`,
    });
  };

  const handleCreateAssessment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assessmentData = {
      title: formData.get("title") as string,
      type: formData.get("type") as string,
      subject: formData.get("subject") as string,
      class: formData.get("class") as string,
      max_score: Number(formData.get("maxScore")),
      date: formData.get("date") as string,
      status: "Published",
      description: formData.get("description") as string,
    };

    try {
      const newAssessment = await createAssessment(assessmentData);
      mutateAssessments([newAssessment, ...assessments]);
      setShowNewAssessment(false);
      toast.success("Assessment created successfully");
    } catch (error) {
      console.error('Error creating assessment:', error);
      toast.error("Failed to create assessment");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 h-full flex flex-col p-4 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-muted rounded-xl" />
            <div className="h-5 w-96 bg-muted rounded-xl" />
          </div>
          <div className="h-12 w-48 bg-muted rounded-xl" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-muted rounded-full" />
          <div className="h-10 w-24 bg-muted rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-32 bg-muted rounded-2xl" />
        </div>
        <div className="flex-1">
          <div className="h-full min-h-[400px] bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {t('academics')}
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            {t('academics_desc')}
          </p>
        </div>
        <div className="flex bg-muted p-1 rounded-xl w-fit shrink-0 overflow-x-auto max-w-full scrollbar-hide">
          <button
            onClick={() => setActiveTab("assessments")}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "assessments"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('assessments')}
          </button>
          <button
            onClick={() => setActiveTab("gradebook")}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "gradebook"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('gradebook')}
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "submissions"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('submissions')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
        {activeTab === "assessments" && (
          <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-foreground">
              {t('all_assessments')}
            </h2>
            <button
              onClick={() => setShowNewAssessment(!showNewAssessment)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-sm"
            >
              {showNewAssessment ? (
                <ChevronLeft size={18} />
              ) : (
                <Plus size={18} />
              )}
              {showNewAssessment ? t('back_to_list') : t('new_assessment')}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {showNewAssessment ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleCreateAssessment}
                className="bg-card p-6 sm:p-8 rounded-[1.5rem] border border-border shadow-sm space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-foreground">
                      {t('assessment_title')}
                    </label>
                    <input
                      required
                      name="title"
                      type="text"
                      placeholder="e.g. Chapter 4 Quiz"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-foreground">
                      {t('description')} / {t('instructions')}
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Provide clear instructions for the students..."
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-foreground"
                    ></textarea>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">
                      {t('type')}
                    </label>
                    <select
                      required
                      name="type"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none text-foreground"
                    >
                      <option value="Homework">{t('homework')}</option>
                      <option value="Assignment">{t('assignment')}</option>
                      <option value="Online Exam">{t('online_exam')}</option>
                      <option value="Offline Exam">{t('offline_exam')}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">
                      {t('class')}
                    </label>
                    <select
                      required
                      name="class"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none text-foreground"
                    >
                      {classes.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">
                      {t('subject')}
                    </label>
                    <select
                      required
                      name="subject"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none text-foreground"
                    >
                      {subjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">
                      {t('max_score')}
                    </label>
                    <input
                      required
                      name="maxScore"
                      type="number"
                      min="1"
                      defaultValue="100"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">
                      {t('due_date')} / {t('exam_date')}
                    </label>
                    <input
                      required
                      name="date"
                      type="date"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-border flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewAssessment(false)}
                    className="px-6 py-3 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-sm"
                  >
                    {t('new_assessment')}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {assessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="bg-card p-5 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${getAssessmentColor(assessment.type)}`}
                      >
                        {getAssessmentIcon(assessment.type)}
                        {assessment.type}
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                          assessment.status === "Graded"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : assessment.status === "Published"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {assessment.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground text-lg mb-1">
                      {assessment.title}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground mb-4">
                      {assessment.class} • {assessment.subject}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={16} /> {assessment.date}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Award size={16} /> Max: {assessment.max_score}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(assessment.type === "Assignment" ||
                          assessment.type === "Homework") && (
                          <button
                            onClick={() => {
                              setViewingSubmissionsFor(assessment);
                              setActiveTab("submissions");
                            }}
                            className="text-muted-foreground font-bold text-sm hover:text-primary px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                          >
                            {t('view_submissions')}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedClass(assessment.class);
                            setSelectedSubject(assessment.subject);
                            setSelectedAssessment(assessment);
                            setActiveTab("gradebook");
                          }}
                          className="text-primary font-bold text-sm hover:text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary transition-colors"
                        >
                          {t('grade_now')} &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {activeTab === "gradebook" && (
        <div className="space-y-6">
          {!selectedAssessment ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Step 1 & 2: Select Class & Subject */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm space-y-4">
                  <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                      1
                    </span>
                    {t('select_class')}
                  </h3>
                  <div className="space-y-2">
                    {classes.map((cls) => (
                      <button
                        key={cls}
                        onClick={() => {
                          setSelectedClass(cls);
                          setSelectedSubject(null);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                          selectedClass === cls
                            ? "bg-primary/5 border-primary/20 text-primary"
                            : "bg-card border-border text-muted-foreground hover:border-primary/20"
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={`bg-card p-6 rounded-[1.5rem] border border-border shadow-sm space-y-4 transition-opacity ${!selectedClass ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                      2
                    </span>
                    {t('select_subject')}
                  </h3>
                  <div className="space-y-2">
                    {subjects.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubject(sub)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                          selectedSubject === sub
                            ? "bg-primary/5 border-primary/20 text-primary"
                            : "bg-card border-border text-muted-foreground hover:border-primary/20"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 3: Select Assessment */}
              <div className="lg:col-span-2">
                <div
                  className={`bg-card p-6 rounded-[1.5rem] border border-border shadow-sm min-h-[400px] transition-opacity ${!selectedSubject ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <h3 className="font-bold text-foreground text-lg flex items-center gap-2 mb-6">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                      3
                    </span>
                    {t('select_assessment_to_grade')}
                  </h3>

                  {!selectedSubject ? (
                    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                      <Filter size={48} className="mb-4 opacity-20" />
                      <p>Select a class and subject first</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assessments.filter(
                        (a) =>
                          a.class === selectedClass &&
                          a.subject === selectedSubject,
                      ).length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                          No assessments found for this subject.
                        </div>
                      ) : (
                        assessments
                          .filter(
                            (a) =>
                              a.class === selectedClass &&
                              a.subject === selectedSubject,
                          )
                          .map((assessment) => (
                            <button
                              key={assessment.id}
                              onClick={() => setSelectedAssessment(assessment)}
                              className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all group text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getAssessmentColor(assessment.type)}`}
                                >
                                  {getAssessmentIcon(assessment.type)}
                                </div>
                                <div>
                                  <h4 className="font-bold text-foreground">
                                    {assessment.title}
                                  </h4>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {assessment.type} • Max:{" "}
                                    {assessment.max_score} • {assessment.date}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {assessment.status === "Graded" && (
                                  <CheckCircle2
                                    size={18}
                                    className="text-emerald-500"
                                  />
                                )}
                                <ChevronLeft
                                  size={20}
                                  className="text-muted-foreground rotate-180 group-hover:text-primary transition-colors"
                                />
                              </div>
                            </button>
                          ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Grading Interface */
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between bg-card p-4 rounded-[1.5rem] border border-border shadow-sm">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedAssessment(null)}
                    className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h2 className="font-bold text-foreground text-lg">
                      {selectedAssessment.title}
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground">
                      {selectedAssessment.class} • {selectedAssessment.subject}
                    </p>
                  </div>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${getAssessmentColor(selectedAssessment.type)}`}
                >
                  {getAssessmentIcon(selectedAssessment.type)}
                  {selectedAssessment.type} (Max: {selectedAssessment.max_score})
                </div>
              </div>

              <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider w-16 text-center">
                          {t('roll')}
                        </th>
                        <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">
                          {t('student_name')}
                        </th>
                        <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider w-32">
                          {t('score')} (/{selectedAssessment.max_score})
                        </th>
                        <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">
                          {t('feedback')}
                        </th>
                        <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider w-24 text-center">
                          {t('status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {students.map((student) => {
                        const score =
                          grades[selectedAssessment.id]?.[student.id] || "";
                        const feedback =
                          feedbacks[selectedAssessment.id]?.[student.id] || "";
                        const numScore = parseFloat(score);
                        const percentage = !isNaN(numScore)
                          ? (numScore / selectedAssessment.max_score) * 100
                          : null;

                        return (
                          <tr
                            key={student.id}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="p-4 text-center font-bold text-muted-foreground">
                              {student.rollNumber}
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-foreground">
                                {student.name}
                              </p>
                              <p className="text-xs font-medium text-muted-foreground">
                                {student.id}
                              </p>
                            </td>
                            <td className="p-4">
                              <input
                                type="number"
                                min="0"
                                max={selectedAssessment.max_score}
                                value={score}
                                onChange={(e) =>
                                  handleGradeChange(student.id, e.target.value)
                                }
                                className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                placeholder={`Max ${selectedAssessment.max_score}`}
                              />
                            </td>
                            <td className="p-4">
                              <input
                                type="text"
                                value={feedback}
                                onChange={(e) =>
                                  handleFeedbackChange(
                                    student.id,
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground"
                                placeholder="Add feedback..."
                              />
                            </td>
                            <td className="p-4 text-center">
                              {percentage !== null ? (
                                <span
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                                    percentage >= 90
                                      ? "bg-emerald-500/10 text-emerald-500"
                                      : percentage >= 75
                                        ? "bg-primary/10 text-primary"
                                        : percentage >= 60
                                          ? "bg-amber-500/10 text-amber-500"
                                          : "bg-destructive/10 text-destructive"
                                  }`}
                                >
                                  {percentage >= 90
                                    ? "A"
                                    : percentage >= 75
                                      ? "B"
                                      : percentage >= 60
                                        ? "C"
                                        : "F"}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Floating Save Button */}
              <div className="fixed bottom-20 md:bottom-8 left-0 right-0 px-4 md:px-10 max-w-5xl mx-auto z-30">
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-card/90 backdrop-blur-md p-4 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border/50 flex items-center justify-between"
                >
                  <div className="hidden sm:block px-4">
                    <p className="text-sm font-bold text-foreground">
                      {t('grading')}: {selectedAssessment.title}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      {t('remember_to_save')}
                    </p>
                  </div>

                  <button
                    onClick={handleSaveGrades}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
                  >
                    {isSaving ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <Save size={20} />
                        {t('save_grades')}
                      </>
                    )}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      )}
      {activeTab === "submissions" && viewingSubmissionsFor && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between bg-card p-4 rounded-[1.5rem] border border-border shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setViewingSubmissionsFor(null);
                  setActiveTab("assessments");
                }}
                className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h2 className="font-bold text-foreground text-lg">
                  {t('submissions_for').replace('{title}', viewingSubmissionsFor.title)}
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  {viewingSubmissionsFor.class} • {t('due')}{" "}
                  {viewingSubmissionsFor.date}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedClass(viewingSubmissionsFor.class);
                  setSelectedSubject(viewingSubmissionsFor.subject);
                  setSelectedAssessment(viewingSubmissionsFor);
                  setActiveTab("gradebook");
                }}
                className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary/20 transition-colors text-sm"
              >
                {t('go_to_gradebook')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Submitted Column */}
            <div className="bg-muted/30 rounded-[1.5rem] border border-border p-4 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-foreground">{t('submitted')}</h3>
                <span className="bg-card text-muted-foreground text-xs font-bold px-2 py-1 rounded-lg border border-border">
                  2
                </span>
              </div>

              <div className="space-y-3">
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        BS
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">
                          Bart Simpson
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('submitted_today')}, 09:41 AM
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border mb-3">
                    <FileText size={16} className="text-primary" />
                    <span className="text-xs font-medium text-foreground truncate">
                      solar_system_report_final.pdf
                    </span>
                  </div>
                  <button 
                    onClick={() => handleReviewSubmission({ name: "Bart Simpson", file: "solar_system_report_final.pdf" })}
                    className="w-full py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
                  >
                    {t('review_submission')}
                  </button>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                        LS
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">
                          Lisa Simpson
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('submitted_yesterday')}, 04:20 PM
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border mb-3">
                    <FileText size={16} className="text-primary" />
                    <span className="text-xs font-medium text-foreground truncate">
                      lisa_science_project.docx
                    </span>
                  </div>
                  <button 
                    onClick={() => handleReviewSubmission({ name: "Lisa Simpson", file: "lisa_science_project.docx" })}
                    className="w-full py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
                  >
                    {t('review_submission')}
                  </button>
                </div>
              </div>
            </div>

            {/* Graded Column */}
            <div className="bg-muted/30 rounded-[1.5rem] border border-border p-4 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-foreground">{t('graded')}</h3>
                <span className="bg-card text-muted-foreground text-xs font-bold px-2 py-1 rounded-lg border border-border">
                  1
                </span>
              </div>

              <div className="space-y-3">
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm opacity-75">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
                        MH
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">
                          Milhouse Van Houten
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('graded_on').replace('{date}', 'Oct 24')}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                      92/100
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Column */}
            <div className="bg-muted/30 rounded-[1.5rem] border border-border p-4 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-foreground">{t('pending')}</h3>
                <span className="bg-card text-muted-foreground text-xs font-bold px-2 py-1 rounded-lg border border-border">
                  3
                </span>
              </div>

              <div className="space-y-3">
                {["Nelson Muntz", "Ralph Wiggum", "Martin Prince"].map(
                  (name, i) => (
                    <div
                      key={i}
                      className="bg-card p-3 rounded-xl border border-border shadow-sm flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs">
                        {name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <p className="font-bold text-foreground text-sm">{name}</p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Review Submission Modal */}
      <AnimatePresence>
        {isReviewModalOpen && selectedSubmissionToReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-border max-h-[90vh] flex flex-col"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/30 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">
                    {t('review_submission')}
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground mt-2 flex items-center gap-4">
                    <span>{t('student_label')}: {selectedSubmissionToReview.studentName}</span>
                    <span>{t('assessment_label')}: {selectedSubmissionToReview.assessmentTitle}</span>
                  </p>
                </div>
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                >
                  <ChevronLeft size={24} className="rotate-180" />
                </button>
              </div>

              <form onSubmit={submitReview} className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    {t('student_work')}
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-2xl border border-border">
                    <p className="text-sm text-foreground leading-relaxed">
                      {selectedSubmissionToReview.content || t('no_content_provided')}
                    </p>
                  </div>
                  {selectedSubmissionToReview.files && (
                    <div className="flex flex-wrap gap-3">
                      {selectedSubmissionToReview.files.map((file: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl text-sm font-medium text-foreground">
                          <FileText size={16} className="text-primary" />
                          {file}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">
                      {t('grade_score_max').replace('{max}', (selectedSubmissionToReview.maxScore || 100).toString())}
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      max={selectedSubmissionToReview.maxScore || 100}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground font-bold"
                      placeholder={t('enter_score')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">
                      {t('status')}
                    </label>
                    <select className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none text-foreground font-bold">
                      <option value="Graded">{t('graded')}</option>
                      <option value="Needs Revision">{t('needs_revision')}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">
                    {t('feedback_for_student')}
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-foreground"
                    placeholder={t('provide_feedback_placeholder')}
                  ></textarea>
                </div>

                <div className="pt-6 border-t border-border flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-6 py-3 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                    {t('submit_grade')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}
function ParentAcademics() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const [activeTab, setActiveTab] = useState<
    "overview" | "assessments" | "assignments"
  >("overview");
  const [filterSubject, setFilterSubject] = useState<string>("All");
  const [selectedAssignment, setSelectedAssignment] =
    useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([]);
  const [availableAssessments, setAvailableAssessments] = useState<any[]>([]);
  const [studentData, setStudentData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Find student record for this user (if student) or for their children (if parent)
        let studentId = "";
        
        if (user.role === 'student') {
          const { data: students } = await supabase
            .from('students')
            .select('id, name, roll_number')
            .eq('user_id', user.id);
          
          if (students && students.length > 0) {
            studentId = students[0].id;
            setStudentData(students[0]);
          }
        } else if (user.role === 'parent') {
          const { data: parentData } = await supabase
            .from('users')
            .select('parent_student(student_id)')
            .eq('id', user.id)
            .single();
          
          if (parentData && parentData.parent_student.length > 0) {
            studentId = parentData.parent_student[0].student_id; // Just take first student for now
            const { data: students } = await supabase
              .from('students')
              .select('id, name, roll_number')
              .eq('id', studentId);
            if (students && students.length > 0) {
              setStudentData(students[0]);
            }
          }
        }

        if (studentId) {
          const submissions = await getStudentSubmissions(studentId);
          setStudentSubmissions(submissions);

          // Also get all published assessments to show what's "To Do"
          const assessments = await getAssessments();
          // Filter out assessments that already have a submission
          const submittedAssessmentIds = new Set(submissions.map((s: any) => s.assessment_id));
          const pendingAssessments = assessments.filter((a: any) => 
            a.status === 'Published' && !submittedAssessmentIds.has(a.id)
          );
          setAvailableAssessments(pendingAssessments);
        }
      } catch (error) {
        console.error("Error fetching parent academics data:", error);
        toast.error(t('failed_to_load_data'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, activeAcademicYear?.name, t]);

  // Mock subjects for overview (could be derived from submissions in a real app)
  const subjects = [
    { name: "Mathematics", grade: "A", score: 94, trend: "up" },
    { name: "Science", grade: "A-", score: 91, trend: "up" },
    { name: "English Literature", grade: "B+", score: 88, trend: "down" },
    { name: "History", grade: "A", score: 95, trend: "up" },
    { name: "Physical Education", grade: "A+", score: 98, trend: "neutral" },
  ];

  const filteredSubmissions =
    filterSubject === "All"
      ? studentSubmissions
      : studentSubmissions.filter((s) => s.assessment?.subject === filterSubject);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !selectedAssignment || !user) return;
    
    // In a real app, we'd find the student ID first
    let studentId = "";
    if (user.role === 'student') {
      const { data: students } = await supabase.from('students').select('id').eq('user_id', user.id);
      if (students?.length) studentId = students[0].id;
    } else if (user.role === 'parent') {
      const { data: parentData } = await supabase
        .from('users')
        .select('parent_student(student_id)')
        .eq('id', user.id)
        .single();
      if (parentData?.parent_student?.length) studentId = parentData.parent_student[0].student_id;
    }

    if (!studentId) {
      toast.error(t('could_not_identify_student'));
      return;
    }

    setIsUploading(true);
    try {
      // Mock file upload - in real app we'd use supabase storage
      const file = e.target.files[0];
      const mockFileUrl = `https://example.com/files/${file.name}`;

      await supabase.from('submissions').insert({
        assessment_id: selectedAssignment.id,
        student_id: studentId,
        content: mockFileUrl,
        status: 'Submitted',
        submitted_at: new Date().toISOString()
      });

      toast.success(t('assignment_submitted_success'));
      
      // Refresh data
      const submissions = await getStudentSubmissions(studentId);
      setStudentSubmissions(submissions);
      setAvailableAssessments(prev => prev.filter(a => a.id !== selectedAssignment.id));
      
      setSelectedAssignment(null);
    } catch (error) {
      console.error("Error submitting assignment:", error);
      toast.error(t('failed_to_submit_assignment'));
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 h-full flex flex-col p-4 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-muted rounded-xl" />
            <div className="h-5 w-96 bg-muted rounded-xl" />
          </div>
          <div className="h-12 w-48 bg-muted rounded-xl" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-muted rounded-full" />
          <div className="h-10 w-24 bg-muted rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-32 bg-muted rounded-2xl" />
        </div>
        <div className="flex-1">
          <div className="h-full min-h-[400px] bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {t('academic_report')}
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            {t('viewing_performance_for')} {studentData?.name || user?.name} ({studentData?.rollNumber || user?.studentId})
          </p>
        </div>
        <div className="flex bg-muted p-1 rounded-xl w-fit overflow-x-auto max-w-full scrollbar-hide">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 sm:px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('overview')}
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`px-4 sm:px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "assignments"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('my_assignments')}
          </button>
          <button
            onClick={() => setActiveTab("assessments")}
            className={`px-4 sm:px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "assessments"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('past_results')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
        {activeTab === "overview" && (
          <div className="space-y-8">
          {/* GPA Card */}
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-[2rem] p-8 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <p className="text-primary-foreground/70 text-sm font-bold uppercase tracking-wider mb-2">
                  {t('current_gpa')}
                </p>
                <div className="flex items-end gap-3">
                  <h2 className="text-6xl font-bold tracking-tight">3.8</h2>
                  <p className="text-primary-foreground/80 font-medium text-xl mb-1.5">
                    / 4.0
                  </p>
                </div>
                <p className="text-emerald-400 text-sm font-bold mt-3 flex items-center gap-1.5 bg-emerald-400/10 w-fit px-3 py-1.5 rounded-lg border border-emerald-400/20">
                  <TrendingUp size={16} />
                  {t('top_class')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-wider">
                    {t('total_credits')}
                  </p>
                  <p className="text-2xl font-bold mt-1">24</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-wider">
                    {t('absences')}
                  </p>
                  <p className="text-2xl font-bold mt-1">2</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <GraduationCap size={200} />
            </div>
          </div>

          {/* Subject Breakdown */}
          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                <BookOpen size={20} className="text-primary" />
                {t('subject_breakdown')}
              </h3>
              <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                {t('term_1')}
              </span>
            </div>

            <div className="divide-y divide-border">
              {subjects.map((sub, i) => (
                <div
                  key={i}
                  className="p-5 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-lg">
                      {sub.name}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[200px]">
                        <div
                          className={`h-full rounded-full ${
                            sub.score >= 90
                              ? "bg-emerald-500"
                              : sub.score >= 80
                                ? "bg-primary"
                                : sub.score >= 70
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                          }`}
                          style={{ width: `${sub.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">
                        {sub.score}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pl-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm border ${
                        sub.grade.startsWith("A")
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : sub.grade.startsWith("B")
                            ? "bg-primary/10 text-primary border-primary/20"
                            : sub.grade.startsWith("C")
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                      }`}
                    >
                      {sub.grade}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "assignments" && (
        <div className="space-y-6">
          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* To Do */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  {t('todo')}
                </h3>
                <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-1 rounded-lg">
                  {availableAssessments.length}
                </span>
              </div>

              {availableAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="bg-card p-5 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedAssignment(assessment)}
                >
                  <div
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit mb-3 border ${getAssessmentColor(assessment.type as AssessmentType)}`}
                  >
                    {assessment.subject}
                  </div>
                  <h4 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {assessment.title}
                  </h4>
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-4">
                    <Calendar size={14} /> {t('due')} {assessment.date}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-xs font-bold text-muted-foreground">
                      {assessment.type}
                    </span>
                    <button className="text-primary bg-primary/10 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* In Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  {t('in_progress')}
                </h3>
                <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-1 rounded-lg">
                  {studentSubmissions.filter(s => s.status === 'Draft').length}
                </span>
              </div>

              {studentSubmissions.filter(s => s.status === 'Draft').map(submission => (
                <div key={submission.id} className="bg-card p-5 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  <div className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit mb-3 border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    {submission.assessment?.subject}
                  </div>
                  <h4 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {submission.assessment?.title}
                  </h4>
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-4">
                    <Calendar size={14} /> {t('due')} {submission.assessment?.date}
                  </p>
                  <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full"
                      style={{ width: "45%" }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-xs font-bold text-muted-foreground">
                      {submission.assessment?.type}
                    </span>
                    <span className="text-xs font-bold text-amber-500">
                      {t('complete_percentage').replace('{percentage}', '45')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Completed */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  {t('completed')}
                </h3>
                <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-1 rounded-lg">
                  {studentSubmissions.filter(s => s.status === 'Submitted' || s.status === 'Graded').length}
                </span>
              </div>

              {studentSubmissions.filter(s => s.status === 'Submitted' || s.status === 'Graded').map(submission => (
                <div key={submission.id} className="bg-card p-5 rounded-[1.5rem] border border-border shadow-sm opacity-75">
                  <div className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit mb-3 border bg-blue-500/10 text-blue-500 border-blue-500/20">
                    {submission.assessment?.subject}
                  </div>
                  <h4 className="font-bold text-foreground mb-1 line-through decoration-muted-foreground">
                    {submission.assessment?.title}
                  </h4>
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-4">
                    <CheckCircle2 size={14} className="text-emerald-500" />{" "}
                    {t('submitted')} {new Date(submission.submitted_at).toLocaleDateString()}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                      {submission.status === 'Graded' ? `${t('graded')}: ${submission.score}/${submission.assessment?.max_score}` : t('pending_grading')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assignment Submission Modal */}
      <AnimatePresence>
        {selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-border max-h-[90vh] flex flex-col"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/30 flex justify-between items-start">
                <div>
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border w-fit mb-3 ${getAssessmentColor(selectedAssignment.type as AssessmentType)}`}
                  >
                    {getAssessmentIcon(
                      selectedAssignment.type as AssessmentType,
                    )}
                    {selectedAssignment.type}
                  </div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">
                    {selectedAssignment.title}
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground mt-2 flex items-center gap-4">
                    <span>{selectedAssignment.subject}</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} /> {t('due')} {selectedAssignment.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Award size={14} /> {selectedAssignment.max_score} {t('pts')}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                >
                  <ChevronLeft size={24} className="rotate-180" />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                    {t('instructions')}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedAssignment.description ||
                      t('no_instructions_provided')}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    {t('your_work')}
                  </h3>

                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-border rounded-[1.5rem] p-8 text-center hover:bg-muted/50 hover:border-primary/30 transition-colors relative group">
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      {isUploading ? (
                        <Loader2 size={24} className="animate-spin" />
                      ) : (
                        <UploadCloud size={28} />
                      )}
                    </div>
                    <p className="font-bold text-foreground text-lg mb-1">
                      {isUploading
                        ? t('uploading')
                        : t('click_to_upload')}
                    </p>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('upload_limits')}
                    </p>
                  </div>

                  {/* Private Comment */}
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {user?.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </div>
                      <div className="flex-1">
                        <textarea
                          placeholder={t('private_comment_placeholder')}
                          className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm placeholder:text-muted-foreground text-foreground"
                          rows={2}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="px-6 py-3 rounded-xl font-bold text-muted-foreground bg-card border border-border hover:bg-muted transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  disabled={isUploading}
                  className="px-8 py-3 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center gap-2"
                >
                  {isUploading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  {t('mark_as_done')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeTab === "assessments" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["All", ...subjects.map((s) => s.name)].map((sub) => (
              <button
                key={sub}
                onClick={() => setFilterSubject(sub)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                  filterSubject === sub
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Assessments List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSubmissions.map((submission) => {
              const assessment = submission.assessment;
              if (!assessment) return null;
              const percentage = (submission.score / assessment.max_score) * 100;
              return (
                <div
                  key={submission.id}
                  className="bg-card p-5 rounded-[1.5rem] border border-border shadow-sm flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${getAssessmentColor(assessment.type as AssessmentType)}`}
                    >
                      {getAssessmentIcon(assessment.type as AssessmentType)}
                      {assessment.type}
                    </div>
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      <Clock size={14} />
                      {assessment.date}
                    </span>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg mb-1">
                      {assessment.title}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground mb-4">
                      {assessment.subject}
                    </p>

                    {submission.feedback && (
                      <div className="bg-muted/30 p-3 rounded-xl border border-border mb-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                          {t('teacher_feedback')}
                        </p>
                        <p className="text-sm text-foreground italic">
                          &quot;{submission.feedback}&quot;
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {t('score_label')}
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {submission.score || 0}{" "}
                        <span className="text-sm text-muted-foreground">
                          / {assessment.max_score}
                        </span>
                      </p>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm border ${
                        percentage >= 90
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : percentage >= 75
                            ? "bg-primary/10 text-primary border-primary/20"
                            : percentage >= 60
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                      }`}
                    >
                      {percentage >= 90
                        ? "A"
                        : percentage >= 75
                          ? "B"
                          : percentage >= 60
                            ? "C"
                            : "F"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </motion.div>
  );
}
