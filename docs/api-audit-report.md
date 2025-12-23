# API Audit Report

**Date:** December 11, 2024  
**Scope:** Top 5 frequently-used freight/hotel API routes  
**Purpose:** Identify missing validation, type safety gaps, and improvement opportunities

---

## 1. pages/api/freight/carriers/index.ts (193 lines)

### Missing Validation

**Query params (GET):**
- `q` - No validation (accepts any string)
- `active` - No validation (should be enum: "true" | "false")
- `state` - No validation (should be 2-letter state code)
- `equipment` - No validation
- `dispatcherId` - No validation (should be positive integer)
- `page` - Manual parsing, no schema
- `limit` - Manual parsing with hardcoded defaults, no schema

**Request body (POST):**
- `name` - Only checks if truthy, no min length or sanitization
- `mcNumber`, `dotNumber` - No format validation (MC numbers should be 6-7 digits)
- `email` - No email format validation
- `phone` - No phone format validation
- `rating` - `parseInt` without bounds checking
- `dispatcherIds` - Array handling but no schema validation

### Response Format Issues
- GET returns `{ carriers, page, pageSize, totalCount, totalPages }` - consistent
- POST returns raw carrier object without wrapper - inconsistent with GET

### Type Safety Gaps
- **Line 15:** `const where: any = {}` - should use `Prisma.CarrierWhereInput`
- **Line 57:** `(prisma.carrierDispatcher as any).findMany` - casting to any
- **Line 61:** `mappings.map((m: { carrierId: number })` - manual inline type

### TODOs / Future Improvements
- [ ] Wrap with `createApiHandler` for consistent error handling
- [ ] Add Zod schemas for GET query params and POST body
- [ ] Replace `where: any` with `Prisma.CarrierWhereInput`
- [ ] Remove the `as any` cast on carrierDispatcher query
- [ ] Validate MC/DOT number formats
- [ ] Standardize response envelope (consider `{ ok: true, data: ... }`)

---

## 2. pages/api/hotels/snapshot.ts (232 lines)

### Missing Validation

**Query params:**
- `ventureId` - No validation beyond `Number()` coercion
- `includeTest` - No validation (should be enum)

### Response Format Issues
- Success: `{ snapshot, totals }` - consistent structure
- Error on 405: Returns `res.status(405).end()` (no JSON body) - inconsistent
- Error on 403: Returns `{ error, detail }` - includes detail
- Error on 500: Returns `{ error }` - no detail

### Type Safety Gaps
- **Line 110:** `const hotelWhere: any = { ... }` - should use `Prisma.HotelPropertyWhereInput`
- **Lines 128-134:** Heavy use of inline type assertions `(typeof hotels)[number]`
- **Lines 184-207:** Multiple reduce callbacks with inline type annotations

### TODOs / Future Improvements
- [ ] Wrap with `createApiHandler` for consistent error handling
- [ ] Add Zod schema for query params (ventureId, includeTest)
- [ ] Replace `hotelWhere: any` with `Prisma.HotelPropertyWhereInput`
- [ ] Return JSON on 405 for consistency
- [ ] Consider extracting `MetricRecord` and snapshot item types to shared definitions
- [ ] Add permission check using `createApiHandler` auth

---

## 3. pages/api/hotels/kpi-comparison.ts (227 lines)

### Missing Validation

**Query params:**
- `hotelId` - No validation beyond `Number()` coercion
- `ventureId` - No validation beyond `Number()` coercion
- Neither param is validated as positive integer

### Response Format Issues
- Success: Returns `ComparisonResult` directly - well-typed
- Error on 401: Returns `{ error }` - consistent
- Error on 405: Returns `{ error }` - consistent
- Error on 500: Returns `{ error }` - consistent

### Type Safety Gaps
- Uses `getServerSession` directly instead of helper like `requireUser` or `getSessionUser`
- **Line 81:** `const where: Record<string, unknown> = {}` - good but could be Prisma type
- No type assertion issues - uses well-defined `PeriodMetrics` and `ComparisonResult` types

### TODOs / Future Improvements
- [ ] Wrap with `createApiHandler` to replace manual session handling
- [ ] Add Zod schema for query params (hotelId, ventureId as optional positive integers)
- [ ] Replace `Record<string, unknown>` with `Prisma.HotelKpiDailyWhereInput`
- [ ] Add venture scoping for non-admin users (currently missing)
- [ ] Consider adding permission checks similar to snapshot.ts

