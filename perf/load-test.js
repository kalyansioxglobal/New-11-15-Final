/**
 * Load Test Script for SIOX Command Center
 * 
 * Uses autocannon for load testing critical API endpoints.
 * Install: npm install -g autocannon
 * 
 * Usage: node perf/load-test.js [BASE_URL]
 * Default BASE_URL: http://localhost:5000
 */

const { execFileSync } = require('child_process');

const BASE_URL = process.argv[2] || 'http://localhost:5000';

const ENDPOINTS = [
  {
    name: 'Health Check',
    path: '/api/health',
    method: 'GET',
    public: true,
  },
  {
    name: 'Status Check',
    path: '/api/status',
    method: 'GET',
    public: true,
  },
  {
    name: 'Ventures List',
    path: '/api/ventures',
    method: 'GET',
    public: false,
  },
  {
    name: 'Freight Dashboard',
    path: '/api/logistics/dashboard?ventureId=1',
    method: 'GET',
    public: false,
  },
  {
    name: 'Freight Loads List',
    path: '/api/freight/loads/list?page=1&pageSize=50',
    method: 'GET',
    public: false,
  },
];

console.log('========================================');
console.log('SIOX Command Center Load Test');
console.log('========================================');
console.log(`Target: ${BASE_URL}`);
console.log('');

function runTest(endpoint) {
  console.log(`\n--- Testing: ${endpoint.name} ---`);
  console.log(`${endpoint.method} ${endpoint.path}`);
  
  if (!endpoint.public) {
    console.log('(Requires authentication - testing connectivity only)');
  }
  
  try {
    const url = `${BASE_URL}${endpoint.path}`;
    const args = ['-c', '10', '-d', '10', '-p', '1', url];
    console.log(`Running: autocannon ${args.join(' ')}\n`);
    execFileSync('autocannon', args, { stdio: 'inherit' });
  } catch (error) {
    console.log(`Error testing ${endpoint.name}: ${error.message}`);
  }
}

console.log('\nNote: For authenticated endpoints, you need to:');
console.log('1. Start the dev server: npm run dev');
console.log('2. Get a valid session cookie from browser');
console.log('3. Pass cookie header in autocannon: -H "Cookie: ..."');
console.log('\nTesting public endpoints only...\n');

ENDPOINTS.filter(e => e.public).forEach(runTest);

console.log('\n========================================');
console.log('Load test complete');
console.log('========================================');
