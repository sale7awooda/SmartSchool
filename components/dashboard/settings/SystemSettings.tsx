'use client';

import React, { useState, useEffect } from 'react';
import { 
  Globe, ShieldAlert, UserCheck, MessageSquare, Shield, 
  Palette, Type, LayoutGrid, Moon, Languages, Key, HelpCircle,
  Mail, Navigation, Database
} from 'lucide-react';
import { User as UserType } from '@/types';
import { toast } from 'sonner';

interface SystemSettingsProps {
  activeTab: 'general' | 'configurations';
  user: UserType;
  schoolName: string;
  setSchoolName: (val: string) => void;
  schoolAddress: string;
  setSchoolAddress: (val: string) => void;
  schoolPhone: string;
  setSchoolPhone: (val: string) => void;
  schoolEmail: string;
  setSchoolEmail: (val: string) => void;
  currency: string;
  setCurrency: (val: string) => void;
  settings: any;
  updateSettings: (val: any) => Promise<any>;

  vapidPublicKey: string;
  setVapidPublicKey: (val: string) => void;
  vapidPrivateKey: string;
  setVapidPrivateKey: (val: string) => void;
  vapidSubject: string;
  setVapidSubject: (val: string) => void;
  supabaseUrlOverride: string;
  setSupabaseUrlOverride: (val: string) => void;
  supabaseAnonKeyOverride: string;
  setSupabaseAnonKeyOverride: (val: string) => void;
  supabaseServiceRoleKeyOverride: string;
  setSupabaseServiceRoleKeyOverride: (val: string) => void;
  resendApiKeyOverride: string;
  setResendApiKeyOverride: (val: string) => void;
  mapboxTokenOverride: string;
  setMapboxTokenOverride: (val: string) => void;
}

