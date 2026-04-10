'use client';

import { useState, useEffect } from 'react';
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
import { 
  MOCK_USERS, 
  MOCK_STUDENTS, 
  MOCK_PARENTS, 
  MOCK_DRIVERS, 
  MOCK_BUS_ROUTES, 
  MOCK_NOTICES, 
  MOCK_SCHEDULE,
  MOCK_CHATS,
  MOCK_MESSAGES,
  MOCK_ACADEMIC_YEARS,
  MOCK_CLASSES,
  MOCK_SUBJECTS,
  MOCK_EXAMS,
  MOCK_EXAM_RESULTS,
  MOCK_ATTENDANCE,
  MOCK_BOOKS,
  MOCK_INVOICES,
  MOCK_INVENTORY
} from '@/lib/demo-data';

export default function SettingsPage() {
  const { user } = useAuth();
  const { can, isAdmin } = usePermissions();
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'roles' | 'general' | 'admin' | 'configurations' | 'data' | 'master' | 'staff'>('profile');
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

  useEffect(() => {
    if (settings) {
      setSchoolName(settings.school_name);
      setSchoolAddress(settings.school_address);
      setSchoolPhone(settings.school_phone);
      setSchoolEmail(settings.school_email);
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
      librarian: ['dashboard', 'notices'],
    };
  });

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
          school_email: schoolEmail
        });
      }

      if (activeTab === 'profile') {
        localStorage.setItem('USER_PROFILE_NAME', profileName);
        localStorage.setItem('USER_PROFILE_EMAIL', profileEmail);
        localStorage.setItem('USER_PROFILE_PHONE', profilePhone);
        toast.info('Profile changes saved locally. Refresh to see updates.');
      }

      if (activeTab === 'roles') {
        localStorage.setItem('ROLE_PERMISSIONS', JSON.stringify(rolePermissions));
      }

      if (activeTab === 'admin') {
        // Handle appearance settings if any
      }

      // Simulate API call for other tabs
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      key={user.id}
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 h-full flex flex-col"
    >
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Profile & Settings</h1>
        <p className="text-muted-foreground mt-2 font-medium">Manage your account settings and preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            {[
              { id: 'profile', label: 'Profile Information', icon: User, show: true },
              { id: 'security', label: 'Security & Password', icon: Lock, show: true },
              { id: 'notifications', label: 'Notifications', icon: Bell, show: true },
              { id: 'general', label: 'General Settings', icon: Building, show: isAdmin() },
              { id: 'master', label: 'Master Data', icon: Database, show: isAdmin() },
              { id: 'roles', label: 'Roles & Permissions', icon: Shield, show: isAdmin() },
              { id: 'staff', label: 'Staff Management', icon: Users, show: isAdmin() },
              { id: 'admin', label: 'System & Preferences', icon: Settings, show: true },
              { id: 'data', label: 'Data Management', icon: RefreshCw, show: isAdmin() },
              { id: 'configurations', label: 'Advanced Configurations', icon: Globe, show: user.role === 'admin' },
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
              
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="p-6 sm:p-8 space-y-8">
                  <div className="flex items-center gap-6 pb-8 border-b border-border">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold shadow-inner">
                        {user.name.charAt(0)}
                      </div>
                      <button type="button" className="absolute bottom-0 right-0 w-8 h-8 bg-card rounded-full border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
                        <Camera size={14} />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{user.name}</h3>
                      <p className="text-sm font-medium text-muted-foreground">{user.email}</p>
                      <div className="mt-3 flex gap-2">
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-md border border-emerald-500/20">Active Account</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Full Name</label>
                      <div className="relative">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                          type="text" 
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-foreground" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Email Address</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                          type="email" 
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-foreground" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Phone Number</label>
                      <div className="relative">
                        <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                          type="tel" 
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-foreground" 
                        />
                      </div>
                    </div>
                    {user.studentId && (
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Primary Student ID</label>
                        <input type="text" defaultValue={user.studentId} disabled className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none font-medium text-muted-foreground cursor-not-allowed" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="p-6 sm:p-8 space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">General Settings</h3>
                    <p className="text-sm text-muted-foreground">Manage school information and basic settings.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">School Name</label>
                      <input 
                        type="text" 
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">School Address</label>
                      <input 
                        type="text" 
                        value={schoolAddress}
                        onChange={(e) => setSchoolAddress(e.target.value)}
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Phone Number</label>
                      <input 
                        type="text" 
                        value={schoolPhone}
                        onChange={(e) => setSchoolPhone(e.target.value)}
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Email Address</label>
                      <input 
                        type="email" 
                        value={schoolEmail}
                        onChange={(e) => setSchoolEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-6 sm:p-8 space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Change Password</h3>
                    <p className="text-sm text-muted-foreground">Ensure your account is using a long, random password to stay secure.</p>
                  </div>
                  <div className="space-y-5 max-w-md">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Current Password</label>
                      <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Confirm New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground" />
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-border">
                    <h3 className="text-lg font-bold text-foreground mb-1">Two-Factor Authentication</h3>
                    <p className="text-sm text-muted-foreground mb-4">Add additional security to your account using two-factor authentication.</p>
                    <button type="button" className="px-5 py-2.5 bg-foreground text-background rounded-xl font-bold text-sm hover:bg-foreground/90 transition-colors">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              )}

              {/* Master Data Tab */}
              {activeTab === 'master' && isAdmin() && (
                <div className="p-6 sm:p-8 space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Master Data Management</h3>
                    <p className="text-sm text-muted-foreground">Manage core system entities used across all modules.</p>
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
                          <div key={cls.id} className="px-3 py-2 bg-background border border-border rounded-lg text-xs flex items-center justify-between">
                            {cls.name}
                            <button 
                              type="button"
                              onClick={async () => {
                                if (confirm(`Delete ${cls.name}?`)) {
                                  await deleteClass(cls.id);
                                  mutateClasses();
                                  toast.success('Grade deleted');
                                }
                              }}
                              className="text-muted-foreground hover:text-destructive"
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
                          <div key={subject.id} className="px-3 py-2 bg-background border border-border rounded-lg text-xs flex items-center justify-between">
                            {subject.name}
                            <button 
                              type="button"
                              onClick={async () => {
                                if (confirm(`Delete ${subject.name}?`)) {
                                  await deleteSubject(subject.id);
                                  mutateSubjects();
                                  toast.success('Subject deleted');
                                }
                              }}
                              className="text-muted-foreground hover:text-destructive"
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
                          <div key={year.id} className="px-4 py-3 bg-background border border-border rounded-lg text-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-bold">{year.name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${year.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                                {year.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <button 
                              type="button"
                              onClick={async () => {
                                if (confirm(`Delete ${year.name}?`)) {
                                  await deleteAcademicYear(year.id);
                                  mutateAcademicYears();
                                  toast.success('Academic year deleted');
                                }
                              }}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'notifications' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Notification Preferences</h3>
                    <p className="text-sm text-muted-foreground">Choose what updates you want to receive and how.</p>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { title: 'Academic Updates', desc: 'Grades, assignments, and report cards', email: true, push: true },
                      { title: 'Attendance Alerts', desc: 'Absences and tardiness notifications', email: true, push: true },
                      { title: 'Fee Reminders', desc: 'Upcoming due dates and payment confirmations', email: true, push: false },
                      { title: 'School Notices', desc: 'General announcements and events', email: false, push: true },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-bold text-foreground">{item.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                        <div className="flex gap-4">
                          <label className="flex flex-col items-center gap-2 cursor-pointer">
                            <span className="text-xs font-bold text-muted-foreground uppercase">Email</span>
                            <input type="checkbox" defaultChecked={item.email} className="w-5 h-5 rounded border-input text-primary focus:ring-primary" />
                          </label>
                          <label className="flex flex-col items-center gap-2 cursor-pointer">
                            <span className="text-xs font-bold text-muted-foreground uppercase">Push</span>
                            <input type="checkbox" defaultChecked={item.push} className="w-5 h-5 rounded border-input text-primary focus:ring-primary" />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}                {activeTab === 'roles' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Roles & Permissions</h3>
                    <p className="text-sm text-muted-foreground">Define what each role can access across the system.</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Module / Feature</th>
                          {Object.keys(rolePermissions).map(role => (
                            <th key={role} className="text-center py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              {role}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: 'dashboard', label: 'Dashboard' },
                          { id: 'students', label: 'Students Directory' },
                          { id: 'staff', label: 'Staff Directory' },
                          { id: 'attendance', label: 'Attendance' },
                          { id: 'schedule', label: 'Schedule/Timetable' },
                          { id: 'exams', label: 'Exams & Results' },
                          { id: 'fees', label: 'Fees & Finance' },
                          { id: 'transport', label: 'Transport/Live Map' },
                          { id: 'visitors', label: 'Visitors' },
                          { id: 'inventory', label: 'Inventory' },
                          { id: 'notices', label: 'Notices & Events' },
                          { id: 'settings', label: 'System Settings' },
                        ].map(module => (
                          <tr key={module.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-4 px-4 text-sm font-medium text-foreground">{module.label}</td>
                            {Object.keys(rolePermissions).map(role => (
                              <td key={`${role}-${module.id}`} className="py-4 px-4 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={rolePermissions[role].includes(module.id)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setRolePermissions(prev => {
                                      const newPerms = { ...prev };
                                      if (checked) {
                                        newPerms[role] = [...newPerms[role], module.id];
                                      } else {
                                        newPerms[role] = newPerms[role].filter(p => p !== module.id);
                                      }
                                      return newPerms;
                                    });
                                  }}
                                  className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'staff' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1">Staff Management</h3>
                      <p className="text-sm text-muted-foreground">Manage staff roles and assignments.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsAddStaffOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
                    >
                      <Plus size={16} />
                      Add Staff
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</th>
                          <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staff.map(member => (
                          <tr key={member.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-4 px-4 text-sm font-medium text-foreground">{member.name}</td>
                            <td className="py-4 px-4 text-sm text-muted-foreground">
                              <select 
                                value={member.role}
                                onChange={async (e) => {
                                  const newRole = e.target.value;
                                  await updateUserRole(member.id, newRole);
                                  setStaff(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
                                }}
                                className="bg-transparent border-none text-sm font-medium text-primary focus:ring-0"
                              >
                                <option value="admin">Admin</option>
                                <option value="teacher">Teacher</option>
                                <option value="staff">Staff</option>
                                <option value="accountant">Accountant</option>
                                <option value="driver">Driver</option>
                                <option value="cleaner">Cleaner</option>
                                <option value="guard">Guard</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* System & Preferences Tab */}
              {activeTab === 'admin' && (
                <div className="p-6 sm:p-8 space-y-8">
                  {/* School-wide Settings (Admin Only) */}
                  {user.role === 'admin' && (
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1">System Configuration</h3>
                      <p className="text-sm text-muted-foreground mb-6">Configure school-wide settings and appearance.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h4 className="font-bold text-foreground flex items-center gap-2"><LayoutGrid size={18} /> Academic Setup</h4>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Current Academic Year</label>
                            <select 
                              value={academicYears?.find(y => y.is_active)?.id || ''}
                              onChange={async (e) => {
                                try {
                                  await setActiveAcademicYear(e.target.value);
                                  mutateAcademicYears();
                                  toast.success('Academic year updated successfully');
                                } catch (error) {
                                  toast.error('Failed to update academic year');
                                }
                              }}
                              className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground"
                            >
                              <option value="" disabled>Select Academic Year</option>
                              {academicYears?.map(year => (
                                <option key={year.id} value={year.id}>{year.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Grading Scale</label>
                            <select className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground">
                              <option>Standard (A-F)</option>
                              <option>Percentage (0-100)</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-bold text-foreground flex items-center gap-2"><Palette size={18} /> Appearance</h4>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Theme Color</label>
                            <div className="flex gap-2">
                              {['indigo', 'emerald', 'rose', 'amber'].map(color => (
                                <button key={color} className={`w-8 h-8 rounded-full bg-${color}-500 border-2 border-background ring-2 ring-border`} />
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground flex items-center gap-2"><Type size={16} /> Font Family</label>
                            <select className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground">
                              <option>Inter (Default)</option>
                              <option>Roboto</option>
                              <option>Open Sans</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border">
                            <span className="text-sm font-bold text-foreground">Compact Design</span>
                            <input type="checkbox" className="w-5 h-5 rounded border-input text-primary" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* User Preferences */}
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">App Preferences</h3>
                    <p className="text-sm text-muted-foreground mb-6">Customize your experience.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Globe size={16} /> Language
                        </label>
                        <select className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-foreground appearance-none">
                          <option>English (US)</option>
                          <option>Spanish</option>
                          <option>French</option>
                          <option>Arabic</option>
                        </select>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Moon size={16} /> Theme
                        </label>
                        <select className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-foreground appearance-none">
                          <option>Light Mode</option>
                          <option>Dark Mode</option>
                          <option>System Default</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Configurations Tab */}
              {activeTab === 'configurations' && user.role === 'admin' && (
                <div className="p-6 sm:p-8 space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Advanced System Configurations</h3>
                    <p className="text-sm text-muted-foreground mb-6">Fine-tune system behavior and feature availability.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { id: 'enable_online_registration', label: 'Online Registration', desc: 'Allow new students to register via the public portal.', icon: Globe },
                        { id: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Disable all user access except for administrators.', icon: ShieldAlert },
                        { id: 'automatic_attendance', label: 'Automatic Attendance', desc: 'Mark students present automatically based on bus entry.', icon: UserCheck },
                        { id: 'enable_sms', label: 'SMS Notifications', desc: 'Send automated SMS for critical alerts and fee reminders.', icon: MessageSquare },
                      ].map(config => (
                        <div key={config.id} className="flex items-start justify-between p-5 rounded-2xl border border-border bg-muted/30 hover:bg-muted/50 transition-all">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <config.icon size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{config.label}</p>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{config.desc}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateSettings({ [config.id]: !settings?.[config.id as keyof typeof settings] })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings?.[config.id as keyof typeof settings] ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.[config.id as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                    <div className="flex items-center gap-3 text-amber-600 mb-3">
                      <Shield size={20} />
                      <h4 className="font-bold">Environment Variables</h4>
                    </div>
                    <p className="text-sm text-amber-700/80 leading-relaxed mb-4">
                      Sensitive infrastructure settings are managed via secure environment variables. Contact your system administrator to update these values.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_MAPBOX_TOKEN'].map(v => (
                        <div key={v} className="px-3 py-2 bg-white/50 border border-amber-500/10 rounded-lg text-[10px] font-mono text-amber-800 truncate">
                          {v}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Data Management Tab */}
              {activeTab === 'data' && isAdmin() && (
                <div className="p-6 sm:p-8 space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Data Management</h3>
                    <p className="text-sm text-muted-foreground mb-6">Manage system data, backups, and seeding.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3 col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-primary">
                          <RefreshCw size={16} />
                          Full System Seeding
                        </div>
                        <p className="text-xs text-muted-foreground">Populate both local storage and Supabase with comprehensive demo data for all screens.</p>
                        <button 
                          type="button"
                          onClick={() => {
                            setModalConfig({
                              show: true,
                              title: 'Seed System & Supabase',
                              message: 'This will populate both your local system and the connected Supabase database with demo data for all features. This is recommended for the first-time setup. Continue?',
                              type: 'info',
                              onConfirm: async () => {
                                setModalConfig(prev => ({ ...prev, show: false }));
                                setIsProcessing(true);
                                setProcessingMessage('Seeding full system...');
                                
                                try {
                                  const demoData = {
                                    MOCK_USERS, MOCK_STUDENTS, MOCK_PARENTS, 
                                    MOCK_DRIVERS, MOCK_BUS_ROUTES, MOCK_NOTICES, 
                                    MOCK_SCHEDULE, MOCK_CHATS, MOCK_MESSAGES,
                                    MOCK_ACADEMIC_YEARS, MOCK_CLASSES, MOCK_SUBJECTS,
                                    MOCK_EXAMS, MOCK_EXAM_RESULTS, MOCK_ATTENDANCE,
                                    MOCK_BOOKS, MOCK_INVOICES, MOCK_INVENTORY
                                  };

                                  // Local Seeding
                                  Object.entries(demoData).forEach(([key, val]) => {
                                    localStorage.setItem(key, JSON.stringify(val));
                                  });

                                  // Cloud Seeding
                                  await seedDatabase(demoData);
                                  
                                  setIsProcessing(false);
                                  toast.success('System & Supabase seeded successfully! Refreshing...');
                                  setTimeout(() => window.location.reload(), 1500);
                                } catch (err) {
                                  setIsProcessing(false);
                                  toast.error('Failed to seed system fully.');
                                  console.error(err);
                                }
                              }
                            });
                          }}
                          className="w-full py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-bold transition-all shadow-sm"
                        >
                          Seed System & Supabase
                        </button>
                      </div>

                      <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <Trash2 size={16} className="text-destructive" />
                          Data Reset
                        </div>
                        <p className="text-xs text-muted-foreground">Clear all records but keep demo users and their details. This also resets Supabase data.</p>
                        <button 
                          type="button"
                          onClick={() => {
                            setModalConfig({
                              show: true,
                              title: 'Reset Data (Keep Users)',
                              message: 'This will clear all system data (attendance, grades, etc.) but keep user accounts. Continue?',
                              type: 'warning',
                              onConfirm: async () => {
                                setModalConfig(prev => ({ ...prev, show: false }));
                                setIsProcessing(true);
                                setProcessingMessage('Resetting data...');
                                
                                try {
                                  // Local Reset
                                  const keysToClear = [
                                    'MOCK_STUDENTS', 'MOCK_BUS_ROUTES', 'MOCK_NOTICES', 
                                    'MOCK_SCHEDULE', 'MOCK_CHATS', 'MOCK_MESSAGES',
                                    'MOCK_ACADEMIC_YEARS', 'MOCK_CLASSES', 'MOCK_SUBJECTS',
                                    'MOCK_EXAMS', 'MOCK_EXAM_RESULTS', 'MOCK_ATTENDANCE',
                                    'MOCK_BOOKS', 'MOCK_INVOICES', 'MOCK_INVENTORY'
                                  ];
                                  keysToClear.forEach(key => localStorage.removeItem(key));

                                  // Cloud Reset
                                  await resetDatabase(true);

                                  setIsProcessing(false);
                                  toast.success('Data reset successfully! Refreshing...');
                                  setTimeout(() => window.location.reload(), 1500);
                                } catch (err) {
                                  setIsProcessing(false);
                                  toast.error('Failed to reset data.');
                                }
                              }
                            });
                          }}
                          className="w-full py-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded-lg text-xs font-bold transition-all"
                        >
                          Reset Data
                        </button>
                      </div>

                      <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <AlertTriangle size={16} className="text-destructive" />
                          Full Factory Reset
                        </div>
                        <p className="text-xs text-muted-foreground">Completely wipe all data including users from both local and cloud systems.</p>
                        <button 
                          type="button"
                          onClick={() => {
                            setModalConfig({
                              show: true,
                              title: 'Full Factory Reset',
                              message: 'DANGER: This will delete EVERYTHING including all user accounts. You will be logged out. Continue?',
                              type: 'danger',
                              onConfirm: async () => {
                                setModalConfig(prev => ({ ...prev, show: false }));
                                setIsProcessing(true);
                                setProcessingMessage('Performing factory reset...');
                                
                                try {
                                  localStorage.clear();
                                  await resetDatabase(false);
                                  setIsProcessing(false);
                                  window.location.href = '/login';
                                } catch (err) {
                                  setIsProcessing(false);
                                  toast.error('Failed to perform factory reset.');
                                }
                              }
                            });
                          }}
                          className="w-full py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-xs font-bold transition-all"
                        >
                          Full Factory Reset
                        </button>
                      </div>

                      <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <FileDown size={16} className="text-emerald-500" />
                          Backup Data
                        </div>
                        <p className="text-xs text-muted-foreground">Download a backup of all your current system data as a JSON file.</p>
                        <button 
                          type="button"
                          onClick={() => {
                            const data: Record<string, any> = {};
                            const keys = [
                              'MOCK_USERS', 'MOCK_STUDENTS', 'MOCK_PARENTS', 
                              'MOCK_DRIVERS', 'MOCK_BUS_ROUTES', 'MOCK_NOTICES', 
                              'MOCK_SCHEDULE', 'MOCK_CHATS', 'MOCK_MESSAGES',
                              'advanced_config'
                            ];
                            keys.forEach(key => {
                              const val = localStorage.getItem(key);
                              if (val) data[key] = JSON.parse(val);
                            });
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `school_backup_${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success('Backup created successfully!');
                          }}
                          className="w-full py-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-lg text-xs font-bold transition-all"
                        >
                          Download Backup
                        </button>
                      </div>

                      <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <FileUp size={16} className="text-blue-500" />
                          Restore Data
                        </div>
                        <p className="text-xs text-muted-foreground">Restore your system data from a previously downloaded backup file.</p>
                        <label className="w-full py-2 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center">
                          Upload Backup
                          <input 
                            type="file" 
                            accept=".json"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                try {
                                  const data = JSON.parse(event.target?.result as string);
                                  setModalConfig({
                                    show: true,
                                    title: 'Restore Data',
                                    message: 'This will overwrite your current local data with the backup. Continue?',
                                    type: 'warning',
                                    onConfirm: async () => {
                                      setModalConfig(prev => ({ ...prev, show: false }));
                                      setIsProcessing(true);
                                      setProcessingMessage('Restoring data from backup...');
                                      await new Promise(resolve => setTimeout(resolve, 1500));
                                      Object.entries(data).forEach(([key, val]) => {
                                        localStorage.setItem(key, JSON.stringify(val));
                                      });
                                      setIsProcessing(false);
                                      toast.success('Data restored successfully! Please refresh the page.');
                                    }
                                  });
                                } catch (err) {
                                  toast.error('Invalid backup file.');
                                }
                              };
                              reader.readAsText(file);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="p-6 bg-muted/30 border-t border-border flex justify-end gap-3">
                <button type="button" className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-all">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
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
                    <p className="text-sm text-muted-foreground">Action Confirmation</p>
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
                    Cancel
                  </button>
                  <button 
                    onClick={modalConfig.onConfirm}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all shadow-sm ${
                      modalConfig.type === 'danger' ? 'bg-destructive hover:bg-destructive/90' :
                      modalConfig.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
                      'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    Confirm
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
                <p className="text-xs text-muted-foreground mt-1">Please wait a moment...</p>
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

function AddStaffModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'teacher',
    phone: '',
    department: 'Academics'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createStaff(formData);
      toast.success('Staff member added successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to add staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
      >
        <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Add New Staff</h2>
          <p className="text-sm font-medium text-muted-foreground mt-2">Enter the details for the new staff member.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Full Name</label>
            <input 
              required 
              type="text" 
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="John Doe" 
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Email Address</label>
            <input 
              required 
              type="email" 
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john.doe@school.edu" 
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Role</label>
              <select 
                required 
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
              >
                <option value="teacher">Teacher</option>
                <option value="staff">Staff</option>
                <option value="admin">Administrator</option>
                <option value="accountant">Accountant</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Department</label>
              <select 
                required 
                value={formData.department}
                onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
              >
                <option value="Academics">Academics</option>
                <option value="Administration">Administration</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Add Staff'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function AddMasterModal({ type, onClose, onSuccess }: { type: 'year' | 'class' | 'subject', onClose: () => void, onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (type === 'year') {
        await createAcademicYear({ name, is_active: false });
      } else if (type === 'class') {
        await createClass({ name });
      } else if (type === 'subject') {
        await createSubject({ name });
      }
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully`);
      onSuccess();
    } catch (error) {
      toast.error(`Failed to add ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border flex flex-col"
      >
        <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Add New {type === 'year' ? 'Academic Year' : type === 'class' ? 'Grade' : 'Subject'}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Name / Title</label>
            <input 
              required 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={type === 'year' ? '2024-2025' : type === 'class' ? 'Grade 7' : 'Physics'} 
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
            />
          </div>

          <div className="flex gap-3 pt-6">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Add Item'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
