'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { 
  getPaginatedStaff, 
  updateUserRole, 
  getAcademicYears, 
  setActiveAcademicYear,
  getClasses,
  getSubjects,
  createAcademicYear,
  createClass,
  createSubject,
  deleteAcademicYear,
  deleteClass,
  deleteSubject,
  createStaff
} from '@/lib/supabase-db';
import { 
  updateUserProfileAction,
  changePasswordAction
} from '@/app/actions/users';
import { usePermissions } from '@/lib/permissions';
import { useSettings } from '@/lib/settings-context';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Smartphone, 
  Mail, 
  Save, 
  Camera, 
  Loader2,
  Moon,
  Globe,
  Settings,
  Palette,
  Type,
  LayoutGrid,
  Users,
  BookOpen,
  Plus,
  Trash2,
  Edit,
  Building,
  Database,
  RefreshCw,
  FileDown,
  FileUp,
  CloudUpload,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert,
  UserCheck,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { seedDatabase, resetDatabase } from '@/lib/supabase-db';



import { useLanguage } from '@/lib/language-context';
import { AddStaffModal } from "@/components/dashboard/settings/AddStaffModal";
import { AddMasterModal } from "@/components/dashboard/settings/AddMasterModal";
import { SecuritySettings } from "@/components/dashboard/settings/SecuritySettings";
import { SystemSettings } from "@/components/dashboard/settings/SystemSettings";
import { AcademicsSettings } from "@/components/dashboard/settings/AcademicsSettings";
import { AdminSettings } from "@/components/dashboard/settings/AdminSettings";
import { UsersSettings } from "@/components/dashboard/settings/UsersSettings";

