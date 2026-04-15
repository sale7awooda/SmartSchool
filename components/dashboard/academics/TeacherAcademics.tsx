"use client";

import useSWR from 'swr';
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/lib/permissions";
import { Student } from "@/lib/mock-db";
import { useLanguage } from "@/lib/language-context";
import { AssessmentType, getAssessmentColor, getAssessmentIcon } from "./utils";
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

export function TeacherAcademics() {
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
