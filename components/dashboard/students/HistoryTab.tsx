'use client';

import { Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Student } from '@/types';

interface HistoryTabProps {
  t: (key: string) => string;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isLoadingData: boolean;
  students: any[];
  handleRestoreStudent: (id: string) => void;
}

export function HistoryTab({
  t,
  searchQuery,
  setSearchQuery,
  isLoadingData,
  students,
  handleRestoreStudent
}: HistoryTabProps) {
  return (
    <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card dark:bg-slate-900 p-4 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm shrink-0">
        <h2 className="text-xl font-bold text-foreground">{t('dropped_deleted_students')}</h2>
        <div className="relative w-full sm:w-72">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
          <input 
            type="text" 
            placeholder={t('search_history')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-primary transition-all placeholder:text-muted-foreground dark:placeholder:text-muted-foreground text-foreground rtl:pl-4 rtl:pr-12"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
        <div className="bg-card dark:bg-slate-900 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-bold">{t('student')}</th>
                  <th className="px-6 py-4 font-bold">{t('roll_number')}</th>
                  <th className="px-6 py-4 font-bold">{t('grade')}</th>
                  <th className="px-6 py-4 font-bold">{t('reason')}</th>
                  <th className="px-6 py-4 font-bold text-right rtl:text-left">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingData ? (
                  [1, 2, 3, 4, 5].map((i: number) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-6 py-4"><Skeleton className="h-10 w-40 rounded-xl" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-md" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-6 py-4 text-right rtl:text-left"><Skeleton className="h-8 w-8 rounded-lg ml-auto rtl:ml-0 rtl:mr-auto" /></td>
                    </tr>
                  ))
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                      {t('no_data')}
                    </td>
                  </tr>
                ) : (
                  students.map((student: Student, idx: number) => (
                    <tr key={`${student.id || idx}-${idx}`} className="border-b border-border last:border-0">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center font-bold text-lg border border-border">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{student.name}</div>
                            <div className="text-xs text-muted-foreground">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {student.roll_number}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-muted text-foreground border border-border">
                          {student.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">
                        {student.deleted_reason || t('none')}
                      </td>
                      <td className="px-6 py-4 text-right rtl:text-left">
                        <button 
                          onClick={() => handleRestoreStudent(student.id)}
                          className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          {t('restore')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
