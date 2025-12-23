# Performance Testing

This folder contains load testing scripts for the SIOX Command Center.

## Prerequisites

Install autocannon globally:

```bash
npm install -g autocannon
```

## Quick Start

### 1. Start the Development Server

```bash
npm run dev
```

Wait for the server to be ready on port 5000.

### 2. Run Public Endpoint Tests

```bash
node perf/load-test.js
```

Or with a custom URL:

```bash
node perf/load-test.js https://your-staging-url.com
```

## Manual Testing Commands

### Health Check (Public)

```bash
autocannon -c 50 -d 30 http://localhost:5000/api/health
```

- `-c 50`: 50 concurrent connections
- `-d 30`: 30 second duration

### Status Check (Public)

```bash
autocannon -c 50 -d 30 http://localhost:5000/api/status
```

### Authenticated Endpoints

For authenticated endpoints, get a session cookie from your browser:

1. Open DevTools → Network tab
2. Login to the app
3. Copy the `next-auth.session-token` cookie value

Then run:

```bash
autocannon -c 10 -d 30 \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN_HERE" \
  http://localhost:5000/api/ventures
```

## Critical Endpoints to Test

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Basic health check |
| `/api/status` | GET | No | System status with DB check |
| `/api/ventures` | GET | Yes | Venture list |
| `/api/logistics/dashboard` | GET | Yes | Freight dashboard |
| `/api/freight/loads/list` | GET | Yes | Load listing (paginated) |
| `/api/hospitality/dashboard` | GET | Yes | Hotel dashboard |
| `/api/bpo/dashboard` | GET | Yes | BPO dashboard |

## Interpreting Results

### Good Performance Indicators

- **Latency p99 < 500ms**: 99% of requests complete in under 500ms
- **Throughput > 100 req/sec**: Can handle 100+ requests per second
- **0% error rate**: No 5xx errors under load

### Warning Signs

- **Latency p99 > 1000ms**: Requests taking too long
- **Throughput < 50 req/sec**: Server struggling
- **Error rate > 1%**: Failures under load

### Slow Query Detection

The app logs slow database queries (>300ms) automatically. Check server logs for:

```json
{"level":"warn","type":"slow_query","durationMs":450,...}
```

## Optimization Priorities

Based on typical results:

1. **Add database indexes** for frequently queried fields
2. **Implement pagination** on large list endpoints
3. **Add caching** for dashboard aggregations
4. **Use connection pooling** for database
5. **Consider read replicas** for heavy reporting

## Reference: Expected Baselines

On a typical development environment:

| Endpoint | Expected RPS | Expected Latency (p99) |
|----------|-------------|------------------------|
| `/api/health` | 500+ | <50ms |
| `/api/status` | 200+ | <100ms |
| `/api/ventures` | 100+ | <200ms |
| Dashboard APIs | 50+ | <500ms |
| List APIs (paginated) | 30+ | <800ms |

Production with proper infrastructure should be 2-5x better.
