# OTP Verification Issue - Fix

**Issue:** OTP codes are always showing as invalid when entered

**Root Cause Analysis:**

After reviewing the code, I found several potential issues:

## Issue 1: Incomplete Console Log (Syntax Error)

**File:** `pages/api/auth/verify-otp.ts` line 57

```typescript
if (!validOtp) {
  console.log  // ❌ INCOMPLETE - This is a syntax error!
  return res.status(401).json({ error: "Invalid or expired code. Please try again." });
}
```

**Fix:** This line should be:
```typescript
console.log(`[VERIFY] Failed: No valid OTP found for ${normalizedEmail}. Code provided: ${normalizedCode.substring(0,2)}****`);
```

## Issue 2: Date Comparison Timezone Issue

**File:** `pages/api/auth/verify-otp.ts` line 51

The `expiresAt` comparison might have timezone issues:

```typescript
expiresAt: { gt: new Date() },
```

**Problem:** If the database stores UTC but `new Date()` uses local time, or vice versa, the comparison might fail.

**Fix:** Use explicit UTC comparison:
```typescript
expiresAt: { gt: new Date(Date.now()) },
```

Or better, use Prisma's date comparison which handles timezones correctly, but ensure both are in the same timezone.

## Issue 3: Code Normalization Mismatch

**File:** `pages/api/auth/send-otp.ts` line 28 vs `pages/api/auth/verify-otp.ts` line 24

**Send OTP:**
```typescript
const code = Math.floor(100000 + Math.random() * 900000).toString();
// Stores: "123456" (string)
```

**Verify OTP:**
```typescript
const normalizedCode = code.toString().trim();
// Converts to string and trims
```

**Potential Issue:** If the user's input has any non-standard whitespace or the code gets parsed as a number somewhere, it might not match.

## Issue 4: NextAuth Provider Code Normalization

**File:** `pages/api/auth/[...nextauth].ts` line 76

```typescript
const normalizedCode = credentials.code.trim();
```

**Issue:** This doesn't convert to string first. If `credentials.code` is a number, `.trim()` will fail or behave unexpectedly.

**Fix:**
```typescript
const normalizedCode = String(credentials.code).trim();
```

## Recommended Fixes

### Fix 1: Complete the Console Log

```typescript
// pages/api/auth/verify-otp.ts line 56-58
if (!validOtp) {
  console.log(`[VERIFY] Failed: No valid OTP found for ${normalizedEmail}. Code provided: ${normalizedCode.substring(0,2)}****`);
  return res.status(401).json({ error: "Invalid or expired code. Please try again." });
}
```

### Fix 2: Ensure Consistent Code Normalization

```typescript
// pages/api/auth/verify-otp.ts line 24
const normalizedCode = String(code).trim().replace(/\s+/g, ''); // Remove all whitespace
```

### Fix 3: Fix NextAuth Provider

```typescript
// pages/api/auth/[...nextauth].ts line 76
const normalizedCode = String(credentials.code).trim().replace(/\s+/g, '');
```

### Fix 4: Add Better Debugging

```typescript
// pages/api/auth/verify-otp.ts - Add before the query
console.log(`[VERIFY] Input code: "${normalizedCode}" (length: ${normalizedCode.length})`);
console.log(`[VERIFY] Input code bytes:`, Buffer.from(normalizedCode).toString('hex'));

// After finding OTPs
console.log(`[VERIFY] Stored codes:`, allOtps.map(o => ({
  code: o.code,
  codeLength: o.code.length,
  codeBytes: Buffer.from(o.code).toString('hex'),
  matches: o.code === normalizedCode,
})));
```

### Fix 5: Ensure Code is Always 6 Digits

```typescript
// pages/api/auth/send-otp.ts line 28
// Ensure code is always exactly 6 digits with leading zeros if needed
const code = Math.floor(100000 + Math.random() * 900000).toString().padStart(6, '0');
```

## Most Likely Issue

Based on the code, the **most likely issue** is:

1. **The incomplete console.log on line 57** - This might be causing a syntax error that prevents the code from running correctly
2. **Code normalization mismatch** - The code might have extra whitespace or be parsed differently

## Immediate Action Items

1. [ ] Fix the incomplete `console.log` on line 57 of `verify-otp.ts`
2. [ ] Add `String()` conversion in NextAuth provider
3. [ ] Add whitespace removal in normalization
4. [ ] Add better debugging to see exact code comparison
5. [ ] Test with actual OTP codes

## Testing Steps

1. Send OTP code
2. Check server logs for:
   - What code was stored
   - What code was received
   - Whether they match exactly
3. Check for any syntax errors in console
4. Verify timezone issues with `expiresAt`

---

**Priority:** 🔴 **CRITICAL** - Blocks all user logins


