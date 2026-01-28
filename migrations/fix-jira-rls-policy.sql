-- Fix: JIRA Configuration RLS Policy - Avoid infinite recursion
-- Run this after add-jira-integration.sql

-- =====================================================
-- 1. Drop existing policies that cause recursion
-- =====================================================

DROP POLICY IF EXISTS "Project admins can manage JIRA config" ON jira_configurations;
DROP POLICY IF EXISTS "Project members can read JIRA config" ON jira_configurations;

-- =====================================================
-- 2. Create security definer function to check membership
-- This avoids RLS recursion by bypassing RLS on project_members
-- =====================================================

CREATE OR REPLACE FUNCTION is_project_admin_or_owner(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = p_project_id
        AND user_id = p_user_id
        AND role IN ('owner', 'admin')
    );
END;
$$;

CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = p_project_id
        AND user_id = p_user_id
    );
END;
$$;

-- =====================================================
-- 3. Create new policies using the security definer functions
-- =====================================================

-- Policy: Project admins and owners can manage JIRA config (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins manage JIRA config" ON jira_configurations
    FOR ALL USING (
        is_project_admin_or_owner(project_id, auth.uid())
    );

-- Policy: All project members can SELECT JIRA config (to check if configured)
CREATE POLICY "Members read JIRA config" ON jira_configurations
    FOR SELECT USING (
        is_project_member(project_id, auth.uid())
    );

-- =====================================================
-- Verification
-- =====================================================
-- Test with: SELECT * FROM jira_configurations;
