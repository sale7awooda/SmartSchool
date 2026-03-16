'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
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
  const { can, isAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'roles' | 'academics' | 'general' | 'admin' | 'configurations'>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Configuration State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [mapboxToken, setMapboxToken] = useState('');
  const [gpsInterval, setGpsInterval] = useState('1');

  // Load saved configurations
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupabaseUrl(localStorage.getItem('SUPABASE_URL') || '');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupabaseKey(localStorage.getItem('SUPABASE_ANON_KEY') || '');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMapboxToken(localStorage.getItem('MAPBOX_ACCESS_TOKEN') || '');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGpsInterval(localStorage.getItem('GPS_UPDATE_INTERVAL') || '1');
  }, []);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Save configurations to localStorage if on configurations tab
    if (activeTab === 'configurations') {
      localStorage.setItem('SUPABASE_URL', supabaseUrl);
      localStorage.setItem('SUPABASE_ANON_KEY', supabaseKey);
      localStorage.setItem('MAPBOX_ACCESS_TOKEN', mapboxToken);
      localStorage.setItem('GPS_UPDATE_INTERVAL', gpsInterval);
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSaving(false);
    toast.success('Settings saved successfully');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
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
              { id: 'general', label: 'General Settings', icon: Building, show: isAdmin() },
              { id: 'security', label: 'Security & Password', icon: Lock, show: true },
              { id: 'notifications', label: 'Notifications', icon: Bell, show: true },
              { id: 'roles', label: 'Roles & Permissions', icon: Users, show: isAdmin() },
              { id: 'academics', label: 'Academics', icon: BookOpen, show: isAdmin() },
              { id: 'admin', label: 'System & Preferences', icon: Settings, show: true },
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
                      <p className="text-sm font-medium text-muted-foreground capitalize">{user.role.replace(/([A-Z])/g, ' $1').trim()}</p>
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
                        <input type="text" defaultValue={user.name} className="w-full pl-11 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Email Address</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input type="email" defaultValue={user.email || ''} className="w-full pl-11 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Phone Number</label>
                      <div className="relative">
                        <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input type="tel" defaultValue={user.phone || ''} className="w-full pl-11 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-foreground" />
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
                      <input type="text" defaultValue="Greenwood High School" className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">School Address</label>
                      <input type="text" defaultValue="123 Education Lane, Learning City" className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground" />
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

              {/* Notifications Tab */}
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
              )}

              {/* Roles & Permissions Tab */}
              {activeTab === 'roles' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Roles & Permissions</h3>
                    <p className="text-sm text-muted-foreground">Manage user roles and their access levels.</p>
                  </div>
                  <div className="space-y-6">
                    {[
                      { name: 'John Doe', role: 'Admin', permissions: ['view_grades', 'edit_grades', 'manage_users'] },
                      { name: 'Jane Smith', role: 'Teacher', permissions: ['view_grades', 'edit_grades'] },
                      { name: 'Bob Johnson', role: 'Student', permissions: ['view_grades'] },
                    ].map((user, i) => (
                      <div key={i} className="p-4 rounded-xl border border-border bg-muted/30 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{user.name}</span>
                          <select defaultValue={user.role} className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm font-bold text-foreground">
                            <option>Admin</option>
                            <option>Teacher</option>
                            <option>Student</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Permissions</p>
                          <div className="flex flex-wrap gap-2">
                            {['view_grades', 'edit_grades', 'manage_users', 'view_attendance'].map(perm => (
                              <label key={perm} className="flex items-center gap-2 text-sm text-foreground">
                                <input type="checkbox" defaultChecked={user.permissions.includes(perm)} className="rounded border-input text-primary" />
                                {perm.replace('_', ' ')}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90">
                      <Plus size={16} /> Add User
                    </button>
                  </div>
                </div>
              )}

              {/* Academics Tab */}
              {activeTab === 'academics' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Academics</h3>
                    <p className="text-sm text-muted-foreground">Configure academic years and terms.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-bold text-foreground">Academic Years</h4>
                      <div className="flex gap-4">
                        <input type="text" placeholder="2025-2026" className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground" />
                        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90">
                          <Plus size={16} /> Add
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-bold text-foreground">Terms</h4>
                      <div className="space-y-2">
                        {['Term 1', 'Term 2', 'Term 3'].map((term, i) => (
                          <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                            <span className="font-bold text-foreground">{term}</span>
                            <div className="flex gap-2">
                              <button className="p-2 text-muted-foreground hover:text-primary"><Edit size={16} /></button>
                              <button className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90">
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
                  {user.role === 'admin' && (
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1">System Configuration</h3>
                      <p className="text-sm text-muted-foreground mb-6">Configure school-wide settings and appearance.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h4 className="font-bold text-foreground flex items-center gap-2"><LayoutGrid size={18} /> Academic Setup</h4>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Current Academic Year</label>
                            <input type="text" defaultValue="2025-2026" className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground" />
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
                    <h3 className="text-lg font-bold text-foreground mb-1">Advanced Configurations</h3>
                    <p className="text-sm text-muted-foreground mb-6">Manage system-level integrations, real-time services, and APIs.</p>
                    
                    <div className="space-y-8">
                      {/* Real-Time Services */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-foreground flex items-center gap-2"><Globe size={18} /> Real-Time Architecture (Supabase)</h4>
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-4">
                          <p className="text-sm text-primary font-medium">
                            These settings control the live tracking and real-time updates across the platform using Supabase Realtime.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Supabase Project URL</label>
                            <input 
                              type="text" 
                              value={supabaseUrl}
                              onChange={(e) => setSupabaseUrl(e.target.value)}
                              placeholder="https://your-project.supabase.co" 
                              className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground font-mono text-sm" 
                            />
                            <p className="text-xs text-muted-foreground">The URL of your Supabase project.</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Supabase Anon Key</label>
                            <input 
                              type="password" 
                              value={supabaseKey}
                              onChange={(e) => setSupabaseKey(e.target.value)}
                              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                              className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground font-mono text-sm" 
                            />
                            <p className="text-xs text-muted-foreground">The public anon key for your Supabase project.</p>
                          </div>
                        </div>
                      </div>

                      <hr className="border-border" />

                      {/* Map & Routing APIs */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-foreground flex items-center gap-2"><Globe size={18} /> Map & Routing Services</h4>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Mapbox Access Token</label>
                            <input 
                              type="password" 
                              value={mapboxToken}
                              onChange={(e) => setMapboxToken(e.target.value)}
                              placeholder="pk.eyJ1Ijoi..." 
                              className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl outline-none text-foreground font-mono text-sm" 
                            />
                            <p className="text-xs text-muted-foreground">The Mapbox access token used for calculating bus routes and ETAs.</p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">GPS Update Interval (Minutes)</label>
                            <select 
                              value={gpsInterval}
                              onChange={(e) => setGpsInterval(e.target.value)}
                              className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-foreground appearance-none"
                            >
                              <option value="1">1 Minute (Recommended)</option>
                              <option value="2">2 Minutes</option>
                              <option value="3">3 Minutes</option>
                              <option value="5">5 Minutes (Saves Quota)</option>
                            </select>
                            <p className="text-xs text-muted-foreground">Controls how often the bus driver/attendant app broadcasts its location to parents. Higher intervals save Supabase Realtime quota.</p>
                          </div>
                        </div>
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
    </motion.div>
  );
}
