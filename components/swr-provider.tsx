'use client';

import { SWRConfig } from 'swr';
import { toast } from 'sonner';

// SSR-safe LocalStorage SWR cache provider
function localStorageProvider() {
  if (typeof window === 'undefined') {
    return new Map();
  }
  
  let initialCache: [any, any][] = [];
  try {
    const stored = localStorage.getItem('smart-school-swr-cache');
    if (stored) {
      initialCache = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse SWR local cache on init:', e);
  }

  const map = new Map<string, any>(initialCache);

  // Before unload or continuously, save the cache back to localStorage
  const saveCache = () => {
    try {
      const entries = Array.from(map.entries());
      localStorage.setItem('smart-school-swr-cache', JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to write SWR local cache:', e);
    }
  };

  window.addEventListener('beforeunload', saveCache);
  // Also save periodically for long-lived modern single-page sessions
  setInterval(saveCache, 10000);

  return map;
}

const isClient = typeof window !== 'undefined';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe provider parameter
  const fallbackProvider = isClient ? localStorageProvider : () => new Map();

  return (
    <SWRConfig
      value={{
        provider: fallbackProvider,
        onError: (error, key) => {
          if (error.status !== 403 && error.status !== 404) {
            console.error(`SWR Error on key ${key}:`, error);
            // Non-blocking toast for network disconnect or server issues
            toast.error(`Offline or Service Error: ${error.message || 'Connecting in background...'}`);
          }
        },
        shouldRetryOnError: true,
        errorRetryInterval: 5000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}


