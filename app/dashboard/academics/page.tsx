"use client";

import useSWR from 'swr';
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/lib/permissions";
import { Student } from "@/types";
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

import { AdminAcademics } from "@/components/dashboard/academics/AdminAcademics";
import { TeacherAcademics } from "@/components/dashboard/academics/TeacherAcademics";
import { ParentAcademics } from "@/components/dashboard/academics/ParentAcademics";

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
  if (isRole(["admin"])) return <AdminAcademics />;

  return (
    <div className="p-4">You do not have permission to view this page.</div>
  );
}
