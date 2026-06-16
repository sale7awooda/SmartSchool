'use client';

import { Mail, Phone, GraduationCap, UserCircle, Calendar, MapPin, UserPlus } from 'lucide-react';

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-purple-500/20 text-purple-500 border-purple-500/20';
    case 'teacher': return 'bg-primary/20 text-primary border-primary/20';
    case 'accountant': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
    case 'staff': return 'bg-muted text-foreground border-border';
    default: return 'bg-muted text-foreground border-border';
  }
};

interface OverviewTabProps {
  selectedPerson: any;
  isStudent: (person: any) => boolean;
  fetchParentInfo: string | undefined;
  t: (key: string) => string;
}

export function OverviewTab({ selectedPerson, isStudent, fetchParentInfo, t }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {'email' in selectedPerson && selectedPerson.email && (
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Mail size={20} /></div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('email_address')}</p>
              <p className="text-sm font-bold text-foreground mt-0.5 break-all">{selectedPerson.email}</p>
            </div>
          </div>
        )}

        {'phone' in selectedPerson && selectedPerson.phone && (
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Phone size={20} /></div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('phone_number')}</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.phone}</p>
            </div>
          </div>
        )}

        {isStudent(selectedPerson) && (
          <>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
              <div className="p-3 bg-muted rounded-xl text-muted-foreground"><GraduationCap size={20} /></div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('grade')}</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.grade || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
              <div className="p-3 bg-muted rounded-xl text-muted-foreground"><UserCircle size={20} /></div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('roll_no')}</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.rollNumber || selectedPerson.roll_number || 'N/A'}</p>
              </div>
            </div>
            {selectedPerson.dob && (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Calendar size={20} /></div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('date_of_birth')}</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.dob}</p>
                </div>
              </div>
            )}
            {selectedPerson.gender && (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                <div className="p-3 bg-muted rounded-xl text-muted-foreground"><UserCircle size={20} /></div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('gender')}</p>
                  <p className="text-sm font-bold text-foreground mt-0.5 capitalize">{selectedPerson.gender}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm sm:col-span-2">
              <div className="p-3 bg-muted rounded-xl text-muted-foreground"><UserPlus size={20} /></div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('parent_guardian')}</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{fetchParentInfo && fetchParentInfo !== 'N/A' ? fetchParentInfo : ((selectedPerson as any).parentNames || (selectedPerson as any).parentName || 'N/A')}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {isStudent(selectedPerson) && selectedPerson.address && (
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
          <div className="p-3 bg-muted rounded-xl text-muted-foreground"><MapPin size={20} /></div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('address')}</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.address}</p>
          </div>
        </div>
      )}
    </div>
  );
}
