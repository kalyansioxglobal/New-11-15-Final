# Testing Guide

This document explains how to run tests for the Multi-Venture Command Center.

## Test Categories

### 1. Critical Tests (`tests/critical/`)
Core business logic tests that must pass before deployment.

### 2. Connectivity Tests (`tests/connectivity/`)
System integration tests that verify wiring between components:
- Quote → Load conversion
- Load DELIVERED → Incentive engine
- Task lifecycle
- EOD report submission
- Carrier outreach records

### 3. Flow Tests (`tests/flows/`)
End-to-end business flow tests:
- Incentive engine pipeline (Load → Metrics → IncentiveDaily)

### 4. Smoke Tests (`tests/smoke/`)
API endpoint availability tests (require running server).

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Categories
```bash
# Connectivity tests only
npm test -- --testPathPattern=connectivity

# Flow tests only
npm test -- --testPathPattern=flows

# Critical tests only
npm test -- --testPathPattern=critical
```

### Run a Single Test File
```bash
npm test -- tests/connectivity/system-connectivity.test.ts
```

### Run Tests with Verbose Output
```bash
npm test -- --verbose
```

### Run Tests in Watch Mode (Development)
```bash
npm test -- --watch
```

## Test Configuration

Tests are configured in `jest.config.cjs`:
- Test environment: Node.js
- Test patterns: `tests/critical/`, `tests/connectivity/`, `tests/flows/`
- TypeScript support via ts-jest

## Writing New Tests

### Database Tests
1. Use real Prisma client for database connectivity tests
2. Create unique test data using timestamps in identifiers
3. Clean up test data in `afterAll` hooks
4. Use the fixtures from `tests/connectivity/test-fixtures.ts`

### Example Test Structure
```typescript
import { prisma } from '../../lib/prisma';
import { createTestFixtures, cleanupTestFixtures } from './test-fixtures';

describe('My Feature Test', () => {
  let fixtures;

  beforeAll(async () => {
    fixtures = await createTestFixtures();
  });

  afterAll(async () => {
    await cleanupTestFixtures(fixtures);
  });

  it('should do something', async () => {
    // Test code here
  });
});
```

### Mocking External Services
For tests that involve external APIs (SendGrid, Twilio, OpenAI):
- Use mocks from `tests/connectivity/external-mocks.ts`
- Call `setupExternalMocks()` before tests
- Call `resetExternalMocks()` in `beforeEach` hooks

## Test Data Cleanup

All tests should clean up their own data. The cleanup order matters due to foreign key constraints:
1. IncentiveDaily
2. Load
3. Quote
4. IncentiveRule
5. EodReport
6. Task
7. CarrierOutreach
8. VentureUser
9. Office
10. User
11. Venture

## Troubleshooting

### Database Connection Issues
Ensure `DATABASE_URL` environment variable is set correctly.

### Test Timeouts
For long-running tests, increase the timeout:
```typescript
jest.setTimeout(30000); // 30 seconds
```

### Prisma Client Issues
If you get Prisma client errors, regenerate the client:
```bash
npx prisma generate
```
