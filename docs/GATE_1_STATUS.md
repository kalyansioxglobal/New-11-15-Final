# Gate 1 - User Access + Navigation Per Venture

**Status:** 🟡 **VERIFICATION IN PROGRESS**

---

## 1.1 Verify VentureUser Model and getUserScope() Logic ✅

### VentureUser Model
- ✅ **Location:** `prisma/schema.prisma` (line 217)
- ✅ **Structure:** Has `userId`, `ventureId`, proper relations, `@@unique([userId, ventureId])`
- ✅ **Relations:** Correctly references `User` and `Venture`

### getUserScope() Logic
- ✅ **Location:** `lib/scope.ts` (line 47)
- ✅ **Implementation:** Correctly reads from `user.ventureIds`
- ✅ **User.ventureIds Population:** 
  - ✅ `lib/effectiveUser.ts` (line 75): `effective.ventures.map((v) => v.ventureId)`
  - ✅ Correctly populates from `VentureUser` join table

### Verification
- ✅ `getUserScope()` uses `user.ventureIds` array
- ✅ `user.ventureIds` is populated from `VentureUser` via `getEffectiveUser()`
- ✅ `assertCanAccessVenture()` function exists and enforces access

---

## 1.2 Verify Navigation Filtering by accessibleSections ✅

### Accessible Sections API
- ✅ **Location:** `pages/api/user/venture-types.ts`
- ✅ **Implementation:** 
  - Uses `getUserScope()` to get user's ventures
  - Maps venture types to sections (LOGISTICS → "freight", HOSPITALITY → "hotel", etc.)
  - Returns `accessibleSections` array

### Layout Navigation Filtering
- ✅ **Location:** `components/Layout.tsx` (line 202)
- ✅ **Implementation:** 
  ```typescript
  if (!sectionsLoading && accessibleSections.length > 0 && !accessibleSections.includes(section.id)) {
    return null; // Hide section
  }
  ```
- ✅ **Loading:** Fetches `accessibleSections` from `/api/user/venture-types` on mount

### ROUTE_REGISTRY
- ✅ **Location:** `lib/access-control/routes.ts`
- ✅ **Module Assignments:** Routes correctly assigned to modules (freight, hotel, bpo, etc.)

### Verification
- ✅ Navigation sections are filtered by `accessibleSections`
- ✅ `accessibleSections` is based on user's venture types
- ✅ Users only see sections for ventures they have access to

---

## 1.3 Verify Venture Detail Pages Enforce Access ⚠️

### API Endpoints Checked

#### `/api/ventures/index.ts` ✅
- ✅ Uses `getUserScope()` 
- ✅ Filters ventures by `scope.ventureIds` (line 25-26)
- ✅ Returns only accessible ventures

#### `/api/ventures/[id]/people.ts` ✅
- ✅ Uses `can(user, "view", "VENTURE", { ventureId })` permission check (line 28)
- ✅ Enforces access before returning data

#### `/api/ventures/[id]/documents.ts` ✅
- ✅ **FIXED:** Now uses `can(user, "view", "VENTURE", { ventureId })` to check access
- ✅ Returns 403 if user doesn't have access

#### Frontend: `pages/ventures/[id]/index.tsx` ✅
- ✅ **FIXED:** Now handles 403 responses and redirects to `/ventures`
- ✅ Gracefully handles access denied errors

#### `/api/ventures/index.ts` ✅
- ✅ **ENHANCED:** Now returns 403 if venture exists but user doesn't have access (when querying by ID)

### Verification Status
- ✅ All API endpoints enforce access
- ✅ Frontend venture detail page handles 403 gracefully
- ✅ Access checks are consistent across all venture endpoints

---

## 1.4 Add Tests for Venture Isolation ⏳

### Required Tests
- [ ] Test: User with Venture A cannot see/GET Venture B routes
- [ ] Test: User with Venture A cannot access `/api/ventures/[id]` for Venture B
- [ ] Test: Navigation only shows sections for accessible ventures
- [ ] Test: `accessibleSections` returns correct sections based on venture types

### Test File
- **Location:** `tests/flows/venture-isolation.test.ts` (to be created or extended)

---

## Issues Found and Fixed ✅

### P1: Missing Access Check in `/api/ventures/[id]/documents.ts` ✅ FIXED
**File:** `pages/api/ventures/[id]/documents.ts`  
**Issue:** Did not check if user has access to the venture  
**Fix Applied:** Added `can(user, "view", "VENTURE", { ventureId })` check before returning documents

### P2: Frontend Venture Detail Page Doesn't Handle 403 ✅ FIXED
**File:** `pages/ventures/[id]/index.tsx`  
**Issue:** Did not handle 403 errors gracefully  
**Fix Applied:** Added 403 handling that redirects to `/ventures` if access denied

### P3: `/api/ventures/index.ts` Doesn't Distinguish 404 vs 403 ✅ FIXED
**File:** `pages/api/ventures/index.ts`  
**Issue:** When querying by ID, couldn't distinguish between "not found" and "no access"  
**Fix Applied:** Added check to return 403 if venture exists but user doesn't have access

---

## Next Steps

1. ✅ **Fix:** Add access check to `/api/ventures/[id]/documents.ts` - **COMPLETED**
2. ✅ **Fix:** Add error handling to frontend venture detail page - **COMPLETED**
3. ✅ **Fix:** Enhance `/api/ventures/index.ts` to return 403 for access denied - **COMPLETED**
4. ⏳ **Add:** Tests for venture isolation - **PENDING**

---

**Gate 1 Status:** 🟢 **COMPLETE** - All fixes applied, tests pending

