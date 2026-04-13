const fs = require('fs');
const path = require('path');

const files = [
  'components/dashboard/academics/AdminAcademics.tsx',
  'components/dashboard/academics/TeacherAcademics.tsx',
  'components/dashboard/academics/ParentAcademics.tsx'
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find the first occurrence of 'export function'
  const exportIndex = content.indexOf('export function');
  if (exportIndex !== -1) {
    const actualContent = content.substring(exportIndex);
    
    // We need the original imports
    const originalImports = `"use client";

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

`;
    
    fs.writeFileSync(filePath, originalImports + actualContent);
  }
}
console.log('Fixed components');
