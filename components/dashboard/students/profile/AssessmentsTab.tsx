'use client';

import { FileText } from 'lucide-react';

interface AssessmentsTabProps {
  assessmentRecords: any[];
  t: (key: string) => string;
}

export function AssessmentsTab({ assessmentRecords, t }: AssessmentsTabProps) {
  return (
    <div className="space-y-6">
      {assessmentRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assessmentRecords.map((submission: any, idx: number) => (
            <div key={`${submission.id || 'assessment'}-${idx}`} className="bg-card dark:bg-slate-900 p-5 rounded-2xl border border-border dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-foreground">{submission.assessment?.title || t('unknown_assessment')}</h3>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  submission.status === 'graded' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                  submission.status === 'submitted' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                  'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}>
                  {t(submission.status)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                <p><span className="font-medium text-foreground">{t('subject')}:</span> {submission.assessment?.subject?.name || submission.assessment?.subject_id || 'N/A'}</p>
                <p><span className="font-medium text-foreground">{t('date')}:</span> {new Date(submission.submitted_at || submission.created_at || new Date().toISOString()).toLocaleDateString()}</p>
              </div>
              {submission.status === 'graded' && submission.score !== null && (
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                  <span className="text-sm font-bold text-muted-foreground uppercase">{t('score')}</span>
                  <span className="text-xl font-black text-primary">{submission.score} / {submission.assessment?.total_marks || 100}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
          <FileText size={40} className="mb-3 opacity-20" />
          <p>{t('no_assessments')}</p>
        </div>
      )}
    </div>
  );
}
