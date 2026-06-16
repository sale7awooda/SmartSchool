'use client';

import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { useLanguage } from '@/lib/language-context';
import { GradeCardsTab } from '@/components/dashboard/students/GradeCardsTab';
import { motion } from 'motion/react';

export default function ReportCardsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { t } = useLanguage();

  if (!user) return null;

  if (!can('view', 'assessments') && !can('view', 'academics')) {
    return (
      <div className="p-6 text-center text-muted-foreground font-semibold">
        {t('no_permission') || 'You do not have permission to view this page.'}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 h-full flex flex-col"
    >
      {user.role !== 'parent' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {t('report_cards') || 'Report Cards'}
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">
              {t('report_cards_desc') || 'Record student marks, generate official report cards, view historic grade cards, and manage term publications.'}
            </p>
          </div>
        </div>
      )}

      <div className="flex-1">
        <GradeCardsTab />
      </div>
    </motion.div>
  );
}
