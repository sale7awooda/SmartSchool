'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from './supabase/client';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  switchStudent: (studentId: string) => void;
  isLoading: boolean;
}

import { lookupStudentEmailsByParentEmail } from '@/app/actions/auth';

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
        profile.studentIds = profile.parent_student?.map((ps: any) => ps.student_id) || [];
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
      
      // Bootstrap missing users (especially for MVP demo accounts)
      if (!profile) {
        let role = 'parent';
        const email = sessionUser.email || '';
        
        if (email === 'sale7awooda@gmail.com' || email.startsWith('admin')) role = 'admin';
        else if (email.startsWith('teacher')) role = 'teacher';
        else if (email.startsWith('accountant')) role = 'accountant';
        else if (email.startsWith('staff')) role = 'staff';
        else if (email.startsWith('student')) role = 'student';

        const newProfile = {
          id: sessionUser.id,
          email: email,
          name: sessionUser.user_metadata?.name || email.split('@')[0],
          role: role
        };

        const { data: updatedProfile, error: upsertError } = await supabase
          .from('users')
          .upsert(newProfile)
          .select()
          .maybeSingle();
        
        if (updatedProfile) {
          profile = updatedProfile;
        } else {
          console.error("Failed to bootstrap user:", upsertError);
          profile = newProfile; // Fallback to allow login
        }
      } else {
        // Ensure primary admin always has admin role
        const PRIMARY_ADMIN_EMAIL = 'sale7awooda@gmail.com';
        if (sessionUser.email === PRIMARY_ADMIN_EMAIL && profile.role !== 'admin') {
          const { data: updatedProfile } = await supabase
            .from('users')
            .update({ role: 'admin' })
            .eq('id', sessionUser.id)
            .select()
            .maybeSingle();
          if (updatedProfile) profile = updatedProfile;
        }
      }

      if (profile && profile.role === 'parent' && !profile.studentIds) {
        const { data: parentData } = await supabase
          .from('parent_student')
          .select('student_id')
          .eq('parent_id', profile.id);
          
        profile.studentIds = parentData?.map((ps: any) => ps.student_id) || [];
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
        console.error("Error getting session:", error);
        if (error.message?.includes("Refresh Token") || error.message?.includes("Failed to fetch")) {
          supabase.auth.signOut().catch(console.error);
        }
      }
      loadProfile(session);
    }).catch((err) => {
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
      if (!user && pathname.startsWith('/dashboard')) {
        router.push('/');
      } else if (user && pathname === '/') {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password = 'password123') => {
    let { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error && error.message.includes("Invalid login credentials")) {
      try {
        const studentEmails = await lookupStudentEmailsByParentEmail(email);
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
    
    router.push('/dashboard');
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
