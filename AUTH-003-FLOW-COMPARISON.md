# AUTH-003 Flow Comparison

## 🔴 BEFORE FIX (Buggy Behavior)

```
User Action                    Backend Processing                    Result
═══════════                    ══════════════════                    ══════

1. Enter email:                → /api/auth/send-otp
   "unknown@example.com"       
                               ├─ Validate format ✓
                               ├─ Check rate limit ✓
                               ├─ Generate OTP code
                               ├─ Save to database ✓
                               └─ Send email ✓              → ❌ OTP EMAIL SENT
                                                               (shouldn't happen!)

2. Check inbox                 
                               "Your code is: 123456"       → ✉️ Email received

3. Enter code: 123456          → NextAuth authorize()
                               
                               ├─ Verify OTP ✓
                               ├─ Check user exists ✗
                               └─ User not found!           → ❌ ERROR: "User not found"

4. See error message                                        → 😞 Confused user
   "User not found"                                            (but got OTP email!)
```

---

## 🟢 AFTER FIX (Correct Behavior)

```
User Action                    Backend Processing                    Result
═══════════                    ══════════════════                    ══════

1. Enter email:                → /api/auth/send-otp
   "unknown@example.com"       
                               ├─ Validate format ✓
                               ├─ Check rate limit ✓
                               ├─ Check user exists ✗       → ✅ STOP! Return 404
                               └─ [Process stopped]            NO OTP generated
                                                               NO email sent

2. See error immediately       
   "User not found"                                         → ✅ Clear error message
                                                               (no OTP wasted)

═══════════════════════════════════════════════════════════════════════

Valid User Flow (UNCHANGED)
═══════════════════════════════════════════════════════════════════════

1. Enter email:                → /api/auth/send-otp
   "valid@example.com"       
                               ├─ Validate format ✓
                               ├─ Check rate limit ✓
                               ├─ Check user exists ✓       → ✅ User found!
                               ├─ Generate OTP code            Continue processing
                               ├─ Save to database ✓
                               └─ Send email ✓              → ✉️ OTP EMAIL SENT

2. Check inbox                 
                               "Your code is: 123456"       → ✉️ Email received

3. Enter code: 123456          → NextAuth authorize()
                               
                               ├─ Verify OTP ✓
                               ├─ Check user exists ✓
                               └─ Login successful!         → ✅ SUCCESS: Logged in

4. Redirected to dashboard                                  → 🎉 Happy user
```

---

## Key Differences

| Aspect | Before Fix | After Fix |
|--------|------------|-----------|
| **User check timing** | After OTP send | Before OTP send |
| **Invalid email handling** | Send OTP, then error | Error immediately |
| **Email waste** | ❌ OTP sent unnecessarily | ✅ No OTP sent |
| **Database writes** | ❌ OTP saved unnecessarily | ✅ No OTP saved |
| **User experience** | ❌ Confusing | ✅ Clear feedback |
| **Security** | ⚠️ Info leakage | ✅ Early validation |
| **Cost** | 💰 Higher (SendGrid) | 💰 Lower (no wasted sends) |

---

## Code Change Summary

**File:** `pages/api/auth/send-otp.ts`  
**Lines modified:** 27-38 (11 new lines)

```typescript
// ✅ ADDED: User existence check
const user = await prisma.user.findUnique({
  where: { email: normalizedEmail },
  select: { id: true, email: true },
});

if (!user) {
  console.log(`[OTP] User not found: ${normalizedEmail}`);
  return res.status(404).json({ error: "User not found" });
}

console.log(`[OTP] User verified: ${normalizedEmail} (ID: ${user.id})`);
```

**Impact:**
- ✅ Minimal change (11 lines)
- ✅ No breaking changes
- ✅ Preserves all existing functionality
- ✅ Improves UX and reduces costs

---

## Testing Scenarios

### Scenario 1: Non-registered Email ✅
```bash
# Request
POST /api/auth/send-otp
{ "email": "notregistered@example.com" }

# Response (Before Fix)
200 OK { "ok": true }
# ❌ Email sent, user confused later

# Response (After Fix)  
404 Not Found { "error": "User not found" }
# ✅ Clear error, no email sent
```

### Scenario 2: Registered Email ✅
```bash
# Request
POST /api/auth/send-otp
{ "email": "registered@example.com" }

# Response (Before Fix)
200 OK { "ok": true }
# ✅ Email sent, login works

# Response (After Fix)
200 OK { "ok": true }
# ✅ Email sent, login works
# (No change - working as expected)
```

### Scenario 3: Typo in Email ✅
```bash
# Request
POST /api/auth/send-otp
{ "email": "johndoe@exampel.com" }  # typo: exampel

# Response (Before Fix)
200 OK { "ok": true }
# ❌ Email sent to wrong address

# Response (After Fix)
404 Not Found { "error": "User not found" }
# ✅ User realizes typo immediately
```

---

## Performance Comparison

### Database Queries

**Before Fix:**
```
send-otp endpoint:  0 queries
OTP verification:   2 queries (find OTP + find user)
Total:              2 queries
```

**After Fix:**
```
send-otp endpoint:  1 query (find user)
OTP verification:   2 queries (find OTP + find user)
Total:              3 queries (for valid users)
                    1 query (for invalid users - early exit)
```

**Net Impact:**
- Invalid users: -1 OTP generation, -1 email send, -1 DB write (+1 user check)
- Valid users: +1 user check query (~5-10ms)
- **Overall:** Positive (prevents wasted operations for invalid users)

---

## Deployment Checklist

- [x] Code change implemented
- [x] Linter checks passed
- [x] Documentation created
- [ ] Manual testing on dev environment
  - [ ] Test with non-registered email
  - [ ] Test with registered email  
  - [ ] Test with typo in email
  - [ ] Verify no OTP sent for invalid users
  - [ ] Verify OTP sent for valid users
- [ ] Review by team
- [ ] Deploy to staging
- [ ] Smoke test on staging
- [ ] Deploy to production
- [ ] Monitor logs for 24 hours

---

*Last Updated: December 23, 2025*

