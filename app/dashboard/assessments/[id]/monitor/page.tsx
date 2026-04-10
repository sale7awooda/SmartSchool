'use client';

import { use, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getAssessmentWithQuestions } from '@/lib/supabase-db';
import { 
  ArrowLeft, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  BarChart3,
  Activity
} from 'lucide-react';
import Link from 'next/link';

export default function MonitorAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  
  const { data: assessment, isLoading, error } = useSWR(
    id ? `assessment_${id}` : null,
    () => getAssessmentWithQuestions(id)
  );

  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Loading monitor...</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground font-medium">Failed to load assessment.</p>
        <Link href="/dashboard/assessments" className="text-primary font-bold hover:underline">
          Go back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/assessments" className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Live Monitor: {assessment.title}</h1>
          <p className="text-muted-foreground text-sm font-medium">{assessment.subject} • {assessment.grade}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Active Students</p>
            <p className="text-2xl font-bold">12 / 24</p>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Submissions</p>
            <p className="text-2xl font-bold">5</p>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Time Remaining</p>
            <p className="text-2xl font-bold">24:15</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Activity size={20} className="text-primary" />
            Student Progress
          </h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">Live Updates</span>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium">Real-time student tracking will appear here.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
