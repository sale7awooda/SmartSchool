'use client';

import { motion } from 'motion/react';
import { UserCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FamilyViewProps {
  parentChildren: any[] | undefined;
  studentSelfProfile: any;
  isChildrenLoading: boolean;
  isStudentSelfLoading: boolean;
  activeFamilyStudent: any;
  familyAcademicYears: any[];
  isTermPublished: (studentId: string, termName: string) => boolean;
  onOpenPrint: (student: any, termName: string, template: 'template-a' | 'template-b') => void;
  t: (key: string) => string;
}

export function FamilyView({
  parentChildren,
  studentSelfProfile,
  isChildrenLoading,
  isStudentSelfLoading,
  activeFamilyStudent,
  familyAcademicYears,
  isTermPublished,
  onOpenPrint,
  t
}: FamilyViewProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {parentChildren && isChildrenLoading && (
        <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>
      )}

      {studentSelfProfile && isStudentSelfLoading && (
        <div className="space-y-4"><Skeleton className="h-44 w-full animate-pulse" /></div>
      )}

      {activeFamilyStudent ? (
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-[2rem] p-6 sm:p-8 shadow-sm">
              <div className="space-y-4">
                {familyAcademicYears.map((academicYearItem: any) => (
                  <div key={academicYearItem.year} className="group border border-border rounded-[2rem] bg-card overflow-hidden">
                    <div className="flex flex-col xl:flex-row p-6 xl:p-8 select-none bg-background gap-6 xl:items-center relative">
                      <div className="flex-1">
                        <h4 className="font-black text-foreground text-xl tracking-tight mb-6">{academicYearItem.year}</h4>

                        <div className="flex flex-wrap lg:flex-nowrap gap-4">
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 lg:gap-4 flex-1">
                            {academicYearItem.percentiels.map((p: any, idx: number) => {
                              const termName = academicYearItem.terms[idx];
                              const published = activeFamilyStudent && isTermPublished(activeFamilyStudent.id, termName);

                              return (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    if (published && activeFamilyStudent) {
                                      onOpenPrint(activeFamilyStudent, termName, termName === 'Final Exam' ? 'template-b' : 'template-a');
                                    }
                                  }}
                                  className={`border border-border/50 rounded-2xl p-3 flex flex-col justify-center text-center transition-colors
                                    ${published ? 'bg-primary/5 cursor-pointer hover:bg-primary/10 hover:border-primary/30' : 'bg-muted/30 opacity-70'}
                                  `}
                                >
                                  <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest leading-tight h-8 flex items-center justify-center">{p.label}</p>
                                  <p className="text-sm sm:text-base font-black text-foreground mt-1">{p.val}</p>
                                </div>
                              );
                            })}
                          </div>
                          <div className="w-full lg:w-auto bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 flex flex-row items-center justify-center gap-6 xl:gap-8 min-w-[280px]">
                            <div className="text-center">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{t('final_percentage_label')}</p>
                              <p className="text-xl font-black text-foreground">{academicYearItem.finalPercentile}</p>
                            </div>
                            <div className="w-px h-10 bg-primary/20" />
                            <div className="text-center">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{t('final_grade_label')}</p>
                              <p className="text-xl font-black text-foreground">{academicYearItem.finalGrade}</p>
                            </div>
                            <div className="w-px h-10 bg-primary/20" />
                            <div className="text-center">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{t('final_rank_label')}</p>
                              <p className="text-xl font-black text-emerald-600">{academicYearItem.finalRank}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-card border border-border border-dashed rounded-3xl">
          <UserCircle className="mx-auto text-muted-foreground mb-4" size={40} />
          <h3 className="text-lg font-black text-foreground">{t('no_records_found')}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t('no_student_credentials_desc')}</p>
        </div>
      )}
    </motion.div>
  );
}
