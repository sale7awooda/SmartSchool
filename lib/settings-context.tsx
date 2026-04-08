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
