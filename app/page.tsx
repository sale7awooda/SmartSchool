'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/logo';
import { GraduationCap, UserCircle, Users, ArrowRight, Loader2, ShieldCheck, BookOpen, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginPage() {
  const [loginType, setLoginType] = useState<'staff' | 'parent'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginStaff, loginParent } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (loginType === 'staff') {
        await loginStaff(email);
      } else {
        await loginParent(studentId, phone);
      }
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
      if (role === 'admin') await loginStaff('admin@school.com');
      else if (role === 'teacher') await loginStaff('teacher@school.com');
      else if (role === 'accountant') await loginStaff('accountant@school.com');
      else if (role === 'parent') await loginParent('STU001', '555-0123');
      else if (role === 'student') await loginStaff('student@school.com');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-8 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-primary rounded-b-[3rem] sm:rounded-b-[5rem] -z-10" />
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute top-40 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md z-10">
        {/* Logo & Header */}
        <div className="text-center mb-0 relative">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative inline-flex items-center justify-center w-32 h-32 rounded-[2.5rem] bg-card shadow-xl mb-2 p-4 group cursor-default"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl group-hover:bg-primary/40 transition-all duration-500 -z-10" />
            
            {/* Floating Elements */}
            <motion.div 
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-2 -right-2 w-10 h-10 bg-card rounded-xl shadow-md flex items-center justify-center text-primary"
            >
              <GraduationCap size={20} />
            </motion.div>
            <motion.div 
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-2 -left-2 w-8 h-8 bg-card rounded-lg shadow-md flex items-center justify-center text-emerald-500"
            >
              <BookOpen size={16} />
            </motion.div>

            <Logo className="w-full h-full transform group-hover:scale-110 transition-transform duration-500" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <h1 className="text-4xl font-black text-primary-foreground tracking-tighter mb-1">Smart School</h1>
            <div className="inline-block px-3 py-1 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 backdrop-blur-sm">
              <p className="text-primary-foreground text-[10px] font-bold tracking-wider uppercase">Your digital campus, simplified.</p>
            </div>
          </motion.div>
        </div>

        {/* Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-[2rem] shadow-xl border border-border overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex p-2 bg-muted/50 border-b border-border">
            <button
              onClick={() => { setLoginType('staff'); setError(''); }}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 rounded-xl transition-all ${
                loginType === 'staff' 
                  ? 'bg-card text-primary shadow-sm ring-1 ring-border' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <UserCircle size={18} />
              Staff & Admin
            </button>
            <button
              onClick={() => { setLoginType('parent'); setError(''); }}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 rounded-xl transition-all ${
                loginType === 'parent' 
                  ? 'bg-card text-primary shadow-sm ring-1 ring-border' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Users size={18} />
              Parents
            </button>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait">
                {loginType === 'staff' ? (
                  <motion.div
                    key="staff"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@school.com"
                        className="w-full px-4 py-3.5 rounded-xl border border-input bg-background focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground"
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
                        className="w-full px-4 py-3.5 rounded-xl border border-input bg-background focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="parent"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Student ID</label>
                      <input
                        type="text"
                        required
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="e.g. STU001"
                        className="w-full px-4 py-3.5 rounded-xl border border-input bg-background focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Registered Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 5551234"
                        className="w-full px-4 py-3.5 rounded-xl border border-input bg-background focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
          </div>
        </motion.div>
      </div>
    </div>
  );
}
