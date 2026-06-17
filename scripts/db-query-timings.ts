import { createAdminClient } from '../lib/supabase/server';

async function timeQuery<T>(label: string, query: PromiseLike<T>): Promise<T> {
  const start = Date.now();
  const result = await Promise.resolve(query);
  const duration = Date.now() - start;
  console.log(`  ${label}: ${duration}ms`);
  return result;
}

async function main() {
  console.log('DB Query Timing Report');
  console.log('======================\n');

  const db = createAdminClient();

  console.log('1. Students');
  await timeQuery('count', db.from('students').select('*', { count: 'exact', head: true }));
  await timeQuery('list (10)', db.from('students').select('*').limit(10));

  console.log('\n2. Fee Invoices');
  await timeQuery('count', db.from('fee_invoices').select('*', { count: 'exact', head: true }));
  await timeQuery('list (10)', db.from('fee_invoices').select('*').limit(10));

  console.log('\n3. Users');
  await timeQuery('count', db.from('users').select('*', { count: 'exact', head: true }));
  await timeQuery('list (10)', db.from('users').select('*').limit(10));

  console.log('\n4. Visitors');
  await timeQuery('count', db.from('visitors').select('*', { count: 'exact', head: true }));
  await timeQuery('list (10)', db.from('visitors').select('*').limit(10));

  console.log('\n5. Teachers');
  await timeQuery('count', db.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher'));
  await timeQuery('list (10)', db.from('users').select('*').eq('role', 'teacher').limit(10));

  console.log('\n=== Done ===');
}

main().catch(console.error);
