'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'motion/react';
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
  Building
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'roles' | 'academics' | 'general' | 'admin'>('profile');
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSaving(false);
    toast.success('Settings saved successfully');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Profile & Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage your account settings and preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            {[
              { id: 'profile', label: 'Profile Information', icon: User },
              { id: 'general', label: 'General Settings', icon: Building },
              { id: 'security', label: 'Security & Password', icon: Lock },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'roles', label: 'Roles & Permissions', icon: Users },
              { id: 'academics', label: 'Academics', icon: BookOpen },
              { id: 'admin', label: 'System & Preferences', icon: Settings },
            ].map((tab) => {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    activeTab === tab.id 
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-500/20' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <tab.icon size={18} className={activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <form onSubmit={handleSave}>
              
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="p-6 sm:p-8 space-y-8">
                  <div className="flex items-center gap-6 pb-8 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl font-bold shadow-inner">
                        {user.name.charAt(0)}
                      </div>
                      <button type="button" className="absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                        <Camera size={14} />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h3>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 capitalize">{user.role.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <div className="mt-3 flex gap-2">
                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-md border border-emerald-100 dark:border-emerald-900/50">Active Account</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                      <div className="relative">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" defaultValue={user.name} className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900 dark:text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" defaultValue={user.email || ''} className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900 dark:text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                      <div className="relative">
                        <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="tel" defaultValue={user.phone || ''} className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900 dark:text-white" />
                      </div>
                    </div>
                    {user.studentId && (
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Primary Student ID</label>
                        <input type="text" defaultValue={user.studentId} disabled className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="p-6 sm:p-8 space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">General Settings</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage school information and basic settings.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">School Name</label>
                      <input type="text" defaultValue="Greenwood High School" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">School Address</label>
                      <input type="text" defaultValue="123 Education Lane, Learning City" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white" />
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-6 sm:p-8 space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Change Password</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ensure your account is using a long, random password to stay secure.</p>
                  </div>
                  <div className="space-y-5 max-w-md">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Current Password</label>
                      <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Two-Factor Authentication</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Add additional security to your account using two-factor authentication.</p>
                    <button type="button" className="px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-white transition-colors">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Notification Preferences</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Choose what updates you want to receive and how.</p>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { title: 'Academic Updates', desc: 'Grades, assignments, and report cards', email: true, push: true },
                      { title: 'Attendance Alerts', desc: 'Absences and tardiness notifications', email: true, push: true },
                      { title: 'Fee Reminders', desc: 'Upcoming due dates and payment confirmations', email: true, push: false },
                      { title: 'School Notices', desc: 'General announcements and events', email: false, push: true },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{item.title}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                        </div>
                        <div className="flex gap-4">
                          <label className="flex flex-col items-center gap-2 cursor-pointer">
                            <span className="text-xs font-bold text-slate-400 uppercase">Email</span>
                            <input type="checkbox" defaultChecked={item.email} className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-600" />
                          </label>
                          <label className="flex flex-col items-center gap-2 cursor-pointer">
                            <span className="text-xs font-bold text-slate-400 uppercase">Push</span>
                            <input type="checkbox" defaultChecked={item.push} className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-600" />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Roles & Permissions Tab */}
              {activeTab === 'roles' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Roles & Permissions</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage user roles and their access levels.</p>
                  </div>
                  <div className="space-y-6">
                    {[
                      { name: 'John Doe', role: 'Admin', permissions: ['view_grades', 'edit_grades', 'manage_users'] },
                      { name: 'Jane Smith', role: 'Teacher', permissions: ['view_grades', 'edit_grades'] },
                      { name: 'Bob Johnson', role: 'Student', permissions: ['view_grades'] },
                    ].map((user, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{user.name}</span>
                          <select defaultValue={user.role} className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300">
                            <option>Admin</option>
                            <option>Teacher</option>
                            <option>Student</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-500 uppercase">Permissions</p>
                          <div className="flex flex-wrap gap-2">
                            {['view_grades', 'edit_grades', 'manage_users', 'view_attendance'].map(perm => (
                              <label key={perm} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <input type="checkbox" defaultChecked={user.permissions.includes(perm)} className="rounded border-slate-300 dark:border-slate-600 text-indigo-600" />
                                {perm.replace('_', ' ')}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700">
                      <Plus size={16} /> Add User
                    </button>
                  </div>
                </div>
              )}

              {/* Academics Tab */}
              {activeTab === 'academics' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Academics</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Configure academic years and terms.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-900 dark:text-white">Academic Years</h4>
                      <div className="flex gap-4">
                        <input type="text" placeholder="2025-2026" className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white" />
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700">
                          <Plus size={16} /> Add
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-900 dark:text-white">Terms</h4>
                      <div className="space-y-2">
                        {['Term 1', 'Term 2', 'Term 3'].map((term, i) => (
                          <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <span className="font-bold text-slate-900 dark:text-white">{term}</span>
                            <div className="flex gap-2">
                              <button className="p-2 text-slate-400 hover:text-indigo-600"><Edit size={16} /></button>
                              <button className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700">
                        <Plus size={16} /> Add Term
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* System & Preferences Tab */}
              {activeTab === 'admin' && (
                <div className="p-6 sm:p-8 space-y-8">
                  {/* School-wide Settings (Admin Only) */}
                  {(user.role === 'schoolAdmin' || user.role === 'superadmin') && (
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">System Configuration</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Configure school-wide settings and appearance.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><LayoutGrid size={18} /> Academic Setup</h4>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Current Academic Year</label>
                            <input type="text" defaultValue="2025-2026" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Grading Scale</label>
                            <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white">
                              <option>Standard (A-F)</option>
                              <option>Percentage (0-100)</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Palette size={18} /> Appearance</h4>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Theme Color</label>
                            <div className="flex gap-2">
                              {['indigo', 'emerald', 'rose', 'amber'].map(color => (
                                <button key={color} className={`w-8 h-8 rounded-full bg-${color}-500 border-2 border-white dark:border-slate-900 ring-2 ring-slate-200 dark:ring-slate-700`} />
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Type size={16} /> Font Family</label>
                            <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white">
                              <option>Inter (Default)</option>
                              <option>Roboto</option>
                              <option>Open Sans</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Compact Design</span>
                            <input type="checkbox" className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* User Preferences */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">App Preferences</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Customize your experience.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Globe size={16} /> Language
                        </label>
                        <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900 dark:text-white appearance-none">
                          <option>English (US)</option>
                          <option>Spanish</option>
                          <option>French</option>
                          <option>Arabic</option>
                        </select>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Moon size={16} /> Theme
                        </label>
                        <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900 dark:text-white appearance-none">
                          <option>Light Mode</option>
                          <option>Dark Mode</option>
                          <option>System Default</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button type="button" className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