export default function SettingsPage() {
  const { user } = useAuth();
  const { can, isAdmin } = usePermissions();
  const { settings, updateSettings } = useSettings();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'roles' | 'general' | 'configurations' | 'data' | 'academics' | 'staff' | 'users'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  
  const { data: academicYears, mutate: mutateAcademicYears } = useSWR('academic_years', getAcademicYears);
  const { data: classes, mutate: mutateClasses } = useSWR('classes', getClasses);
  const { data: subjects, mutate: mutateSubjects } = useSWR('subjects', getSubjects);
  
  // Profile State
  const [profileName, setProfileName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('USER_PROFILE_NAME') : '') || user?.name || '');
  const [profileEmail, setProfileEmail] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('USER_PROFILE_EMAIL') : '') || user?.email || '');
  const [profilePhone, setProfilePhone] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('USER_PROFILE_PHONE') : '') || user?.phone || '');

  // System Config State (from context)
  const [schoolName, setSchoolName] = useState(settings?.school_name || '');
  const [schoolAddress, setSchoolAddress] = useState(settings?.school_address || '');
  const [schoolPhone, setSchoolPhone] = useState(settings?.school_phone || '');
  const [schoolEmail, setSchoolEmail] = useState(settings?.school_email || '');
  const [currency, setCurrency] = useState(settings?.currency || 'USD');

  // Advanced Configurations State
  const [vapidPublicKey, setVapidPublicKey] = useState('');
  const [vapidPrivateKey, setVapidPrivateKey] = useState('');
  const [vapidSubject, setVapidSubject] = useState('');
  const [supabaseUrlOverride, setSupabaseUrlOverride] = useState('');
  const [supabaseAnonKeyOverride, setSupabaseAnonKeyOverride] = useState('');
  const [supabaseServiceRoleKeyOverride, setSupabaseServiceRoleKeyOverride] = useState('');
  const [resendApiKeyOverride, setResendApiKeyOverride] = useState('');
  const [mapboxTokenOverride, setMapboxTokenOverride] = useState('');

  useEffect(() => {
    if (settings) {
      setSchoolName(settings.school_name || '');
      setSchoolAddress(settings.school_address || '');
      setSchoolPhone(settings.school_phone || '');
      setSchoolEmail(settings.school_email || '');
      setCurrency(settings.currency || 'USD');

      setVapidPublicKey(settings.vapid_public_key || '');
      setVapidPrivateKey(settings.vapid_private_key || '');
      setVapidSubject(settings.vapid_subject || 'mailto:admin@smartschool.com');
      setSupabaseUrlOverride(settings.supabase_url || '');
      setSupabaseAnonKeyOverride(settings.supabase_anon_key || '');
      setSupabaseServiceRoleKeyOverride(settings.supabase_service_role_key || '');
      setResendApiKeyOverride(settings.resend_api_key || '');
      setMapboxTokenOverride(settings.mapbox_token || '');
    }
  }, [settings]);

  const [staff, setStaff] = useState<any[]>([]);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddMasterOpen, setIsAddMasterOpen] = useState<{show: boolean, type: 'year' | 'class' | 'subject'}>({show: false, type: 'year'});

  useEffect(() => {
    if (activeTab === 'staff') {
      getPaginatedStaff(1, 50).then(data => setStaff(data.data));
    }
  }, [activeTab]);

  // Permissions State
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(() => {
    if (settings?.role_permissions) return settings.role_permissions;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ROLE_PERMISSIONS');
      if (saved) return JSON.parse(saved);
    }
    return {
      admin: ['dashboard', 'students', 'staff', 'attendance', 'schedule', 'exams', 'fees', 'transport', 'visitors', 'inventory', 'notices', 'settings'],
      teacher: ['dashboard', 'students', 'attendance', 'schedule', 'exams', 'notices'],
      student: ['dashboard', 'schedule', 'exams', 'fees', 'notices'],
      parent: ['dashboard', 'students', 'attendance', 'schedule', 'fees', 'notices'],
      accountant: ['dashboard', 'fees', 'inventory', 'notices'],
      staff: ['dashboard', 'notices'],
    };
  });

  useEffect(() => {
    if (settings?.role_permissions) {
      setRolePermissions(settings.role_permissions);
    }
  }, [settings?.role_permissions]);

  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'danger';
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      if (activeTab === 'general') {
        await updateSettings({
          school_name: schoolName,
          school_address: schoolAddress,
          school_phone: schoolPhone,
          school_email: schoolEmail,
          currency: currency
        });
      }

      if (activeTab === 'configurations') {
        await updateSettings({
          vapid_public_key: vapidPublicKey,
          vapid_private_key: vapidPrivateKey,
          vapid_subject: vapidSubject,
          supabase_url: supabaseUrlOverride,
          supabase_anon_key: supabaseAnonKeyOverride,
          supabase_service_role_key: supabaseServiceRoleKeyOverride,
          resend_api_key: resendApiKeyOverride,
          mapbox_token: mapboxTokenOverride
        });
      }

      if (activeTab === 'profile') {
        const res = await updateUserProfileAction({
          name: profileName,
          email: profileEmail,
          phone: profilePhone
        });
        if (res.success) {
          toast.success(t('profile_updated_success'));
        } else {
          toast.error(res.message);
        }
      }

      if (activeTab === 'roles') {
        await updateSettings({
          role_permissions: rolePermissions
        });
        localStorage.setItem('ROLE_PERMISSIONS', JSON.stringify(rolePermissions));
        toast.success('Role permissions updated successfully');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (settings) {
      setSchoolName(settings.school_name || '');
      setSchoolAddress(settings.school_address || '');
      setSchoolPhone(settings.school_phone || '');
      setSchoolEmail(settings.school_email || '');
      setCurrency(settings.currency || 'USD');

      setVapidPublicKey(settings.vapid_public_key || '');
      setVapidPrivateKey(settings.vapid_private_key || '');
      setVapidSubject(settings.vapid_subject || 'mailto:admin@smartschool.com');
      setSupabaseUrlOverride(settings.supabase_url || '');
      setSupabaseAnonKeyOverride(settings.supabase_anon_key || '');
      setSupabaseServiceRoleKeyOverride(settings.supabase_service_role_key || '');
      setResendApiKeyOverride(settings.resend_api_key || '');
      setMapboxTokenOverride(settings.mapbox_token || '');
    }
    setProfileName(user?.name || '');
    setProfileEmail(user?.email || '');
    setProfilePhone(user?.phone || '');
    toast.info(t('discard_changes_msg'));
  };

  return (
    <motion.div 
      key={user.id}
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 h-full flex flex-col"
    >
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('profile_settings_title')}</h1>
        <p className="text-muted-foreground mt-2 font-medium">{t('profile_settings_desc')}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            {[
              { id: 'profile', label: t('profile_security'), icon: User, show: true },
              { id: 'notifications', label: t('notifications'), icon: Bell, show: true },
              { id: 'users', label: t('users_passwords'), icon: Users, show: isAdmin() },
              { id: 'general', label: t('general_preferences'), icon: Building, show: isAdmin() },
              { id: 'academics', label: t('academics'), icon: BookOpen, show: isAdmin() },
              { id: 'roles', label: t('roles_permissions'), icon: Shield, show: isAdmin() },
              { id: 'data', label: t('data_management'), icon: RefreshCw, show: isAdmin() },
              { id: 'configurations', label: t('advanced_configurations'), icon: Globe, show: user.role === 'admin' },
            ].filter(tab => tab.show).map((tab) => {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    activeTab === tab.id 
                      ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <tab.icon size={18} className={activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
            <form onSubmit={handleSave}>
              
              <SecuritySettings
                activeTab={activeTab as any}
                user={user}
                profileName={profileName}
                setProfileName={setProfileName}
                profileEmail={profileEmail}
                setProfileEmail={setProfileEmail}
                profilePhone={profilePhone}
                setProfilePhone={setProfilePhone}
                changePasswordAction={changePasswordAction}
              />

              <SystemSettings
                activeTab={activeTab as any}
                user={user}
                schoolName={schoolName}
                setSchoolName={setSchoolName}
                schoolAddress={schoolAddress}
                setSchoolAddress={setSchoolAddress}
                schoolPhone={schoolPhone}
                setSchoolPhone={setSchoolPhone}
                schoolEmail={schoolEmail}
                setSchoolEmail={setSchoolEmail}
                currency={currency}
                setCurrency={setCurrency}
                settings={settings}
                updateSettings={updateSettings}
                vapidPublicKey={vapidPublicKey}
                setVapidPublicKey={setVapidPublicKey}
                vapidPrivateKey={vapidPrivateKey}
                setVapidPrivateKey={setVapidPrivateKey}
                vapidSubject={vapidSubject}
                setVapidSubject={setVapidSubject}
                supabaseUrlOverride={supabaseUrlOverride}
                setSupabaseUrlOverride={setSupabaseUrlOverride}
                supabaseAnonKeyOverride={supabaseAnonKeyOverride}
                setSupabaseAnonKeyOverride={setSupabaseAnonKeyOverride}
                supabaseServiceRoleKeyOverride={supabaseServiceRoleKeyOverride}
                setSupabaseServiceRoleKeyOverride={setSupabaseServiceRoleKeyOverride}
                resendApiKeyOverride={resendApiKeyOverride}
                setResendApiKeyOverride={setResendApiKeyOverride}
                mapboxTokenOverride={mapboxTokenOverride}
                setMapboxTokenOverride={setMapboxTokenOverride}
              />

              <AcademicsSettings
                activeTab={activeTab}
                classes={classes}
                subjects={subjects}
                academicYears={academicYears}
                mutateClasses={mutateClasses}
                mutateSubjects={mutateSubjects}
                mutateAcademicYears={mutateAcademicYears}
                setIsAddMasterOpen={setIsAddMasterOpen}
                setModalConfig={setModalConfig}
              />

              <AdminSettings
                activeTab={activeTab as any}
                user={user}
                rolePermissions={rolePermissions}
                setRolePermissions={setRolePermissions}
                academicYears={academicYears}
                mutateAcademicYears={mutateAcademicYears}
                setModalConfig={setModalConfig}
                setIsProcessing={setIsProcessing}
                setProcessingMessage={setProcessingMessage}
                isAdmin={isAdmin}
                settings={settings}
                updateSettings={updateSettings}
              />

              <UsersSettings
                activeTab={activeTab}
              />

              {/* Form Actions */}
              {activeTab !== 'users' && (
                <div className="p-6 bg-muted/30 border-t border-border flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={handleCancel}
                    className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {t('save_changes')}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {modalConfig.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    modalConfig.type === 'danger' ? 'bg-destructive/10 text-destructive' :
                    modalConfig.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {modalConfig.type === 'danger' ? <Trash2 size={24} /> :
                     modalConfig.type === 'warning' ? <AlertTriangle size={24} /> :
                     <Database size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{modalConfig.title}</h3>
                    <p className="text-sm text-muted-foreground">{t('action_confirmation')}</p>
                  </div>
                </div>
                
                <p className="text-foreground/80 leading-relaxed">
                  {modalConfig.message}
                </p>
                
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setModalConfig(prev => ({ ...prev, show: false }))}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={modalConfig.onConfirm}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all shadow-sm ${
                      modalConfig.type === 'danger' ? 'bg-destructive hover:bg-destructive/90' :
                      modalConfig.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
                      'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    {t('confirm')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-card border border-border rounded-3xl shadow-xl p-8 flex flex-col items-center gap-4 max-w-xs w-full"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Database size={24} className="text-primary animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <h4 className="font-bold text-foreground">{processingMessage}</h4>
                <p className="text-xs text-muted-foreground mt-1">{t('please_wait_moment')}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {isAddStaffOpen && (
          <AddStaffModal 
            onClose={() => setIsAddStaffOpen(false)} 
            onSuccess={() => {
              getPaginatedStaff(1, 50).then(data => setStaff(data.data));
              setIsAddStaffOpen(false);
            }} 
          />
        )}
      </AnimatePresence>

      {/* Add Master Data Modal */}
      <AnimatePresence>
        {isAddMasterOpen.show && (
          <AddMasterModal 
            type={isAddMasterOpen.type}
            onClose={() => setIsAddMasterOpen({ show: false, type: 'year' })} 
            onSuccess={() => {
              mutateAcademicYears();
              mutateClasses();
              mutateSubjects();
              setIsAddMasterOpen({ show: false, type: 'year' });
            }} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