export function SystemSettings({
  activeTab,
  user,
  schoolName,
  setSchoolName,
  schoolAddress,
  setSchoolAddress,
  schoolPhone,
  setSchoolPhone,
  schoolEmail,
  setSchoolEmail,
  currency,
  setCurrency,
  settings,
  updateSettings,

  vapidPublicKey,
  setVapidPublicKey,
  vapidPrivateKey,
  setVapidPrivateKey,
  vapidSubject,
  setVapidSubject,
  supabaseUrlOverride,
  setSupabaseUrlOverride,
  supabaseAnonKeyOverride,
  setSupabaseAnonKeyOverride,
  supabaseServiceRoleKeyOverride,
  setSupabaseServiceRoleKeyOverride,
  resendApiKeyOverride,
  setResendApiKeyOverride,
  mapboxTokenOverride,
  setMapboxTokenOverride
}: SystemSettingsProps) {
  // Local preferences state
  const [localLanguage, setLocalLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('APP_LANGUAGE') || 'English (US)';
    }
    return 'English (US)';
  });
  const [localTheme, setLocalTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('APP_THEME') || 'Light Mode';
    }
    return 'Light Mode';
  });

  const handleLanguageChange = (val: string) => {
    setLocalLanguage(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('APP_LANGUAGE', val);
    }
    toast.info(`Language set to ${val}. Changes will apply on reload.`);
  };

  const handleThemeChange = (val: string) => {
    setLocalTheme(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('APP_THEME', val);
      if (val === 'Dark Mode') {
        document.documentElement.classList.add('dark');
      } else if (val === 'Light Mode') {
        document.documentElement.classList.remove('dark');
      } else {
        // System Default
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
    toast.success(`Theme set to ${val}`);
  };

  // Color options
  const colorOptions = [
    { name: 'indigo', hex: '#4f46e5', label: 'Indigo' },
    { name: 'emerald', hex: '#10b981', label: 'Emerald' },
    { name: 'rose', hex: '#f43f5e', label: 'Rose' },
    { name: 'amber', hex: '#d97706', label: 'Amber' },
    { name: 'blue', hex: '#2563eb', label: 'Blue' },
    { name: 'violet', hex: '#7c3aed', label: 'Violet' },
    { name: 'teal', hex: '#0d9488', label: 'Teal' },
    { name: 'orange', hex: '#ea580c', label: 'Orange' },
    { name: 'slate', hex: '#475569', label: 'Slate' }
  ];

  return (
    <>
      {/* General & Preferences Tab */}
      {activeTab === 'general' && (
        <div className="p-6 sm:p-8 space-y-10">
          {/* Section 1: School Information */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">School Information</h3>
              <p className="text-sm text-muted-foreground mt-1">Manage general details and branding of your institution.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">School Name</label>
                <input 
                  type="text" 
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-medium" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">School Address</label>
                <input 
                  type="text" 
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-medium" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Phone Number</label>
                <input 
                  type="text" 
                  value={schoolPhone}
                  onChange={(e) => setSchoolPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-medium" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Email Address</label>
                <input 
                  type="email" 
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-medium" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">School Logo URL</label>
                <input 
                  type="text" 
                  placeholder="https://example.com/logo.png"
                  value={settings?.logo_url || ''}
                  onChange={(e) => updateSettings({ logo_url: e.target.value })}
                  className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-medium" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Currency</label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-medium"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="SDG">SDG (Sudanese Pound)</option>
                  <option value="AED">AED (Dirham)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="SAR">SAR (Riyal)</option>
                  <option value="EGP">EGP (Egyptian Pound)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Appearance & Styling Prefs */}
          <div className="pt-8 border-t border-border space-y-6">
            <div>
              <h3 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                <Palette size={20} className="text-primary" /> Appearance Configuration
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Fine-tune font-families, brand colors, and densities system-wide.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2"><LayoutGrid size={16} /> Academic Scheme</h4>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Grading Scale</label>
                  <select 
                    value={settings?.grading_scale || 'Standard (A-F)'}
                    onChange={(e) => updateSettings({ grading_scale: e.target.value })}
                    className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl outline-none text-foreground font-medium focus:ring-1 focus:ring-primary"
                  >
                    <option>Standard (A-F)</option>
                    <option>Percentage (0-100)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2"><Type size={16} /> Typography & Design</h4>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Font Family</label>
                  <select 
                    value={settings?.font_family || 'Inter (Default)'}
                    onChange={(e) => updateSettings({ font_family: e.target.value })}
                    className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl outline-none text-foreground font-medium focus:ring-1 focus:ring-primary"
                  >
                    <option>Inter (Default)</option>
                    <option>Roboto</option>
                    <option>Open Sans</option>
                    <option>JetBrains Mono</option>
                    <option>Playfair Display</option>
                  </select>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 space-y-4 pt-2">
                <label className="text-sm font-bold text-foreground">System Theme Color</label>
                <div className="flex flex-wrap gap-3 p-4 bg-muted/20 border border-border rounded-2xl">
                  {colorOptions.map(color => (
                    <button 
                      key={color.name} 
                      type="button" 
                      onClick={() => {
                        updateSettings({ theme_color: color.name });
                        toast.success(`${color.label} theme applied successfully!`);
                      }}
                      className="group relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all hover:scale-105 active:scale-95" 
                      style={{ 
                        backgroundColor: color.hex, 
                        borderColor: settings?.theme_color === color.name ? 'hsl(var(--foreground))' : 'transparent' 
                      }}
                      title={color.label}
                    >
                      {settings?.theme_color === color.name && (
                        <span className="absolute w-2 h-2 rounded-full bg-white shadow-md animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                  <div>
                    <p className="text-sm font-bold text-foreground">Compact Layout Design</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Compress padding, scale font ratios, and optimize screen real-estate.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings?.compact_design || false}
                    onChange={(e) => updateSettings({ compact_design: e.target.checked })}
                    className="w-5 h-5 rounded border-input text-primary accent-primary cursor-pointer" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: App Preferences (Personalized) */}
          <div className="pt-8 border-t border-border space-y-6">
            <div>
              <h3 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                <Languages size={20} className="text-primary" /> Application Preferences
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Personalize your regional display language and dark/light color preferences.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                  Language
                </label>
                <select 
                  value={localLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none transition-all font-medium text-foreground"
                >
                  <option>English (US)</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>Arabic</option>
                </select>
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                  Theme Preference
                </label>
                <select 
                  value={localTheme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none transition-all font-medium text-foreground"
                >
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
        <div className="p-6 sm:p-8 space-y-10">
          <div>
            <h3 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <ShieldAlert size={22} className="text-primary" /> Advanced System Configurations
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Fine-tune feature presence and push-alert infrastructure parameters safely.</p>
          </div>

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
                    <span className="font-bold text-foreground block">{config.label}</span>
                    <span className="text-xs text-muted-foreground mt-1 block leading-relaxed">{config.desc}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentVal = !!settings?.[config.id];
                    updateSettings({ [config.id]: !currentVal });
                    toast.success(`${config.label} set to ${!currentVal ? 'ENABLED' : 'DISABLED'}`);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${settings?.[config.id] ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.[config.id] ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>

          {/* VAPID & Push Setup Section */}
          <div className="pt-8 border-t border-border space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Key size={18} className="text-primary" /> Web Push & VAPID Setup
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Configure public-private credentials to power real-time browser push notifications.</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                (settings?.vapid_public_key && settings?.vapid_private_key) 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}>
                {(settings?.vapid_public_key && settings?.vapid_private_key) ? 'Configured' : 'Unconfigured'}
              </span>
            </div>

            <div className="space-y-4 p-5 bg-muted/20 border border-border rounded-xl">
              <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-sm font-bold text-foreground">VAPID Public Key</label>
                   <input 
                     type="text" 
                     placeholder="Enter VAPID Public Key"
                     value={vapidPublicKey}
                     onChange={(e) => setVapidPublicKey(e.target.value)}
                     className="w-full px-4 py-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary text-sm font-mono text-foreground" 
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-bold text-foreground">VAPID Private Key</label>
                   <input 
                     type="password" 
                     placeholder="Enter VAPID Private Key"
                     value={vapidPrivateKey}
                     onChange={(e) => setVapidPrivateKey(e.target.value)}
                     className="w-full px-4 py-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary text-sm font-mono text-foreground" 
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-bold text-foreground">VAPID Subject (mailto: URL)</label>
                   <input 
                     type="text" 
                     placeholder="mailto:admin@smartschool.com"
                     value={vapidSubject}
                     onChange={(e) => setVapidSubject(e.target.value)}
                     className="w-full px-4 py-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary text-sm font-mono text-foreground" 
                   />
                 </div>
               </div>
 
               {/* Instructions guide inside panel */}
               <div className="pt-4 border-t border-border mt-4 flex gap-3 text-xs text-muted-foreground">
                 <HelpCircle size={16} className="text-primary shrink-0 mt-0.5" />
                 <div className="space-y-1">
                   <p className="font-semibold text-foreground">How to generate push identifiers:</p>
                   <p>In your local project terminal, run the command below to generate fresh, custom key pairs:</p>
                   <kbd className="inline-block px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono text-foreground">
                     npx web-push generate-vapid-keys
                   </kbd>
                 </div>
               </div>
             </div>
           </div>
 
           {/* Cloud APIs & Third-Party Integrations Setup */}
           <div className="pt-8 border-t border-border space-y-6">
             <div>
               <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                 <Globe size={18} className="text-primary" /> Third-Party Integrations & APIs
               </h3>
               <p className="text-xs text-muted-foreground mt-0.5">Customize your integrations. Settings entered below will override standard system environmental defaults safely.</p>
             </div>
 
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-muted/20 border border-border rounded-2xl">
               <div className="space-y-4 col-span-1 md:col-span-2">
                 <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                   <Database size={16} className="text-blue-500" /> Supabase Connection (Override)
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-foreground">Supabase Project URL</label>
                     <input 
                       type="text" 
                       placeholder="https://your-project.supabase.co"
                       value={supabaseUrlOverride}
                       onChange={(e) => setSupabaseUrlOverride(e.target.value)}
                       className="w-full px-4 py-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary text-xs font-mono text-foreground" 
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-foreground">Anon API Key</label>
                     <input 
                       type="password" 
                       placeholder="eyJhbGciOi..."
                       value={supabaseAnonKeyOverride}
                       onChange={(e) => setSupabaseAnonKeyOverride(e.target.value)}
                       className="w-full px-4 py-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary text-xs font-mono text-foreground" 
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-foreground">Service Role Key</label>
                     <input 
                       type="password" 
                       placeholder="Overrides RLS Bypass key"
                       value={supabaseServiceRoleKeyOverride}
                       onChange={(e) => setSupabaseServiceRoleKeyOverride(e.target.value)}
                       className="w-full px-4 py-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary text-xs font-mono text-foreground" 
                     />
                   </div>
                 </div>
               </div>
 
               <div className="space-y-4">
                 <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                   <Mail size={16} className="text-amber-500" /> Email Service (Resend)
                 </h4>
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-foreground">Resend API Key</label>
                   <input 
                     type="password" 
                     placeholder="re_xxxxxxxx"
                     value={resendApiKeyOverride}
                     onChange={(e) => setResendApiKeyOverride(e.target.value)}
                     className="w-full px-4 py-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary text-xs font-mono text-foreground" 
                   />
                 </div>
               </div>
 
               <div className="space-y-4">
                 <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                   <Navigation size={16} className="text-emerald-500" /> Map Coordinates (Mapbox)
                 </h4>
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-foreground">Mapbox Access Token</label>
                   <input 
                     type="password" 
                     placeholder="pk.ey..."
                     value={mapboxTokenOverride}
                     onChange={(e) => setMapboxTokenOverride(e.target.value)}
                     className="w-full px-4 py-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary text-xs font-mono text-foreground" 
                   />
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
