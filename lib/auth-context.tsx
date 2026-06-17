'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from './supabase/client';
import { User } from '@/types';
import { isDevMode } from '@/lib/config';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string, isQuickLogin?: boolean) => Promise<void>;
  logout: () => void;
  switchStudent: (studentId: string) => void;
  isLoading: boolean;
}

import { lookupStudentEmailsByParentEmail, bootstrapUserProfile, resolveUserEmailAction, autoProvisionUserAuthAction } from '@/app/actions/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const getProfile = async (sessionUser: any) => {
      if (!sessionUser) return null;

      let { data: profile } = await supabase
        .from('users')
        .select('*, parent_student(student_id)')
        .eq('id', sessionUser.id)
        .maybeSingle();
      
      if (profile && profile.role === 'parent') {
        const { data: parentData } = await supabase
          .from('parent_student')
          .select('student_id, students(id, name)')
          .eq('parent_id', sessionUser.id);

        const rawStudents = (parentData || []).map((ps: any) => ps.students).filter(Boolean);
        const uniqueStudentsMap = new Map();
        rawStudents.forEach((student: any) => {
          if (student && student.id) uniqueStudentsMap.set(student.id, student);
        });
        profile.students = Array.from(uniqueStudentsMap.values());
        profile.studentIds = profile.students.map((s: any) => s.id);
        profile.studentId = profile.studentIds[0] || undefined;
      } else if (profile && profile.role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle();
        profile.studentId = studentData?.id;
      }
      delete profile?.parent_student;
      
      // Bootstrap missing users or missing role-specific records (especially for students/parents)
      if (!profile || (profile.role === 'student' && !profile.studentId)) {
        let role = profile?.role || 'parent';
        const email = sessionUser.email || '';
        
        if (!profile?.role) {
          if (email === 'sale7awooda@gmail.com') role = 'super_admin';
          else if (email.startsWith('admin')) role = 'admin';
          else if (email.startsWith('teacher')) role = 'teacher';
          else if (email.startsWith('accountant')) role = 'accountant';
          else if (email.startsWith('staff')) role = 'staff';
          else if (email.startsWith('student')) role = 'student';
        }

        const newProfile = {
          id: sessionUser.id,
          email: email,
          name: profile?.name || sessionUser.user_metadata?.name || email.split('@')[0],
          role: role
        };

        try {
          const updatedProfile = await bootstrapUserProfile({
            id: sessionUser.id,
            email: email,
            name: profile?.name || sessionUser.user_metadata?.name || email.split('@')[0]
          });
          if (updatedProfile) {
            profile = updatedProfile;
            // Refresh student data if it was bootstrapped
            if (profile.role === 'student' && !profile.studentId) {
                const { data: studentData } = await supabase
                  .from('students')
                  .select('id')
                  .eq('user_id', profile.id)
                  .maybeSingle();
                profile.studentId = studentData?.id;
            }
          } else if (!profile) {
            profile = newProfile;
          }
        } catch (bootstrapError) {
          console.error("Failed to bootstrap user on server:", bootstrapError);
          if (!profile) profile = newProfile; // Fallback to allow login
        }
      } else {
        // Ensure primary admin always has super_admin role
        const PRIMARY_ADMIN_EMAIL = 'sale7awooda@gmail.com';
        if (sessionUser.email === PRIMARY_ADMIN_EMAIL && profile.role !== 'super_admin') {
          const { data: updatedProfile } = await supabase
            .from('users')
            .update({ role: 'super_admin', school_id: null })
            .eq('id', sessionUser.id)
            .select()
            .maybeSingle();
          if (updatedProfile) profile = updatedProfile;
        }
      }

      if (profile && profile.role === 'parent' && !profile.students) {
        const { data: parentData } = await supabase
          .from('parent_student')
          .select('student_id, students(id, name)')
          .eq('parent_id', profile.id);
          
        const rawStudents = (parentData || []).map((ps: any) => ps.students).filter(Boolean);
        const uniqueStudentsMap = new Map();
        rawStudents.forEach((student: any) => {
          if (student && student.id) uniqueStudentsMap.set(student.id, student);
        });
        profile.students = Array.from(uniqueStudentsMap.values());
        profile.studentIds = profile.students.map((s: any) => s.id);
        profile.studentId = profile.studentIds[0] || undefined;
      }

      return profile as User;
    };

    let mounted = true;

    const loadProfile = async (session: any) => {
      if (!session?.user) {
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const profile = await getProfile(session.user);
        if (mounted) {
          setUser(profile);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        if (error.message?.includes('Lock broken')) {
          console.warn("Session fetch aborted (lock stolen). Ignoring.");
          return;
        }
        console.error("Error getting session:", error);
        if (error.message?.includes("Refresh Token") || error.message?.includes("Failed to fetch")) {
          supabase.auth.signOut().catch(console.error);
        }
      }
      loadProfile(session);
    }).catch((err) => {
      if (err?.name === 'AbortError' || err?.message?.includes('Lock broken') || err?.message?.includes('steal')) {
        console.warn("Session fetch aborted (lock stolen). Ignoring.");
        return;
      }
      console.error("Session fetch caught error:", err);
      loadProfile(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === 'INITIAL_SESSION') return; // Handled by getSession
      
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        if (!userRef.current) {
          setIsLoading(true);
        }
      }
      
      loadProfile(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/super-admin'))) {
        router.push('/');
      } else if (user && pathname === '/') {
        router.push(user.role === 'super_admin' ? '/super-admin' : '/dashboard');
      } else if (user && user.role === 'super_admin' && pathname.startsWith('/dashboard')) {
        router.push('/super-admin');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password = 'password123', isQuickLogin = false) => {
    let loginEmail = email.trim().toLowerCase();

    // 1. Try resolving using resolveUserEmailAction first (student roll number, parent phone, parent email, etc.)
    try {
      const dbResolved = await resolveUserEmailAction(email);
      if (dbResolved && dbResolved.email) {
        loginEmail = dbResolved.email.toLowerCase();
      }
    } catch (err) {
      console.warn("Could not resolve identifier server-side:", err);
    }

    // Fallback if email is still not standard email-like
    if (!loginEmail.includes('@')) {
      loginEmail = `${loginEmail.toLowerCase()}@smartschool.com`;
    }

    // 2. Perform authentication via signInWithPassword
    let { error, data } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    // 3. Fallback server-side auto-provisioning exclusively for quick logins (dev only)
    if (isQuickLogin && isDevMode() && error && error.message.includes("Invalid login credentials")) {
      try {
        const provisionRes = await autoProvisionUserAuthAction(email, password);
        if (provisionRes && provisionRes.success && provisionRes.email) {
          // Re-attempt sign-in with the guaranteed-aligned email and the verified password!
          const retryRes = await supabase.auth.signInWithPassword({
            email: provisionRes.email,
            password,
          });
          if (!retryRes.error) {
            error = null;
          } else {
            error = retryRes.error;
          }
        }
      } catch (provisionErr) {
        console.error("Server-side auto-provisioning healing failed:", provisionErr);
      }
    }

    if (error && error.message.includes("Invalid login credentials") && loginEmail.includes('@')) {
      try {
        const studentEmails = await lookupStudentEmailsByParentEmail(loginEmail);
        let studentSuccess = false;
        
        for (const studentEmail of studentEmails) {
          const attempt = await supabase.auth.signInWithPassword({
            email: studentEmail,
            password
          });
          if (!attempt.error && attempt.data.user) {
            studentSuccess = true;
            error = null;
            break;
          }
        }
      } catch (err) {
        console.error("Failed to lookup student fallbacks", err);
      }
    }

    if (error) {
      throw new Error(error.message);
    }
    
    setIsLoading(true);
    router.push('/');
    // Login will redirect to correct path after profile loads (see useEffect above)
  };

  const switchStudent = (studentId: string) => {
    if (user && user.role === 'parent') {
      const updatedUser = { ...user, studentId };
      setUser(updatedUser);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, switchStudent, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
