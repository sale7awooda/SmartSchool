import { supabase } from './supabase/client';

/**
 * 2026 PWA Paradigm: Local-First Synchronization Engine
 * 
 * In a full production app, this would be wrapped by RxDB, PowerSync, or WatermelonDB 
 * backing onto SQLite-WASM or IndexedDB.
 * 
 * Here we provide the interface for the Offline-First abstraction. UI reads from this store 
 * synchronously (or very near it) avoiding standard SWR latency on spotty connections.
 */

// Simulated Local Store
const localStore = new Map<string, any>();
const mutationQueue: any[] = [];
let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;

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
    try {
      if (operation.type === 'UPDATE_ATTENDANCE') {
        await supabase.from('attendance').upsert(operation.payload);
      }
      // other operations
    } catch (e) {
      console.error('[Sync Engine] Failed to dispatch mutation, re-queueing', e);
      mutationQueue.unshift(operation);
      break;
    }
  }
}

/**
 * Optimistic wrapper for UI reads
 */
export async function queryLocalFirst(table: string, queryStrategy: () => Promise<any>) {
  const cacheKey = `${table}_last_query`;
  
  if (!isOnline && localStore.has(cacheKey)) {
    console.log(`[Local First] Offline read for ${table}`);
    return localStore.get(cacheKey);
  }

  try {
    const data = await queryStrategy();
    if (data) {
      localStore.set(cacheKey, data);
    }
    return data;
  } catch (error) {
    // Fallback to local
    if (localStore.has(cacheKey)) {
      console.warn(`[Local First] Network failed, using stale cache for ${table}`);
      return localStore.get(cacheKey);
    }
    throw error;
  }
}

/**
 * Optimistic mutation writes directly to local cache/store and queues for Cloud
 */
export async function mutateOptimistic(type: string, payload: any, updateCacheFn: (cache: Map<string, any>) => void) {
  // 1. Immediately update Local View/Store
  updateCacheFn(localStore);

  if (isOnline) {
    // 2. Transmit instantly if possible
    try {
      // Direct supabase calls should happen here natively based on mapping, but queue handles it
      mutationQueue.push({ type, payload });
      await syncQueue();
    } catch {
      // already queued
    }
  } else {
    // 2. Queue for background sync
    console.log(`[Local First] You are offline. Operation queued in background ${type}.`);
    mutationQueue.push({ type, payload });
  }
}

/**
 * Service Worker Broadcast Integration
 * This listens for push events intercepted by the SW that might need to invalidate local SQLite cache.
 */
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'INVALIDATE_SCHEMA') {
      const { table } = event.data;
      localStore.delete(`${table}_last_query`);
      console.log(`[Sync Engine] Invalidation requested by Edge Push for table: ${table}`);
    }
  });
}
