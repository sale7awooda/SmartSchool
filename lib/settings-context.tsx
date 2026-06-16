'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import useSWR from 'swr';
import { getSystemSettings, updateSystemSettings } from '@/lib/supabase-db';
import { toast } from 'sonner';

interface SystemSettings {
  school_name: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  grading_scale: string;
  theme_color: string;
  font_family: string;
  compact_design: boolean;
  enable_online_registration: boolean;
  maintenance_mode: boolean;
  automatic_attendance: boolean;
  enable_sms: boolean;
  currency?: string;
  logo_url?: string;
  vapid_public_key?: string;
  vapid_private_key?: string;
  vapid_subject?: string;
  school_type?: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  supabase_service_role_key?: string;
  resend_api_key?: string;
  mapbox_token?: string;
  role_permissions?: Record<string, string[]>;
  active_academic_year?: string;
  active_term?: string;
}

const colorMap: Record<string, string> = {
  indigo: '#4f46e5',
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#d97706',
  blue: '#2563eb',
  violet: '#7c3aed',
  teal: '#0d9488',
  orange: '#ea580c',
  slate: '#475569'
};

const fontMap: Record<string, string> = {
  'Inter (Default)': 'Inter',
  'Roboto': 'Roboto',
  'Open Sans': 'Open Sans',
  'JetBrains Mono': 'JetBrains Mono',
  'Playfair Display': 'Playfair Display'
};

export function formatAmount(amount: number, currencyCode: string = 'USD') {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    SDG: 'SDG ',
    AED: 'AED ',
    INR: '₹',
    SAR: 'SAR ',
    EGP: 'EGP ',
  };
  const symbol = symbols[currencyCode.toUpperCase()] || `${currencyCode} `;
  return `${symbol}${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

interface SettingsContextType {
  settings: SystemSettings | undefined;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  refreshSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { data: settings, isLoading, mutate } = useSWR('system_settings', getSystemSettings);

  useEffect(() => {
    if (!settings) return;

    try {
      // 1. Enforce Theme Primary Colors dynamically
      const themeColor = settings.theme_color || 'indigo';
      const hex = colorMap[themeColor.toLowerCase()] || colorMap.indigo;
      document.documentElement.style.setProperty('--primary', hex);
      document.documentElement.style.setProperty('--ring', hex);

      // 2. Enforce Typography Font Family dynamically
      const rawFont = settings.font_family || 'Inter (Default)';
      const mappedFont = fontMap[rawFont] || 'Inter';
      
      // Load Google Font dynamically
      if (typeof window !== 'undefined' && mappedFont !== 'Inter' && !document.getElementById(`font-link-${mappedFont.replace(/\s+/g, '-')}`)) {
        const link = document.createElement('link');
        link.id = `font-link-${mappedFont.replace(/\s+/g, '-')}`;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${mappedFont.replace(/\s+/g, '+')}:wght@400;500;700;900&display=swap`;
        document.head.appendChild(link);
      }
      document.documentElement.style.setProperty('--font-sans', `"${mappedFont}", "Inter", sans-serif`);
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.setProperty('--font-sans', `"${mappedFont}", "Inter", sans-serif`);
      }

      // 3. Enforce Compact Viewport Scale dynamically
      if (settings.compact_design) {
        document.documentElement.classList.add('compact-view');
      } else {
        document.documentElement.classList.remove('compact-view');
      }
    } catch (err) {
      console.error('Error applying dynamic settings:', err);
    }
  }, [settings]);

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      await updateSystemSettings(updated);
      await mutate(updated);
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSettings, refreshSettings: mutate }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
