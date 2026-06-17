import { createAdminClient } from './server';

export interface QueryTiming {
  table: string;
  method: string;
  durationMs: number;
  rowCount: number;
}

const timings: QueryTiming[] = [];
const MAX_TIMINGS = 100;

export function getQueryTimings(): QueryTiming[] {
  return [...timings];
}

export function clearQueryTimings(): void {
  timings.length = 0;
}

export async function profileQuery<T>(
  table: string,
  method: string,
  query: PromiseLike<{ data: T | null; error: any; count?: number | null }>
): Promise<{ data: T | null; error: any; count?: number | null }> {
  const start = Date.now();
  const result = await query;
  const durationMs = Date.now() - start;

  const timing: QueryTiming = {
    table,
    method,
    durationMs,
    rowCount: Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0),
  };

  timings.push(timing);
  if (timings.length > MAX_TIMINGS) {
    timings.shift();
  }

  if (durationMs > 500) {
    console.warn(`[SLOW DB] ${method} ${table} took ${durationMs}ms (${timing.rowCount} rows)`);
  }

  return result;
}

export async function timedQuery<T>(
  label: string,
  query: PromiseLike<T>
): Promise<T> {
  const start = Date.now();
  const result = await query;
  const duration = Date.now() - start;
  console.log(`  ${label}: ${duration}ms`);
  return result;
}
