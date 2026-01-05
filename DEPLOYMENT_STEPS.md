# Step-by-Step Deployment Guide

## Current Status
- **Your branch:** `master` (development)
- **Production branch:** `main` 
- **Changes:** Toast notifications + other improvements
- **Database:** ✅ Already up-to-date (no migrations needed)

---

## Step 1: Test Build Locally (VERIFY BEFORE PUSHING)

**Before committing, let's verify the code builds successfully:**

```bash
# Make sure you're on master branch
git branch  # Should show * master

# Test the build (this will catch any errors)
npm run build
```

**Expected result:** Build completes successfully (warnings are OK, errors are not)

**If build fails:** Fix errors before proceeding.

---

## Step 2: Commit Your Changes

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Add toast notifications to policies pages and UI improvements

- Add ToastProvider component for global toast notifications
- Add toast messages to policies pages (create, update, delete)
- Add toast messages to admin policies page
- UI improvements for light/dark theme support
- Database schema already up-to-date, no migrations needed"

# Verify commit
git log -1  # Should show your commit
```

---

## Step 3: Push to Master Branch

```bash
# Push to master branch (your development branch)
git push origin master
```

**This will:**
- Push your changes to GitHub
- Make them available for PR
- Allow team members to review

---

## Step 4: Create Pull Request to Main

**Option A: Via GitHub Website (Recommended)**

1. Go to: https://github.com/kalyansioxglobal/New-11-15-Final
2. You should see a banner saying "master had recent pushes" with a "Compare & pull request" button
3. Click "Compare & pull request"
4. Fill in PR details:
   - **Title:** `feat: Add toast notifications and UI improvements`
   - **Description:**
     ```
     ## Changes
     - Add toast notifications to policies pages (create, update, delete operations)
     - Add ToastProvider component for global toast notifications
     - UI improvements for light/dark theme support
     - Database schema already verified and up-to-date
     
     ## Testing
     - [x] Build passes locally
     - [ ] Manual testing completed (toasts appear correctly)
     - [ ] No database migrations needed (verified)
     
     ## Deployment Notes
     - No database changes required
     - Frontend-only changes
     - Safe to deploy
     ```
5. Click "Create pull request"

**Option B: Via GitHub CLI (if installed)**

```bash
gh pr create --base main --head master --title "feat: Add toast notifications and UI improvements" --body "Add toast notifications to policies pages and UI improvements"
```

---

## Step 5: CI/CD (If Applicable)

**Note:** I don't see any CI/CD configuration files in your repo, so there might not be automated CI.

**If you have CI/CD:**
- GitHub Actions will run automatically when PR is created
- Wait for CI to pass (check PR page for status)
- If CI fails, fix issues and push again

**If you DON'T have CI/CD:**
- Skip this step
- Proceed to code review

---

## Step 6: Code Review & Merge

1. **Wait for code review** (if required by your team)
2. **Address any review comments** (make changes, push updates)
3. **Once approved, merge the PR:**
   - Click "Merge pull request" on GitHub
   - Choose merge strategy (usually "Create a merge commit" or "Squash and merge")
   - Confirm merge

---

## Step 7: Deploy to Production

**Since you're using Replit (based on `.replit` file):**

1. **After PR is merged to main:**
   ```bash
   # Switch to main branch locally (optional, for verification)
   git checkout main
   git pull origin main
   ```

2. **Deploy via Replit:**
   - Go to Replit dashboard
   - The deployment should trigger automatically if connected to GitHub
   - OR manually trigger deployment from Replit
   - Build command: `npm run build`
   - Run command: `npm start`

3. **Verify deployment:**
   - Check application logs
   - Test toast notifications on policies pages
   - Verify all features work correctly

---

## Quick Command Summary

```bash
# 1. Test build locally
npm run build

# 2. Commit changes
git add .
git commit -m "feat: Add toast notifications and UI improvements"

# 3. Push to master
git push origin master

# 4. Create PR via GitHub website (recommended)
# OR use GitHub CLI:
gh pr create --base main --head master --title "feat: Add toast notifications" --body "Description"

# 5. After PR approval, merge via GitHub
# 6. Deploy via Replit (automatic or manual)
```

---

## Troubleshooting

### Build fails locally
- Check error messages
- Fix TypeScript/ESLint errors
- Run `npm install` if dependencies are missing
- Try `rm -rf .next node_modules/.prisma && npm run build`

### Push is rejected
- Someone else pushed to master? Pull first: `git pull origin master --rebase`
- Fix conflicts if any
- Push again: `git push origin master`

### PR creation fails
- Make sure you pushed to master first
- Check GitHub permissions
- Verify branch names are correct

### Deployment fails
- Check Replit logs
- Verify environment variables are set
- Check database connection
- Review deployment logs for errors

---

## Safety Checklist

Before creating PR:
- [x] Code builds successfully (`npm run build`)
- [x] Database schema verified (already up-to-date)
- [x] Changes committed
- [ ] Manual testing completed (optional but recommended)
- [ ] Code reviewed (self-review at minimum)

Before merging PR:
- [ ] PR approved by team (if required)
- [ ] CI passes (if CI/CD is configured)
- [ ] No merge conflicts
- [ ] Deployment plan ready

---

## Need Help?

If you encounter any issues:
1. Check error messages carefully
2. Review git status: `git status`
3. Check branch: `git branch`
4. View recent commits: `git log --oneline -5`

