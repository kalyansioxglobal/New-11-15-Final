# Smoke Tests for Freight/Logistics Module

## Overview
These smoke tests validate the core wiring and connectivity of the freight/logistics module.

## Test Files

### `freight-flows.test.ts`
API endpoint smoke tests for the 5 major business flows:
1. Quote → Load Conversion
2. Load Status Lifecycle
3. Carrier Matching
4. Outreach
5. Lost/At-Risk Load Management

### `db-connections.test.ts`
Database connectivity and model validation:
- Prisma client connection
- Core model queryability
- Enum value validation
- Foreign key relationship integrity

## Running Tests

```bash
# Run all smoke tests
npm test -- tests/smoke/

# Run specific test file
npm test -- tests/smoke/db-connections.test.ts

# Run with coverage
npm test -- --coverage tests/smoke/
```

## Environment Variables

For API tests against a remote server:
```bash
TEST_BASE_URL=https://your-app.repl.co npm test -- tests/smoke/
```

## Test Results Interpretation

### Expected Responses
- **200**: API is working and returning data
- **401**: API requires authentication (expected for unauthenticated tests)
- **400**: Input validation is working
- **404**: Resource not found (expected for non-existent IDs)

### Failure Indicators
- **500**: Server error - investigate logs
- **Connection refused**: Server not running
- **Timeout**: Performance issue or deadlock

## Validation Coverage

| Flow | API Tests | DB Tests |
|------|-----------|----------|
| Quote → Load | ✅ | ✅ |
| Load Lifecycle | ✅ | ✅ |
| Carrier Matching | ✅ | ✅ |
| Outreach | ✅ | ✅ |
| Lost/At-Risk | ✅ | ✅ |

## Adding New Tests

When adding tests for new flows:
1. Add API endpoint tests to `freight-flows.test.ts`
2. Add model/relationship tests to `db-connections.test.ts`
3. Update this README with new coverage
