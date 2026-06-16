'use client';

import React, { useState } from 'react';
import { 
  LayoutGrid, Palette, Type, Globe, Moon, RefreshCw, 
  Trash2, AlertTriangle, FileDown, FileUp 
} from 'lucide-react';
import { toast } from 'sonner';
import { User as UserType } from '@/types';
import { seedDatabase, resetDatabase, setActiveAcademicYear } from '@/lib/supabase-db';

interface AdminSettingsProps {
  activeTab: 'roles' | 'data';
  user: UserType;
  rolePermissions: Record<string, string[]>;
  setRolePermissions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  academicYears: any[] | undefined;
  mutateAcademicYears: () => void;
  setModalConfig: (val: any) => void;
  setIsProcessing: (val: boolean) => void;
  setProcessingMessage: (val: string) => void;
  isAdmin: () => boolean;
  settings: any;
  updateSettings: (val: any) => Promise<any>;
}

export function AdminSettings({
  activeTab,
  user,
  rolePermissions,
  setRolePermissions,
  academicYears,
  mutateAcademicYears,
  setModalConfig,
  setIsProcessing,
  setProcessingMessage,
  isAdmin,
  settings,
  updateSettings
}: AdminSettingsProps) {
  const [localLanguage, setLocalLanguage] = useState(localStorage.getItem('APP_LANGUAGE') || 'English (US)');
  const [localTheme, setLocalTheme] = useState(localStorage.getItem('APP_THEME') || 'Light Mode');

  const handleLanguageChange = (val: string) => {
    setLocalLanguage(val);
    localStorage.setItem('APP_LANGUAGE', val);
    toast.info(`Language set to ${val}. Changes will apply on refresh.`);
  };

  const handleThemeChange = (val: string) => {
    setLocalTheme(val);
    localStorage.setItem('APP_THEME', val);
    // Real logic to toggle dark mode class
    if (val === 'Dark Mode') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    toast.info(`Theme set to ${val}`);
  };
  return (
    <>
      {/* Roles & Permissions Tab */}
      {activeTab === 'roles' && (
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
                          checked={rolePermissions[role]?.includes(module.id) || false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setRolePermissions(prev => {
                              const newPerms = { ...prev };
                              if (checked) {
                                newPerms[role] = [...(newPerms[role] || []), module.id];
                              } else {
                                newPerms[role] = (newPerms[role] || []).filter(p => p !== module.id);
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

      {/* Data Management Tab */}
      {activeTab === 'data' && isAdmin() && (
        <div className="p-6 sm:p-8 space-y-8">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-1">Data Management</h3>
            <p className="text-sm text-muted-foreground mb-6">Manage system data, backups, and seeding.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-3 animate-fadeIn">
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
                        setModalConfig((prev: any) => ({ ...prev, show: false }));
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
                          const { resetDatabaseAction } = await import('@/app/actions/settings');
                          await resetDatabaseAction(true);

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

              <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-3 animate-fadeIn">
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
                        setModalConfig((prev: any) => ({ ...prev, show: false }));
                        setIsProcessing(true);
                        setProcessingMessage('Performing factory reset...');
                        
                        try {
                          localStorage.clear();
                          const { resetDatabaseAction } = await import('@/app/actions/settings');
                          await resetDatabaseAction(false);
                          setIsProcessing(false);
                          window.location.href = '/';
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

              <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-3 animate-fadeIn">
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

              <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-3 animate-fadeIn">
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
                              setModalConfig((prev: any) => ({ ...prev, show: false }));
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
    </>
  );
}
