'use client';

import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface NetworkStatusProps {
  isOnline: boolean;
  pendingSyncs: number;
  t: (key: string) => string;
}

export function NetworkStatus({ isOnline, pendingSyncs, t }: NetworkStatusProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold select-none shrink-0 transition-colors ${
        isOnline
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse'
      }`}
      title={isOnline ? t('system_online_msg') : t('offline_mode_msg')}
    >
      {isOnline ? (
        <>
          <Wifi size={14} className="shrink-0" />
          <span className="text-[10px] font-bold hidden sm:inline shrink-0">{t('online_sync')}</span>
        </>
      ) : (
        <>
          <WifiOff size={14} className="shrink-0" />
          <span className="text-[10px] font-bold hidden sm:inline shrink-0">{t('offline_local')}</span>
        </>
      )}

      {pendingSyncs > 0 && (
        <div className="flex items-center gap-1 bg-amber-500/20 px-1.5 py-0.5 rounded-md">
          <RefreshCw size={10} className="animate-spin" />
          <span className="text-[9px] font-black">{pendingSyncs}</span>
        </div>
      )}
    </div>
  );
}
