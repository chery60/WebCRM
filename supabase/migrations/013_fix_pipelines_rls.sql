-- Supabase Database Migration Script
-- Venture CRM - Fix Pipelines RLS Policies
-- Fixes "new row violates row-level security policy" error during deletion (soft delete)
-- Run this in Supabase SQL Editor

-- ============================================
-- FIX PIPELINES RLS
-- ============================================

-- Drop existing restricted policies to ensure clean state
DROP POLICY IF EXISTS "Users can view own pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can create own pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can update own pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can delete own pipelines" ON pipelines;

-- Re-create policies with explicit checks
-- 1. View: Users can view their own non-deleted pipelines
CREATE POLICY "Users can view own pipelines"
  ON pipelines FOR SELECT
  USING (user_id = auth.uid() AND is_deleted = false);

-- 2. Create: Users can create pipelines assigned to themselves
CREATE POLICY "Users can create own pipelines"
  ON pipelines FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 3. Update: Users can update their own pipelines
-- IMPORTANT: The WITH CHECK clause is crucial here. 
-- When updating, the new row must still satisfy the RLS policy.
-- Since we are doing a soft delete (setting is_deleted = true), 
-- if we had 'is_deleted = false' in the USING/CHECK clause, the update would fail.
-- We only enforce user ownership for updates.
CREATE POLICY "Users can update own pipelines"
  ON pipelines FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Delete: Users can delete their own pipelines (hard delete if ever used)
CREATE POLICY "Users can delete own pipelines"
  ON pipelines FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- VERIFICATION
-- ============================================
-- To verify, inspect policies:
-- SELECT * FROM pg_policies WHERE tablename = 'pipelines';
