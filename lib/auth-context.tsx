'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from './supabase/client';
import { User } from './mock-db';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  switchStudent: (studentId: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const getProfile = async (sessionUser: any) => {
      if (!sessionUser) return null;

      let { data: profile } = await supabase
        .from('users')
        .select('*, parent_student(student_id)')
        .eq('id', sessionUser.id)
        .single();
      
      if (profile && profile.role === 'parent') {
        profile.studentIds = profile.parent_student?.map((ps: any) => ps.student_id) || [];
        profile.studentId = profile.studentIds[0] || undefined;
      } else if (profile && profile.role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', profile.id)
          .single();
        profile.studentId = studentData?.id;
      }
      delete profile?.parent_student;
      
      // Bootstrap roles for primary admin
      const PRIMARY_ADMIN_EMAIL = 'sale7awooda@gmail.com';
      const isPrimaryAdmin = sessionUser.email === PRIMARY_ADMIN_EMAIL;
      
      if (isPrimaryAdmin && (!profile || profile.role !== 'admin')) {
        const adminProfile = {
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.user_metadata?.name || 'Admin User',
          role: 'admin'
        };

        // Attempt to update the database
        const { data: updatedProfile } = await supabase
          .from('users')
          .upsert(adminProfile)
          .select()
          .single();
        
        if (updatedProfile) {
          profile = updatedProfile;
        } else if (!profile) {
          profile = adminProfile;
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

    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await getProfile(session.user);
        setUser(profile);
      }
      setIsLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      setIsLoading(true);
      if (session?.user) {
        const profile = await getProfile(session.user);
        setUser(profile);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
