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

export function ParentAcademics() {
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
            {t('viewing_performance_for')} {studentData?.name || user?.name} ({studentData?.roll_number || user?.studentId})
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
