# 🚀 Run This in Supabase SQL Editor

## The Problem

The previous SQL script (`tmp_rovodev_complete_employee_fix.sql`) had `\echo` commands that only work in `psql` command-line tool, not in Supabase SQL Editor.

---

## ✅ Solution: Use the New Script

**File to use:** `tmp_rovodev_simple_employee_fix.sql`

This version:
- ✅ Works in Supabase SQL Editor
- ✅ No `\echo` commands
- ✅ Uses `RAISE NOTICE` instead (Supabase-compatible)
- ✅ Does all the same fixes

---

## 📋 Steps to Run

### 1. Open Supabase SQL Editor
Go to: https://app.supabase.com/project/YOUR_PROJECT/sql

### 2. Copy the Script
Open the file: **`tmp_rovodev_simple_employee_fix.sql`**

Copy ALL the contents (Ctrl+A, Ctrl+C)

### 3. Paste and Run
1. Paste into the Supabase SQL Editor
2. Click the **"Run"** button (green button at top right)
3. Wait for it to complete

### 4. Check the Results

Look for these messages in the output:

✅ **Success messages:**
```
NOTICE: Dropped global UNIQUE constraint on email
NOTICE: Soft-deleted X duplicate employee record(s)
NOTICE: Total active employees: X
NOTICE: Unique email-workspace combinations: X
NOTICE: SUCCESS: No duplicate emails in the same workspace
```

✅ **Final query result:**
Should return **0 rows** (no duplicates found)

---

## 🎯 After Running

1. ✅ Refresh your application
2. ✅ Go to Employees page
3. ✅ Try adding a new employee
4. ✅ Should see: "Employee added successfully"
5. ✅ Check toast/console for invitation link

---

## ⚠️ If You Still Get Errors

### "Index already exists"
This is **OK** - it means the constraint was already created. The script will just skip it.

### "No duplicates found"
This is **GOOD** - means you don't have duplicate employees.

### Still seeing duplicate key error when adding employee
Check if you're trying to add an email that already exists:

```sql
-- Run this to check:
SELECT 
    id, 
    first_name, 
    last_name, 
    email, 
    workspace_id,
    is_deleted
FROM employees
WHERE email = 'the-email-you-tried-to-add@example.com';
```

If you see a row with `is_deleted = false`, that email is already in use. Use a different email.

---

## 📝 What This Script Does

1. Removes old global email constraint (if it exists)
2. Creates workspace-scoped email uniqueness
3. Soft-deletes duplicate employee records (keeps most recent)
4. Verifies no duplicates remain
5. Shows summary of what was fixed

---

## ✅ Success = Ready to Add Employees!

After running this successfully, you can add employees and:
- Employee will be created ✅
- Invitation link will show in toast (10 seconds) ✅
- Invitation link will be in console ✅
- You share the link manually ✅

---

**Use:** `tmp_rovodev_simple_employee_fix.sql`  
**Ignore:** `tmp_rovodev_complete_employee_fix.sql` (had the \echo syntax error)