---

## 4. pages/api/freight/loads/[id].ts (132 lines)

### Missing Validation

**Path params:**
- `id` - Manual `parseInt` with `isNaN` check, should use Zod

**Request body (PATCH):**
- No schema validation for any of the ~17 body fields
- `carrierId`, `rate`, `buyRate`, `sellRate`, `weightLbs` - Manual parsing with `parseInt`/`parseFloat`
- `pickupDate`, `dropDate` - No date validation before `new Date()` constructor
- All fields are optional but no schema enforces types

### Response Format Issues
- GET: `{ load }` - wrapped
- PATCH: `{ load }` - wrapped
- DELETE: `{ success: true }` - different structure
- Errors: `{ error }` - consistent

### Type Safety Gaps
- **Line 79:** `const data: any = {}` - should use `Prisma.LoadUpdateInput`
- Lines 81-107: All field assignments use conditional checks but `data` is untyped

### TODOs / Future Improvements
- [ ] Wrap with `createApiHandler` for multi-method support
- [ ] Add Zod schema for path param `id`
- [ ] Add Zod schema for PATCH body with all optional fields properly typed
- [ ] Replace `data: any` with `Prisma.LoadUpdateInput`
- [ ] Validate date strings before passing to `new Date()`
- [ ] Consider standardizing DELETE response to `{ success: true }` vs `{ load }` pattern

---

## 5. pages/api/freight/carrier-search.ts (57 lines)

### Missing Validation

**Request body (POST):**
- `originCity`, `originState`, `originZip` - No validation beyond truthiness
- `destinationCity`, `destinationState`, `destinationZip` - No validation beyond truthiness
- `equipmentType` - No validation (should be enum of valid equipment types)
- `pickupDate` - No date validation before `new Date()` constructor
- `weight` - No validation (should be positive number)
- `ventureId` - No validation (should be positive integer)

### Response Format Issues
- Success: Returns result directly from `searchCarriersForLoad()` - depends on lib
- Error on 400: `{ error }` - consistent
- Error on 401: `{ error }` - consistent
- Error on 405: `{ error }` - consistent
- Error on 500: `{ error }` - consistent

### Type Safety Gaps
- **Line 53:** `catch (error: any)` - should use typed error handling
- Uses `CarrierSearchInput` from lib which provides type safety for the search call
- No Prisma direct calls, so no Prisma type issues

### TODOs / Future Improvements
- [ ] Wrap with `createApiHandler` for consistent error handling
- [ ] Add Zod schema for POST body matching `CarrierSearchInput` interface
- [ ] Replace `catch (error: any)` with proper error type
- [ ] Add validation for state codes (2-letter abbreviations)
- [ ] Add validation for ZIP codes (5-digit format)
- [ ] Consider adding equipment type enum validation

---

## Summary

| Route | Missing Validation | Type Safety Issues | Priority |
|-------|-------------------|-------------------|----------|
| carriers/index.ts | Query + Body | 3 `any` usages | High |
| hotels/snapshot.ts | Query | 1 `any` usage | Medium |
| hotels/kpi-comparison.ts | Query | Session handling | Medium |
| freight/loads/[id].ts | Path + Body | 1 `any` usage | High |
| freight/carrier-search.ts | Body | 1 `any` in catch | Medium |

### Recommended Priority Order

1. **freight/loads/[id].ts** - Core entity route, PATCH has no body validation
2. **freight/carriers/index.ts** - High traffic, multiple type safety gaps
3. **freight/carrier-search.ts** - Matching engine entry point, needs body validation
4. **hotels/snapshot.ts** - Dashboard-critical, needs query validation
5. **hotels/kpi-comparison.ts** - Needs createApiHandler and query validation

### Common Patterns to Apply

1. Wrap all routes with `createApiHandler` from `lib/api/handler.ts`
2. Add Zod schemas using helpers from `lib/api/validation.ts`
3. Replace `any` types with Prisma-generated types (`Prisma.XWhereInput`, `Prisma.XUpdateInput`)
4. Standardize error responses to `{ ok: false, error: { code, message } }` format
5. Add permission checks consistently across all routes
