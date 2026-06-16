'use client';

import { motion } from 'motion/react';
import { GraduationCap, ChevronRight, FileText, Shield } from 'lucide-react';

interface ClassGridProps {
  classes: any[];
  teacherSchedules: any[] | undefined;
  isAdmin: boolean;
  isTeacher: boolean;
  onSelectClass: (className: string) => void;
  t: (key: string) => string;
}

export function ClassGrid({ classes, teacherSchedules, isAdmin, isTeacher, onSelectClass, t }: ClassGridProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t('classes_grading_ledgers')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('select_roster_desc')}</p>
        </div>
        {isTeacher && (
          <div className="flex items-center gap-2 bg-primary/5 text-primary text-xs font-bold px-4 py-2 rounded-xl border border-primary/10">
            <Shield size={16} /> {t('teacher_portal_mode')}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {classes.map((cls) => {
          const classesTaught = teacherSchedules ? teacherSchedules.some((s: any) => s.classes?.[0]?.name === cls.name) : true;

          return (
            <motion.button
              key={cls.id}
              whileHover={{ y: -4 }}
              onClick={() => onSelectClass(cls.name)}
              className="bg-card border border-border rounded-2xl p-6 text-left hover:shadow-xl hover:shadow-primary/5 transition-all group flex flex-col justify-between h-36 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
              <div className="flex items-start justify-between relative z-10 w-full">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{cls.name}</h3>
                    <span className="text-xs text-muted-foreground">{t('capacity_label')}: {cls.capacity || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">
                <span className="flex items-center gap-1">{t('open_academic_ledger')} <ChevronRight size={14} /></span>
                {isTeacher && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] ${classesTaught ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {classesTaught ? t('assigned_label') : t('observe_only')}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
        {classes.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-card/50 border border-dashed border-border rounded-3xl">
            <FileText size={32} className="text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-foreground">{t('no_classes_configured')}</h3>
          </div>
        )}
      </div>
    </motion.div>
  );
}
