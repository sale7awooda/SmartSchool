'use client';

import React, { useState } from 'react';
import { Camera, User, Mail, Smartphone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { User as UserType } from '@/types';

interface SecuritySettingsProps {
  activeTab: 'profile' | 'notifications';
  user: UserType;
  profileName: string;
  setProfileName: (val: string) => void;
  profileEmail: string;
  setProfileEmail: (val: string) => void;
  profilePhone: string;
  setProfilePhone: (val: string) => void;
  changePasswordAction: (password: string) => Promise<{ success: boolean, message?: string }>;
}

export function SecuritySettings({
  activeTab,
  user,
  profileName,
  setProfileName,
  profileEmail,
  setProfileEmail,
  profilePhone,
  setProfilePhone,
  changePasswordAction
}: SecuritySettingsProps) {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await changePasswordAction(newPassword);
      if (res.success) {
        toast.success('Password updated successfully');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error('Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };
  return (
    <>
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

          <div className="pt-8 mt-8 border-t border-border space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">Change Password</h3>
              <p className="text-sm text-muted-foreground">Ensure your account is using a long, random password to stay secure.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground" 
                />
              </div>
            </div>
            <button 
              type="button"
              onClick={handlePasswordChange}
              disabled={isChangingPassword}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
            >
              {isChangingPassword ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
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
    </>
  );
}
