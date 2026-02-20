# 🚀 Deployment Checklist - Messaging System Fix

## Pre-Deployment Verification

### ✅ Local Testing
- [ ] Code compiles without errors
- [ ] All TypeScript types are correct
- [ ] No console errors when clicking channels
- [ ] Messages load successfully
- [ ] Sender names and avatars display correctly
- [ ] Can send new messages
- [ ] Direct messages work
- [ ] Thread replies work

### ✅ Database Preparation
- [ ] Review migration file: `supabase/migrations/019_fix_messages_foreign_key.sql`
- [ ] Backup production database (if applicable)
- [ ] Test migration on staging environment first

## Deployment Steps

### Step 1: Apply Database Migration

**Option A: Using Supabase CLI** (Recommended)
```bash
supabase migration up
```

**Option B: Manual SQL Execution**
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/019_fix_messages_foreign_key.sql`
3. Execute the SQL
4. Verify no errors

**Verify Migration Success:**
```sql
-- Check foreign key exists
SELECT conname 
FROM pg_constraint 
WHERE conname = 'messages_sender_id_fkey';

-- Should return 1 row: messages_sender_id_fkey
```

### Step 2: Sync Existing Users

**Run this SQL to sync all auth.users to users table:**
```sql
-- Insert any missing users from auth.users to users table
INSERT INTO users (id, email, name, avatar, role)
SELECT 
    au.id, 
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', SPLIT_PART(au.email, '@', 1)),
    au.raw_user_meta_data->>'avatar_url',
    'member'
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = au.id
);
```

**Verify Sync:**
```sql
-- Check all auth users have corresponding users entries
SELECT COUNT(*) as missing_users
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- Should return 0
```

### Step 3: Deploy Code Changes

**For Vercel/Next.js:**
```bash
git add .
git commit -m "fix: messaging system SQL join error and auth user sync"
git push origin main
```

**For Self-Hosted:**
```bash
npm run build
# Deploy build/ directory to your hosting
```

### Step 4: Verify Production Deployment

- [ ] Visit production URL
- [ ] Sign in with a test account
- [ ] Navigate to Messages
- [ ] Click on a channel
- [ ] Verify messages load without errors
- [ ] Check browser console - should be clean
- [ ] Send a test message
- [ ] Verify sender name/avatar appear

### Step 5: Monitor & Validate

**Check Logs:**
```bash
# Vercel
vercel logs

# Or check your hosting provider's logs
```

**Expected Console Output:**
```
✓ Synced auth user user@example.com to users table
✓ Auth token refreshed successfully
```

**No Errors Like:**
```
❌ Error fetching channel messages: {}
❌ Failed to fetch channel messages: {}
```

## Post-Deployment Checks

### ✅ Functionality
- [ ] All channels load correctly
- [ ] Direct messages work
- [ ] Thread replies work
- [ ] New messages send successfully
- [ ] Message reactions work
- [ ] Real-time updates work

### ✅ Performance
- [ ] Messages load within 1-2 seconds
- [ ] No N+1 query issues
- [ ] Real-time subscriptions don't cause lag

### ✅ User Experience
- [ ] Sender names display correctly
- [ ] Avatars load properly
- [ ] No UI flickering or errors
- [ ] Error messages are user-friendly

## Rollback Plan

If issues occur, rollback procedure:

### Step 1: Revert Code
```bash
git revert HEAD
git push origin main
```

### Step 2: Revert Database (if needed)
```sql
-- Only if migration causes issues
-- The migration is backward compatible, so rollback is usually not needed
```

### Step 3: Notify Team
- [ ] Alert users of temporary issues
- [ ] Post status update
- [ ] Schedule fix deployment

## Troubleshooting

### Issue: Messages still not loading

**Check 1: Migration Applied?**
```sql
SELECT conname FROM pg_constraint WHERE conname = 'messages_sender_id_fkey';
```

**Check 2: Users Synced?**
```sql
SELECT COUNT(*) FROM users;
-- Should be > 0
```

**Check 3: RLS Policies?**
```sql
-- Ensure users table is readable
SELECT * FROM users LIMIT 1;
-- Should not error
```

### Issue: Sender names missing

**Fix: Sync user data**
```typescript
import { ensureCurrentUserInUsersTable } from '@/lib/db/sync-auth-users';
await ensureCurrentUserInUsersTable();
```

### Issue: Permission errors

**Fix: Update RLS policies**
```sql
-- Allow authenticated users to read users table
CREATE POLICY IF NOT EXISTS "Users can read all users"
ON users FOR SELECT
TO authenticated
USING (true);
```

## Success Criteria

✅ **All checks must pass:**
- Zero console errors when loading channels
- Messages display with sender names
- Avatars load correctly
- Can send/receive messages
- Real-time updates work
- No performance degradation

## Timeline

| Step | Duration | Owner |
|------|----------|-------|
| Apply Migration | 5 min | DevOps |
| Sync Users | 5 min | DevOps |
| Deploy Code | 10 min | DevOps |
| Verification | 15 min | QA |
| Monitoring | 24 hours | DevOps |

**Total Estimated Time:** 35 minutes + 24h monitoring

## Support Contacts

- **Technical Issues:** Check `MESSAGING_FIX_COMPLETE.md`
- **Quick Reference:** Check `MESSAGING_FIX_QUICK_GUIDE.md`
- **Database Issues:** Review migration SQL
- **Code Issues:** Check modified files list

---

**Deployment Status:** ⏳ Ready to Deploy  
**Last Updated:** 2026-02-08  
**Prepared By:** Rovo Dev - Head of Development

## Sign-off

- [ ] **Developer:** Code reviewed and tested locally
- [ ] **DevOps:** Migration reviewed and ready to execute
- [ ] **QA:** Test plan prepared
- [ ] **Product:** Changes approved

**Ready to deploy!** 🚀
