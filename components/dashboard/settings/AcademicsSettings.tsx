'use client';

import { X } from 'lucide-react';
import { toast } from 'sonner';
import { 
  deleteClass, 
  deleteSubject, 
  deleteAcademicYear, 
  setActiveAcademicYear 
} from '@/lib/supabase-db';

interface AcademicsSettingsProps {
  activeTab: string;
  classes: any[] | undefined;
  subjects: any[] | undefined;
  academicYears: any[] | undefined;
  mutateClasses: () => void;
  mutateSubjects: () => void;
  mutateAcademicYears: () => void;
  setIsAddMasterOpen: (val: { show: boolean; type: 'class' | 'subject' | 'year' }) => void;
  setModalConfig: (val: any) => void;
}

export function AcademicsSettings({
  activeTab,
  classes,
  subjects,
  academicYears,
  mutateClasses,
  mutateSubjects,
  mutateAcademicYears,
  setIsAddMasterOpen,
  setModalConfig
}: AcademicsSettingsProps) {
  if (activeTab !== 'academics') return null;

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">Academics Data</h3>
        <p className="text-sm text-muted-foreground">Manage core system entities like grades, subjects, and academic years.</p>
      </div>
      
      <div className="space-y-6">
        <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground">Grade Levels & Sections</h4>
            <button 
              type="button"
              onClick={() => setIsAddMasterOpen({ show: true, type: 'class' })}
              className="text-xs text-primary hover:underline font-bold"
            >
              + Add Grade
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {classes?.map(cls => (
              <div key={cls.id} className="px-3 py-2 bg-background border border-border rounded-lg text-xs flex items-center justify-between animate-fadeIn">
                {cls.name}
                <button 
                  type="button"
                  onClick={() => {
                    setModalConfig({
                      show: true,
                      title: 'Delete Grade',
                      message: `Are you sure you want to delete ${cls.name}? This action cannot be undone.`,
                      type: 'danger',
                      onConfirm: async () => {
                        setModalConfig((prev: any) => ({ ...prev, show: false }));
                        try {
                          await deleteClass(cls.id);
                          mutateClasses();
                          toast.success('Grade deleted');
                        } catch (err) {
                          toast.error('Failed to delete grade');
                        }
                      }
                    });
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-2"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground">Subjects</h4>
            <button 
              type="button"
              onClick={() => setIsAddMasterOpen({ show: true, type: 'subject' })}
              className="text-xs text-primary hover:underline font-bold"
            >
              + Add Subject
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {subjects?.map(subject => (
              <div key={subject.id} className="px-3 py-2 bg-background border border-border rounded-lg text-xs flex items-center justify-between animate-fadeIn">
                {subject.name}
                <button 
                  type="button"
                  onClick={() => {
                    setModalConfig({
                      show: true,
                      title: 'Delete Subject',
                      message: `Are you sure you want to delete ${subject.name}? This action cannot be undone.`,
                      type: 'danger',
                      onConfirm: async () => {
                        setModalConfig((prev: any) => ({ ...prev, show: false }));
                        try {
                          await deleteSubject(subject.id);
                          mutateSubjects();
                          toast.success('Subject deleted');
                        } catch (err) {
                          toast.error('Failed to delete subject');
                        }
                      }
                    });
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-2"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground">Academic Years</h4>
            <button 
              type="button"
              onClick={() => setIsAddMasterOpen({ show: true, type: 'year' })}
              className="text-xs text-primary hover:underline font-bold"
            >
              + Add Year
            </button>
          </div>
          <div className="space-y-2">
            {academicYears?.map(year => (
              <div key={year.id} className="px-4 py-3 bg-background border border-border rounded-lg text-sm flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-foreground">{year.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${year.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground border border-border'}`}>
                    {year.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {!year.is_active && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await setActiveAcademicYear(year.id);
                          mutateAcademicYears();
                          toast.success('Set as active year');
                        } catch (e) {
                          toast.error('Failed to set active year');
                        }
                      }}
                      className="text-[10px] font-bold uppercase px-2.5 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      Set Active
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => {
                      setModalConfig({
                        show: true,
                        title: 'Delete Academic Year',
                        message: `Are you sure you want to delete ${year.name}? This action cannot be undone.`,
                        type: 'danger',
                        onConfirm: async () => {
                          setModalConfig((prev: any) => ({ ...prev, show: false }));
                          try {
                            await deleteAcademicYear(year.id);
                            mutateAcademicYears();
                            toast.success('Academic year deleted');
                          } catch (err) {
                            toast.error('Failed to delete academic year');
                          }
                        }
                      });
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
