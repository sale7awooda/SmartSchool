'use client';

import useSWR, { mutate } from 'swr';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { FeeInvoice } from '@/types';
import { getPaginatedInvoices, createInvoice, updateInvoice, getStudents, getFeeStats, getFeeItems, createFeeItem, updateFeeItem, deleteFeeItem, recordPayment, getActiveAcademicYear } from '@/lib/supabase-db';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { CreditCard, Search, CheckCircle2, Clock, AlertCircle, FileText, Download, Plus, DollarSign, Loader2, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from "sonner";


import { AccountantFees } from "@/components/dashboard/fees/AccountantFees";
import { ParentFees } from "@/components/dashboard/fees/ParentFees";

export default function FeesPage() {
  const { user } = useAuth();
  const { can, isRole } = usePermissions();
  const { t } = useLanguage();

  if (!user) return null;

  if (!can('view', 'fees')) {
    return <div className="p-4">{t('no_permission')}</div>;
  }

  if (isRole(["parent", "student"])) return <ParentFees />;
  if (isRole(["admin", "accountant"])) return <AccountantFees />;

  return (
    <div className="p-4">You do not have permission to view this page.</div>
  );
}
