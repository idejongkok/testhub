-- ============================================
-- Migration: Add User Profiles Table
-- ============================================
-- This migration creates a user_profiles table to store user emails
-- so we can easily display creator and executor information
-- ============================================

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can view all profiles (to see creator/executor names)
CREATE POLICY "Anyone can view user profiles" ON user_profiles
    FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Backfill existing users (if any)
INSERT INTO user_profiles (id, email, full_name)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Add Foreign Key Constraints (if not exists)
-- ============================================

-- Check and add foreign key for test_cases.created_by if it doesn't reference user_profiles
DO $$
BEGIN
    -- Drop existing FK to auth.users if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'test_cases_created_by_fkey'
        AND table_name = 'test_cases'
    ) THEN
        ALTER TABLE test_cases DROP CONSTRAINT test_cases_created_by_fkey;
    END IF;

    -- Add new FK to user_profiles
    ALTER TABLE test_cases
        ADD CONSTRAINT test_cases_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES user_profiles(id)
        ON DELETE SET NULL;
END $$;

-- Check and add foreign key for test_run_results.executed_by if it doesn't reference user_profiles
DO $$
BEGIN
    -- Drop existing FK to auth.users if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'test_run_results_executed_by_fkey'
        AND table_name = 'test_run_results'
    ) THEN
        ALTER TABLE test_run_results DROP CONSTRAINT test_run_results_executed_by_fkey;
    END IF;

    -- Add new FK to user_profiles
    ALTER TABLE test_run_results
        ADD CONSTRAINT test_run_results_executed_by_fkey
        FOREIGN KEY (executed_by)
        REFERENCES user_profiles(id)
        ON DELETE SET NULL;
END $$;

-- ============================================
-- COMPLETE!
-- ============================================
-- Now you can join test_cases and test_run_results with user_profiles
-- to display creator and executor information
-- ============================================
