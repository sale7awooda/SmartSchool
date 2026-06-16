'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { getUsers } from '@/lib/supabase-db';
import { adminResetUserPasswordAction, adminBulkResetPasswordsAction } from '@/app/actions/users';
import { Search, KeyRound, User, Loader2, ShieldAlert, CheckCircle, HelpCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface UsersSettingsProps {
  activeTab: string;
}

export function UsersSettings({ activeTab }: UsersSettingsProps) {
  const { data: users, mutate, isLoading } = useSWR(activeTab === 'users' ? 'users_list' : null, getUsers);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Bulk operation states
  const [bulkRole, setBulkRole] = useState<'student' | 'parent'>('student');
  const [bulkPassword, setBulkPassword] = useState('');
  const [showBulkPassword, setShowBulkPassword] = useState(false);
  const [isBulkResetting, setIsBulkResetting] = useState(false);
  const [bulkConfirmChecked, setBulkConfirmChecked] = useState(false);

  if (activeTab !== 'users') return null;

  // Filter students and parents primarily as requested
  const filteredUsers = (users || []).filter(u => {
    const matchesRole = u.role === 'student' || u.role === 'parent';
    const matchesSearch = 
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleBulkResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkPassword || bulkPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (!bulkConfirmChecked) {
      toast.error('You must confirm that you understand this action will overwrite all passwords');
      return;
    }

    setIsBulkResetting(true);
    const toastId = toast.loading(`Resetting passwords for all ${bulkRole}s...`);
    try {
      const res = await adminBulkResetPasswordsAction(bulkRole, bulkPassword);
      if (res.success) {
        toast.success(res.message || `All ${bulkRole} passwords have been updated!`, { id: toastId });
        setTxPassword();
        setBulkPassword('');
        setBulkConfirmChecked(false);
        mutate();
      } else {
        toast.error(res.message || `Failed to reset passwords for ${bulkRole}s`, { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'An unexpected error occurred during bulk reset', { id: toastId });
    } finally {
      setIsBulkResetting(false);
    }
  };

  const setTxPassword = () => {
    // optional helper
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsResetting(true);
    const toastId = toast.loading(`Resetting password for ${selectedUser.name}...`);
    try {
      const res = await adminResetUserPasswordAction(selectedUser.id, newPassword);
      if (res.success) {
        toast.success(`Password for ${selectedUser.name} has been updated successfully!`, { id: toastId });
        // Reset states
        setSelectedUser(null);
        setNewPassword('');
      } else {
        toast.error(res.message || 'Failed to update user password', { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'An unexpected error occurred during password reset', { id: toastId });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="border-b border-border pb-4">
        <h3 className="text-xl font-bold text-foreground">Users & Password Reset</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Search students and parents and reset their account passwords securely without old credential validation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* User Search List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search student or parent by name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading directory...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-muted/20">
              <User className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground font-semibold">No students or parents found</p>
              <p className="text-xs text-muted-foreground mt-1">Try refining your search text</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {filteredUsers.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setNewPassword('');
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-primary/5 border-primary shadow-sm'
                        : 'bg-card border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                        u.role === 'parent' 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        {u.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        u.role === 'parent' 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reset Panel */}
        <div className="lg:col-span-5 space-y-6">
          {selectedUser ? (
            <form onSubmit={handleResetPassword} className="border border-border rounded-2xl bg-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <KeyRound className="text-primary w-5 h-5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Reset Password for:</h4>
                    <p className="text-xs text-muted-foreground font-semibold truncate max-w-[150px] sm:max-w-xs">{selectedUser.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted font-mono border border-border px-2 py-1 rounded-md"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter security password (6+ chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-4 pr-11 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isResetting || !newPassword}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  {isResetting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Performing Reset...
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      Overwrite Account Password
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="border border-dashed border-border rounded-2xl p-6 text-center bg-muted/5 flex flex-col items-center justify-center min-h-[140px]">
              <KeyRound className="w-8 h-8 text-muted-foreground mb-2 opacity-40" />
              <p className="text-sm font-bold text-foreground">Select a Student or Parent</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Select any user from the left to reset their individual account password.
              </p>
            </div>
          )}



          {/* Bulk Reset Block */}
          <form onSubmit={handleBulkResetPassword} className="border border-border rounded-2xl bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <ShieldAlert className="text-red-500 w-5 h-5 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-foreground">Bulk Password Reset</h4>
                <p className="text-xs text-muted-foreground font-medium">Force update all students or all parents at once.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setBulkRole('student')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    bulkRole === 'student'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Students
                </button>
                <button
                  type="button"
                  onClick={() => setBulkRole('parent')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    bulkRole === 'parent'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Parents
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Common New Password</label>
                <div className="relative">
                  <input
                    type={showBulkPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter massive override password"
                    value={bulkPassword}
                    onChange={(e) => setBulkPassword(e.target.value)}
                    className="w-full pl-4 pr-11 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBulkPassword(!showBulkPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground outline-none"
                  >
                    {showBulkPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 p-3 rounded-xl transition-all">
                <input
                  type="checkbox"
                  id="bulkConfirmChecked"
                  checked={bulkConfirmChecked}
                  onChange={(e) => setBulkConfirmChecked(e.target.checked)}
                  className="mt-0.5 rounded border-red-500/20 text-red-500 focus:ring-red-500/20 cursor-pointer"
                />
                <label htmlFor="bulkConfirmChecked" className="text-[11px] font-semibold text-foreground/80 leading-normal cursor-pointer select-none">
                  I understand this will force-reset the password for <span className="font-bold text-red-500">every single {bulkRole}</span> in the school.
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isBulkResetting || !bulkPassword || !bulkConfirmChecked}
              className="w-full px-4 py-3 bg-red-500 hover:bg-red-500/90 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
            >
              {isBulkResetting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing Bulk Reset...
                </>
              ) : (
                <>
                  <ShieldAlert size={16} />
                  Execute Bulk Reset for All {bulkRole === 'student' ? 'Students' : 'Parents'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
