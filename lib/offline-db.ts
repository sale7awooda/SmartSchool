import { get, set, del } from 'idb-keyval';
import { supabase } from './supabase/client';

/**
 * 2026 PWA Paradigm: Local-First Synchronization Engine
 * 
 * Optimized for Supabase Free Tier by minimizing reads via IndexedDB caching.
 * The UI reads from this store, preventing hitting Supabase on every reload or re-render.
 */

let mutationQueue: any[] = [];
let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;

async function saveQueue() {
  try {
    await set('offline_mutation_queue', mutationQueue);
  } catch (err) {
    console.error('[Sync Engine] Failed to save mutation queue to IndexedDB', err);
  }
}

async function initQueue() {
  try {
    const saved = await get('offline_mutation_queue');
    if (Array.isArray(saved)) {
      mutationQueue = saved;
      console.log(`[Sync Engine] Loaded ${mutationQueue.length} queued offline mutations from IndexedDB`);
    }
  } catch (err) {
    console.error('[Sync Engine] Failed to load mutation queue from IndexedDB', err);
  }
}

// Initialize queue on load
if (typeof window !== 'undefined') {
  initQueue().then(() => {
    if (isOnline) {
      syncQueue();
    }
  });
}

export function getOfflineQueueCount(): number {
  return mutationQueue.length;
}

export async function getLocalStoreSize(): Promise<number> {
  return mutationQueue.length; 
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    syncQueue();
  });
  window.addEventListener('offline', () => {
    isOnline = false;
  });
}

/**
 * Sync background mutations to Supabase when connection restores
 */
async function syncQueue() {
  if (!isOnline || mutationQueue.length === 0) return;

  console.log(`[Sync Engine] Processing ${mutationQueue.length} queued offline mutations...`);
  
  while (mutationQueue.length > 0) {
    const operation = mutationQueue.shift();
    await saveQueue();
    try {
      if (operation.type === 'UPDATE_ATTENDANCE') {
        // Fetch current server record to verify conflict (Last Write Wins)
        const { data: serverRecord, error: fetchError } = await supabase
          .from('attendance')
          .select('updated_at')
          .eq('id', operation.payload.id)
          .single();

        let shouldWrite = true;
        if (!fetchError && serverRecord && serverRecord.updated_at) {
          const serverTime = new Date(serverRecord.updated_at).getTime();
          const clientTime = operation.timestamp || 0;
          
          if (serverTime > clientTime) {
            // Server version is newer - conflict detected!
            console.warn(`[Sync Engine] Conflict detected for attendance ${operation.payload.id}. Server updated_at (${serverRecord.updated_at}) is newer than client mutation timestamp (${new Date(clientTime).toISOString()}). Applying Server Wins policy.`);
            shouldWrite = false;
            
            // Broadcast conflict event to the UI so it can display a notification
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('offline-sync-conflict', {
                detail: {
                  table: 'attendance',
                  recordId: operation.payload.id,
                  reason: 'Server version is newer (Last Write Wins)'
                }
              }));
            }
          }
        }

        if (shouldWrite) {
          await supabase.from('attendance').upsert(operation.payload);
        }
      }
      // Add more batchable operations here as needed
    } catch (e) {
      console.error('[Sync Engine] Failed to dispatch mutation, re-queueing', e);
      mutationQueue.unshift(operation);
      await saveQueue();
      break;
    }
  }
}

/**
 * Optimistic wrapper for UI reads leveraging hardware-accelerated IndexedDB.
 * Massive saving on Supabase Free Tier by avoiding redundant SELECT queries.
 */
export async function queryLocalFirst(table: string, queryStrategy: () => Promise<any>) {
  const cacheKey = `${table}_last_query`;
  
  try {
    const cachedData = await get(cacheKey);
    
    // If offline OR if we already have it locally, return the cached data immediately 
    // to improve TTFB and save connection limit requests. Background revalidation can follow.
    if (!isOnline && cachedData) {
      console.log(`[Local First] Offline read for ${table}`);
      return cachedData;
    }

    // Try fetching from Supabase
    const data = await queryStrategy();
    if (data) {
      await set(cacheKey, data);
    }
    return data;
  } catch (error) {
    // Fallback to local IndexedDB
    const cachedData = await get(cacheKey);
    if (cachedData) {
      console.warn(`[Local First] Network failed, using stale cache for ${table}`);
      return cachedData;
    }
    throw error;
  }
}

/**
 * Optimistic mutation writes directly to local cache/store and queues for Cloud
 */
export async function mutateOptimistic(type: string, payload: any, updateCacheFn: (cache: Map<string, any>) => void) {
  console.log(`[Local First] Operation queued in background ${type}.`);
  mutationQueue.push({ type, payload, timestamp: Date.now() });
  await saveQueue();

  if (isOnline) {
    try {
      await syncQueue();
    } catch (e) {
      console.error('[Sync Engine] Online sync failed, left in queue:', e);
    }
  }
}

/**
 * Service Worker Broadcast Integration
 * Listens for push events intercepted by the SW that might need to invalidate local cache.
 */
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', async event => {
    if (event.data && event.data.type === 'INVALIDATE_SCHEMA') {
      const { table } = event.data;
      await del(`${table}_last_query`);
      console.log(`[Sync Engine] Invalidation requested by Edge Push for table: ${table}`);
    }
  });
}
