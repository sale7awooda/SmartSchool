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
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        let { data: profile, error } = await supabase
          .from('users')
          .select('*, parent_student(student_id)')
          .eq('id', session.user.id)
          .single();
        
        if (profile && profile.role === 'parent') {
          profile.studentIds = profile.parent_student?.map((ps: any) => ps.student_id) || [];
          profile.studentId = profile.studentIds[0] || undefined;
        }
        delete profile?.parent_student;
        
        // Bootstrap roles for demo accounts
        const demoRoles: Record<string, string> = {
          'sale7awooda@gmail.com': 'admin',
          'admin@smartschool.com': 'admin',
          'staff@smartschool.com': 'staff',
          'teacher@smartschool.com': 'teacher',
          'accountant@smartschool.com': 'accountant',
          'parent@smartschool.com': 'parent',
          'student@smartschool.com': 'student'
        };

        const expectedRole = session.user.email ? demoRoles[session.user.email] : undefined;
        
        if (expectedRole && (!profile || profile.role !== expectedRole)) {
          // Force it locally so the UI works immediately
          if (profile) {
            profile.role = expectedRole;
            profile.name = profile.name || session.user.user_metadata?.name || expectedRole.charAt(0).toUpperCase() + expectedRole.slice(1);
          } else {
            profile = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name || expectedRole.charAt(0).toUpperCase() + expectedRole.slice(1),
              role: expectedRole
            };
          }

          // Attempt to update the database (may fail if RLS prevents users from updating their own role)
          const { data: updatedProfile } = await supabase
            .from('users')
            .upsert({
              id: session.user.id,
              email: session.user.email,
              name: profile.name,
              role: expectedRole
            })
            .select()
            .single();
          
          if (updatedProfile) {
            profile = updatedProfile;
          }
          
          // Re-fetch parent_student if role is parent
          if (profile.role === 'parent') {
            const { data: parentData } = await supabase
              .from('parent_student')
              .select('student_id')
              .eq('parent_id', profile.id);
              
            profile.studentIds = parentData?.map((ps: any) => ps.student_id) || [];
            profile.studentId = profile.studentIds[0] || undefined;
          }
        }
        
        if (profile) {
          setUser(profile as User);
        }
      }
      setIsLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (session?.user) {
        let { data: profile } = await supabase
          .from('users')
          .select('*, parent_student(student_id)')
          .eq('id', session.user.id)
          .single();
        
        if (profile && profile.role === 'parent') {
          profile.studentIds = profile.parent_student?.map((ps: any) => ps.student_id) || [];
          profile.studentId = profile.studentIds[0] || undefined;
        }
        delete profile?.parent_student;
        
        // Bootstrap roles for demo accounts
        const demoRoles: Record<string, string> = {
          'sale7awooda@gmail.com': 'admin',
          'admin@smartschool.com': 'admin',
          'staff@smartschool.com': 'staff',
          'teacher@smartschool.com': 'teacher',
          'accountant@smartschool.com': 'accountant',
          'parent@smartschool.com': 'parent',
          'student@smartschool.com': 'student'
        };

        const expectedRole = session.user.email ? demoRoles[session.user.email] : undefined;
        
        if (expectedRole && (!profile || profile.role !== expectedRole)) {
          // Force it locally so the UI works immediately
          if (profile) {
            profile.role = expectedRole;
            profile.name = profile.name || session.user.user_metadata?.name || expectedRole.charAt(0).toUpperCase() + expectedRole.slice(1);
          } else {
            profile = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name || expectedRole.charAt(0).toUpperCase() + expectedRole.slice(1),
              role: expectedRole
            };
          }

          // Attempt to update the database (may fail if RLS prevents users from updating their own role)
          const { data: updatedProfile } = await supabase
            .from('users')
            .upsert({
              id: session.user.id,
              email: session.user.email,
              name: profile.name,
              role: expectedRole
            })
            .select()
            .single();
          
          if (updatedProfile) {
            profile = updatedProfile;
          }
          
          // Re-fetch parent_student if role is parent
          if (profile.role === 'parent') {
            const { data: parentData } = await supabase
              .from('parent_student')
              .select('student_id')
              .eq('parent_id', profile.id);
              
            profile.studentIds = parentData?.map((ps: any) => ps.student_id) || [];
            profile.studentId = profile.studentIds[0] || undefined;
          }
        }

        if (profile) {
          setUser(profile as User);
        }
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
