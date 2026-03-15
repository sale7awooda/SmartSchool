'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { motion } from 'motion/react';
import { 
  FileText, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  Search,
  Filter,
  PlayCircle,
  BarChart
} from 'lucide-react';
import Link from 'next/link';

// Mock Data
const EXAMS = [
  {
    id: 'e1',
    title: 'Mid-Term Mathematics',
    subject: 'Mathematics',
    grade: 'Grade 4',
    date: '2026-03-10',
    duration: 60, // minutes
    status: 'upcoming', // upcoming, active, completed
    totalMarks: 100,
    questionsCount: 20,
  },
  {
    id: 'e2',
    title: 'Science Quiz: Ecosystems',
    subject: 'Science',
    grade: 'Grade 4',
    date: '2026-03-07',
    duration: 30,
    status: 'active',
    totalMarks: 50,
    questionsCount: 10,
  },
  {
    id: 'e3',
    title: 'English Literature Test',
    subject: 'English',
    grade: 'Grade 4',
    date: '2026-02-28',
    duration: 45,
    status: 'completed',
    totalMarks: 50,
    questionsCount: 15,
    score: 42, // For student view
  }
];

export default function ExamsPage() {
  const { user } = useAuth();
  const { can, isRole } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  if (!user) return null;

  if (!can('view', 'exams')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  const isStudent = isRole('student');
  const isTeacherOrAdmin = can('manage', 'exams') || can('create', 'exams');

  const filteredExams = EXAMS.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          exam.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-500 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Now</span>;
      case 'upcoming':
        return <span className="px-2.5 py-1 bg-amber-500/20 text-amber-500 rounded-lg text-xs font-bold uppercase tracking-wider">Upcoming</span>;
      case 'completed':
        return <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-bold uppercase tracking-wider">Completed</span>;
      default:
        return null;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Online Exams</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {isStudent ? 'View and take your assessments' : 'Manage online exams and assessments'}
          </p>
        </div>
        
        {can('create', 'exams') && (
          <Link 
            href="/dashboard/exams/create"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus size={18} />
            Create Exam
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search exams by title or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm appearance-none font-medium text-foreground"
            >
              <option value="all">All Status</option>
              <option value="active">Live Now</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredExams.map((exam) => (
          <div key={exam.id} className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <FileText size={24} />
                </div>
                {getStatusBadge(exam.status)}
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{exam.title}</h3>
              <p className="text-sm font-medium text-primary mb-4">{exam.subject} • {exam.grade}</p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar size={16} className="text-muted-foreground" />
                  <span className="font-medium">{new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock size={16} className="text-muted-foreground" />
                  <span className="font-medium">{exam.duration} Minutes</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 size={16} className="text-muted-foreground" />
                  <span className="font-medium">{exam.questionsCount} Questions • {exam.totalMarks} Marks</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              {exam.status === 'active' && isStudent && (
                <Link href={`/dashboard/exams/${exam.id}/take`} className="w-full py-2.5 bg-emerald-500 text-primary-foreground rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                  <PlayCircle size={18} />
                  Start Exam
                </Link>
              )}
              {exam.status === 'active' && isTeacherOrAdmin && (
                <Link href={`/dashboard/exams/${exam.id}/monitor`} className="w-full py-2.5 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
                  <BarChart size={18} />
                  Monitor Live
                </Link>
              )}
              {exam.status === 'upcoming' && (
                <button disabled className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                  <Clock size={18} />
                  Starts Soon
                </button>
              )}
              {exam.status === 'completed' && (
                <Link href={`/dashboard/exams/${exam.id}/results`} className="w-full py-2.5 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2">
                  <BarChart size={18} />
                  {isStudent ? `View Results (${exam.score}/${exam.totalMarks})` : 'View Analytics'}
                </Link>
              )}
            </div>
          </div>
        ))}

        {filteredExams.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 border-dashed">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-slate-400 dark:text-slate-500" size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No exams found</h3>
            <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
