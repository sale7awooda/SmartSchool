'use client';

import React, { useState } from 'react';
import { Camera, User, Mail, Smartphone, Loader2, Bell, BellOff } from 'lucide-react';
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
        <PushNotificationSetup user={user} />
      )}
    </>
  );
}

function PushNotificationSetup({ user }: { user: UserType }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setIsSubscribed(!!sub))
      );
    } else {
      setIsSupported(false);
    }
  }, []);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      if (isSubscribed) {
        const { unsubscribeUserFromPush } = await import('@/lib/push-notifications');
        await unsubscribeUserFromPush();
        setIsSubscribed(false);
        toast.success('Push notifications disabled');
      } else {
        const { subscribeUserToPush } = await import('@/lib/push-notifications');
        await subscribeUserToPush({ id: user.id, name: user.name, role: user.role });
        setIsSubscribed(true);
        toast.success('Push notifications enabled — you will receive alerts even when the app is closed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">Notification Preferences</h3>
        <p className="text-sm text-muted-foreground">Choose what updates you want to receive and how.</p>
      </div>

      <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSubscribed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
              {isSubscribed ? <Bell size={20} /> : <BellOff size={20} />}
            </div>
            <div>
              <p className="font-bold text-foreground">Push Notifications</p>
              <p className="text-xs text-muted-foreground">
                {isSubscribed
                  ? 'You will receive notifications even when the app is closed'
                  : 'Enable to get alerts on your device'}
              </p>
            </div>
          </div>
          {isSupported ? (
            <button
              type="button"
              onClick={handleToggle}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                isSubscribed
                  ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              {isSubscribed ? 'Disable' : 'Enable'}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">Not supported on this browser</span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {[
          { title: 'Academic Updates', desc: 'Grades, assignments, and report cards' },
          { title: 'Attendance Alerts', desc: 'Absences and tardiness notifications' },
          { title: 'Fee Reminders', desc: 'Upcoming due dates and payment confirmations' },
          { title: 'School Notices', desc: 'General announcements and events' },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div>
              <p className="font-bold text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-input text-primary focus:ring-primary" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
