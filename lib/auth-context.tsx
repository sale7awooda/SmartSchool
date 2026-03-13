'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MOCK_USERS, MOCK_PARENTS, User } from './mock-db';

interface AuthContextType {
  user: User | null;
  loginStaff: (email: string) => Promise<void>;
  loginParent: (studentId: string, phone: string) => Promise<void>;
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
    // Check local storage for mocked session
    const storedUser = localStorage.getItem('school_mvp_user');
    if (storedUser) {
      // Using a timeout to avoid synchronous setState warning
      setTimeout(() => setUser(JSON.parse(storedUser)), 0);
    }
    setTimeout(() => setIsLoading(false), 0);
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

  const loginStaff = async (email: string) => {
    // Mock API delay
    await new Promise((resolve) => setTimeout(resolve, 600));
    const foundUser = MOCK_USERS.find((u) => u.email === email);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('school_mvp_user', JSON.stringify(foundUser));
      router.push('/dashboard');
    } else {
      throw new Error('Invalid email or password');
    }
  };

  const loginParent = async (studentId: string, phone: string) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const foundParent = MOCK_PARENTS.find(
      (p) => p.studentIds?.includes(studentId) && p.phone === phone
    );
    if (foundParent) {
      const activeUser = { ...foundParent, studentId }; // Set the active studentId
      setUser(activeUser);
      localStorage.setItem('school_mvp_user', JSON.stringify(activeUser));
      router.push('/dashboard');
    } else {
      throw new Error('Invalid Student ID or Phone Number');
    }
  };

  const switchStudent = (studentId: string) => {
    if (user && user.role === 'parent' && user.studentIds?.includes(studentId)) {
      const updatedUser = { ...user, studentId };
      setUser(updatedUser);
      localStorage.setItem('school_mvp_user', JSON.stringify(updatedUser));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('school_mvp_user');
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loginStaff, loginParent, logout, switchStudent, isLoading }}>
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
