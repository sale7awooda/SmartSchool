// Load test script for Smart School API endpoints
// Run: node scripts/load-test.js
// Requires: node built-in http module only

const http = require('http');
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10', 10);
const REQUESTS = parseInt(process.env.REQUESTS || '100', 10);

const endpoints = [
  '/',
  '/login',
  '/dashboard',
];

async function fetchUrl(url) {
  const start = Date.now();
  return new Promise((resolve) => {
    http.get(`${BASE_URL}${url}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ url, status: res.statusCode, duration: Date.now() - start, size: data.length });
      });
    }).on('error', (err) => {
      resolve({ url, status: 0, duration: Date.now() - start, error: err.message });
    });
  });
}

async function run() {
  console.log(`Load test: ${BASE_URL}`);
  console.log(`Concurrency: ${CONCURRENCY}, Total requests: ${REQUESTS}\n`);

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < REQUESTS; i += CONCURRENCY) {
    const batch = [];
    const batchSize = Math.min(CONCURRENCY, REQUESTS - i);
    for (let j = 0; j < batchSize; j++) {
      const endpoint = endpoints[i % endpoints.length];
      batch.push(fetchUrl(endpoint));
    }
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  const totalTime = Date.now() - startTime;
  const succeeded = results.filter(r => r.status >= 200 && r.status < 400);
  const durations = succeeded.map(r => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  durations.sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];

  console.log('=== Results ===');
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Requests: ${REQUESTS}`);
  console.log(`Succeeded: ${succeeded.length}`);
  console.log(`Failed: ${results.length - succeeded.length}`);
  console.log(`Avg duration: ${avgDuration.toFixed(2)}ms`);
  console.log(`P50: ${p50}ms`);
  console.log(`P95: ${p95}ms`);
  console.log(`P99: ${p99}ms`);
  console.log(`RPS: ${((REQUESTS / totalTime) * 1000).toFixed(2)}`);
}

run().catch(console.error);
