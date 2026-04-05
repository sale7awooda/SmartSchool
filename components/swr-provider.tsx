'use client';

import { SWRConfig } from 'swr';
import { toast } from 'sonner';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        onError: (error, key) => {
          if (error.status !== 403 && error.status !== 404) {
            // We can send the error to Sentry,
            // or show a notification UI.
            console.error(`SWR Error on key ${key}:`, error);
            toast.error(`Failed to fetch data: ${error.message || 'Unknown error'}`);
          }
        },
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
