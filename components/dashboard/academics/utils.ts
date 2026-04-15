import { FileText, ClipboardList, Monitor, PenTool } from "lucide-react";

export type AssessmentType =
  | "Homework"
  | "Assignment"
  | "Online Exam"
  | "Offline Exam";

export const getAssessmentColor = (type: AssessmentType) => {
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

export const getAssessmentIcon = (type: AssessmentType) => {
  switch (type) {
    case "Homework":
      return FileText;
    case "Assignment":
      return ClipboardList;
    case "Online Exam":
      return Monitor;
    case "Offline Exam":
      return PenTool;
  }
};
