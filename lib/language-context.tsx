'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations = {
  en: {
    'dashboard': 'Dashboard',
    'academics': 'Academics',
    'students': 'Students',
    'exams': 'Assessments',
    'schedule': 'Schedule',
    'attendance': 'Attendance',
    'visitors': 'Visitors',
    'inventory': 'Inventory',
    'fees': 'Fees & Payments',
    'hr': 'HR',
    'transport': 'Transport',
    'analytics': 'Analytics',
    'communication': 'Communication',
    'settings': 'Settings',
    'notifications': 'Notifications',
    'switch_language': 'Switch Language',
    'toggle_theme': 'Toggle Theme',
    'sign_out': 'Sign Out',
    'search': 'Search...',
    'welcome': 'Welcome back',
    'close_profile': 'Close Profile',
    'view_all_notifications': 'View All Notifications',
    'new': 'New',
  },
  ar: {
    'dashboard': 'لوحة القيادة',
    'academics': 'الأكاديميين',
    'students': 'الطلاب',
    'exams': 'التقييمات',
    'schedule': 'الجدول الزمني',
    'attendance': 'الحضور',
    'visitors': 'الزوار',
    'inventory': 'المخزون',
    'fees': 'الرسوم والمدفوعات',
    'hr': 'الموارد البشرية',
    'transport': 'النقل',
    'analytics': 'التحليلات',
    'communication': 'التواصل',
    'settings': 'الإعدادات',
    'notifications': 'التنبيهات',
    'switch_language': 'تغيير اللغة',
    'toggle_theme': 'تغيير المظهر',
    'sign_out': 'تسجيل الخروج',
    'search': 'بحث...',
    'welcome': 'مرحباً بعودتك',
    'close_profile': 'إغلاق الملف الشخصي',
    'view_all_notifications': 'عرض جميع التنبيهات',
    'new': 'جديد',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') as Language;
      if (savedLang && (savedLang === 'en' || savedLang === 'ar')) {
        return savedLang;
      }
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
