'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/logo';
import { GraduationCap, UserCircle, Users, ArrowRight, Loader2, ShieldCheck, BookOpen, Calculator } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick login helper for the MVP demo
  const handleQuickLogin = async (role: string) => {
    setError('');
    setIsLoading(true);
    try {
      if (role === 'admin') await login('admin@smartschool.com', 'Admin@123');
      else if (role === 'staff') await login('staff@smartschool.com', 'staff@123');
      else if (role === 'teacher') await login('teacher@smartschool.com', 'Teacher@123');
      else if (role === 'accountant') await login('accountant@smartschool.com', 'Accountant@123');
      else if (role === 'parent') await login('parent@smartschool.com', 'Parent@123');
      else if (role === 'student') await login('student@smartschool.com', 'Student@123');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-8 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-slate-50 rounded-b-[3rem] sm:rounded-b-[5rem] -z-10" />
      <div className="absolute top-10 left-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
      <div className="absolute top-40 right-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md z-10">
        {/* Logo & Header */}
        <div className="text-center mb-12 relative">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex flex-col items-center gap-6 group cursor-default"
          >
            <div className="relative">
              {/* Floating Elements - Moved to be around the text */}
              <motion.div 
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 10, 0]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-12 -right-8 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary border border-primary/10 z-20"
              >
                <GraduationCap size={24} />
              </motion.div>
              
              <motion.div 
                animate={{ 
                  y: [0, 10, 0],
                  rotate: [0, -10, 0]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -bottom-8 -left-12 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-emerald-500 border border-emerald-500/10 z-20"
              >
                <BookOpen size={20} />
              </motion.div>

              <Logo withText size={100} className="flex-col gap-5 text-center" />
            </div>
          </motion.div>
        </div>

        {/* Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-[2rem] shadow-2xl border border-border overflow-hidden"
        >
          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@school.com"
                    className="w-full px-4 py-4 rounded-xl border border-input bg-background focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-foreground">Password</label>
                    <a href="#" className="text-xs font-medium text-primary hover:text-primary/80">Forgot?</a>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-4 rounded-xl border border-input bg-background focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20 flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 shadow-md shadow-primary/20 mt-2"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    Sign In to Dashboard
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>

        {/* Quick Login Helper for MVP */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">MVP Quick Login</span>
            <div className="h-px bg-border flex-1" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleQuickLogin('admin')}
              disabled={isLoading}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <ShieldCheck size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Admin</p>
                <p className="text-[10px] font-medium text-muted-foreground">Full Access</p>
              </div>
            </button>
            
            <button 
              onClick={() => handleQuickLogin('teacher')}
              disabled={isLoading}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-emerald-500/50 hover:shadow-sm transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                <BookOpen size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Teacher</p>
                <p className="text-[10px] font-medium text-muted-foreground">Attendance</p>
              </div>
            </button>
            
            <button 
              onClick={() => handleQuickLogin('accountant')}
              disabled={isLoading}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-amber-500/50 hover:shadow-sm transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                <Calculator size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Accountant</p>
                <p className="text-[10px] font-medium text-muted-foreground">Fees & Billing</p>
              </div>
            </button>
            
            <button 
              onClick={() => handleQuickLogin('parent')}
              disabled={isLoading}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-purple-500/50 hover:shadow-sm transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                <Users size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Parent</p>
                <p className="text-[10px] font-medium text-muted-foreground">Student View</p>
              </div>
            </button>

            <button 
              onClick={() => handleQuickLogin('student')}
              disabled={isLoading}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <GraduationCap size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Student</p>
                <p className="text-[10px] font-medium text-muted-foreground">Take Exams</p>
              </div>
            </button>

            <button 
              onClick={() => handleQuickLogin('staff')}
              disabled={isLoading}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-slate-500/50 hover:shadow-sm transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-500/10 text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-slate-500/20 transition-colors">
                <UserCircle size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Staff</p>
                <p className="text-[10px] font-medium text-muted-foreground">Support</p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
