# AUTH-005 Fix Implementation Plan

## Database Schema Changes (Minimal)

Add failed attempt tracking to EmailOtp model:

```prisma
model EmailOtp {
  id             Int      @id @default(autoincrement())
  email          String
  code           String
  expiresAt      DateTime
  used           Boolean  @default(false)
  failedAttempts Int      @default(0)     // NEW: Track failures
  lockedUntil    DateTime?                // NEW: Lockout timestamp
  createdAt      DateTime @default(now())
  
  @@index([email])
  @@index([code])
  @@index([lockedUntil])  // NEW: For efficient lockout queries
}
```

## Migration File

```sql
-- Add failed attempt tracking to EmailOtp
ALTER TABLE "EmailOtp" ADD COLUMN "failedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EmailOtp" ADD COLUMN "lockedUntil" TIMESTAMP(3);
CREATE INDEX "EmailOtp_lockedUntil_idx" ON "EmailOtp"("lockedUntil");
```

## Frontend Changes

### 1. Input Validation (pages/login.tsx)

```typescript
const [failedAttempts, setFailedAttempts] = useState(0);
const [isLocked, setIsLocked] = useState(false);
const [lockoutTime, setLockoutTime] = useState<Date | null>(null);

// Add numeric-only validation
function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
  const value = e.target.value;
  // Only allow digits
  if (/^\d*$/.test(value)) {
    setCode(value);
  }
}

async function handleVerifyCode(e: React.FormEvent) {
  e.preventDefault();
  
  // Check if locked
  if (isLocked && lockoutTime && new Date() < lockoutTime) {
    const remainingSeconds = Math.ceil((lockoutTime.getTime() - Date.now()) / 1000);
    setError(`Account locked. Try again in ${remainingSeconds} seconds.`);
    return;
  }
  
  setError("");
  setLoading(true);

  const result = await signIn("otp", {
    email,
    code,
    redirect: false,
  });

  setLoading(false);

  if (result?.error) {
    // Handle lockout response
    if (result.error.includes("locked")) {
      setIsLocked(true);
      setLockoutTime(new Date(Date.now() + 5 * 60 * 1000)); // 5 minutes
      setError(result.error);
    } else {
      setFailedAttempts(prev => prev + 1);
      setError(`Invalid code. ${3 - failedAttempts - 1} attempts remaining.`);
    }
  } else {
    router.push("/overview");
  }
}

// Update JSX
<input
  type="tel"  // Better for numeric on mobile
  inputMode="numeric"  // Forces numeric keyboard
  pattern="[0-9]*"  // HTML5 validation
  value={code}
  onChange={handleCodeChange}  // NEW: Validated handler
  disabled={isLocked}  // NEW: Disable when locked
  maxLength={6}
  required
  autoFocus={!isLocked}
/>

<button
  type="submit"
  disabled={loading || code.length < 6 || isLocked}  // NEW: Disable when locked
>
  {loading ? "Verifying..." : isLocked ? "Account Locked" : "Verify & Sign In"}
</button>
```

### 2. Backend Enforcement (pages/api/auth/[...nextauth].ts)

```typescript
async authorize(credentials) {
  if (!credentials?.email || !credentials?.code) {
    return null;
  }

  const normalizedEmail = credentials.email.toLowerCase().trim();
  const normalizedCode = String(credentials.code).trim().replace(/\s+/g, '');
  
  // Validate code format (must be 6 digits)
  if (!/^\d{6}$/.test(normalizedCode)) {
    console.log(`[AUTH] Invalid code format for ${normalizedEmail}`);
    return null;
  }

  // Find the OTP record
  const otp = await prisma.emailOtp.findFirst({
    where: {
      email: normalizedEmail,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    console.log(`[AUTH] No OTP found for ${normalizedEmail}`);
    return null;
  }

  // Check if locked
  if (otp.lockedUntil && otp.lockedUntil > new Date()) {
    const remainingSeconds = Math.ceil((otp.lockedUntil.getTime() - Date.now()) / 1000);
    console.log(`[AUTH] Account locked for ${normalizedEmail}, ${remainingSeconds}s remaining`);
    throw new Error(`Account locked. Try again in ${remainingSeconds} seconds.`);
  }

  // Check if OTP matches
  if (otp.code !== normalizedCode || otp.used) {
    // Increment failed attempts
    const newFailedAttempts = otp.failedAttempts + 1;
    
    if (newFailedAttempts >= 3) {
      // Lock account for 5 minutes
      const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
      await prisma.emailOtp.update({
        where: { id: otp.id },
        data: {
          failedAttempts: newFailedAttempts,
          lockedUntil: lockedUntil,
        },
      });
      console.log(`[AUTH] Account locked for ${normalizedEmail} until ${lockedUntil.toISOString()}`);
      throw new Error(`Too many failed attempts. Account locked for 5 minutes.`);
    } else {
      // Just increment failed attempts
      await prisma.emailOtp.update({
        where: { id: otp.id },
        data: { failedAttempts: newFailedAttempts },
      });
      console.log(`[AUTH] Failed attempt ${newFailedAttempts}/3 for ${normalizedEmail}`);
      return null;
    }
  }

  // Valid OTP - mark as used and reset failed attempts
  await prisma.emailOtp.update({
    where: { id: otp.id },
    data: {
      used: true,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });
  
  console.log(`[AUTH] OTP verified for ${normalizedEmail}`);

  // Continue with user lookup...
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      ventures: {
        select: { ventureId: true },
      },
    },
  });

  if (!user) {
    console.log(`[AUTH] User not found: ${normalizedEmail}`);
    return null;
  }

  // ... rest of the auth flow
}
```

## Testing Checklist

- [ ] OTP input only accepts numbers
- [ ] Letters and special characters are rejected
- [ ] First wrong attempt: "Invalid code. 2 attempts remaining."
- [ ] Second wrong attempt: "Invalid code. 1 attempt remaining."
- [ ] Third wrong attempt: "Too many failed attempts. Account locked for 5 minutes."
- [ ] Input field disabled when locked
- [ ] Submit button disabled when locked
- [ ] Lock expires after 5 minutes
- [ ] Correct code resets failed attempts
- [ ] New OTP request resets lockout

## Summary of Changes

**Database:**
- Add `failedAttempts` column (integer, default 0)
- Add `lockedUntil` column (timestamp, nullable)
- Add index on `lockedUntil`

**Frontend (pages/login.tsx):**
- Change input type to `tel` with `inputMode="numeric"`
- Add `handleCodeChange` with numeric validation
- Add lockout state tracking
- Disable input and button when locked
- Show remaining attempts in error message

**Backend (pages/api/auth/[...nextauth].ts):**
- Validate OTP format (6 digits)
- Check lockout before verification
- Increment failed attempts on wrong code
- Lock account after 3 failures (5 minutes)
- Reset failed attempts on success
- Throw error for locked accounts

## Migration Path

1. Create migration file
2. Run `npx prisma migrate dev --name add_otp_lockout`
3. Update backend code
4. Update frontend code
5. Test thoroughly
6. Deploy

## Rollback Plan

If issues arise:

```sql
ALTER TABLE "EmailOtp" DROP COLUMN "failedAttempts";
ALTER TABLE "EmailOtp" DROP COLUMN "lockedUntil";
DROP INDEX "EmailOtp_lockedUntil_idx";
```

Then revert code changes.

