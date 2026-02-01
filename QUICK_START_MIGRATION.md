# 🚀 Quick Start - Fix Missing Projects

**Problem:** Projects show in notes table but not in sidebar  
**Solution:** Run the auto-migration (takes ~2 minutes)  
**Safety:** Non-destructive, includes rollback

---

## ⚡ 3-Step Quick Fix

### 1️⃣ Check What Needs Fixing
```bash
npx tsx scripts/migrate-orphaned-projects.ts
```
**What to look for:** "Found X orphaned projects"

---

### 2️⃣ Run the Migration

**Option A: Supabase Dashboard (Recommended)**
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Go to **SQL Editor** → **New Query**
3. Copy & paste entire contents of:
   ```
   supabase/migrations/011_migrate_orphaned_projects.sql
   ```
4. Click **Run** (bottom right)
5. Wait for "SUCCESS: All orphaned records have been migrated"

**Option B: Supabase CLI**
```bash
npx supabase db push
```

---

### 3️⃣ Verify It Worked
```bash
npx tsx scripts/verify-migration-success.ts
```
**What to look for:** "✓ VERIFICATION PASSED - Migration Successful!"

---

## ✅ Done! Now Test Your App

1. **Restart dev server:**
   ```bash
   npm run dev
   ```

2. **Check the notes page:**
   - Go to `/notes`
   - Projects should show correct names (no warnings)

3. **Check the sidebar:**
   - Look at "PRD" section → "Add Project"
   - Your missing projects (e.g., "cewa") should now appear

---

## 🆘 If Something Goes Wrong

**See warnings in verification?**
- Read: `MIGRATION_GUIDE_ORPHANED_PROJECTS.md`
- Section: "Troubleshooting"

**Need to rollback?**
- Restore from Supabase backup
- Or run rollback SQL from migration file (bottom section)

**Still stuck?**
- Check browser console for errors
- Check Supabase logs
- Review migration SQL output

---

## 📚 Full Documentation

- **Complete Guide:** `MIGRATION_GUIDE_ORPHANED_PROJECTS.md`
- **Technical Details:** `IMPLEMENTATION_SUMMARY.md`
- **Migration SQL:** `supabase/migrations/011_migrate_orphaned_projects.sql`

---

**Time Required:** ~2 minutes  
**Risk Level:** Low (non-destructive)  
**Backup Required:** Yes (automatic via Supabase)
