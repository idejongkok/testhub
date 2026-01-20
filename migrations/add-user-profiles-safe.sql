-- ============================================
-- Migration: Add User Profiles Table (Safe Version)
-- ============================================
-- This migration creates a user_profiles table to store user emails
-- so we can easily display creator and executor information
-- This version is safe to run multiple times
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

-- RLS Policies - Drop and recreate to ensure they exist
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Anyone can view user profiles" ON user_profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

    -- Create policies
    CREATE POLICY "Anyone can view user profiles" ON user_profiles
        FOR SELECT USING (true);

    CREATE POLICY "Users can update own profile" ON user_profiles
        FOR UPDATE USING (auth.uid() = id);

    CREATE POLICY "Users can insert own profile" ON user_profiles
        FOR INSERT WITH CHECK (auth.uid() = id);
END $$;

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
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists, do nothing
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updated_at if function exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'update_updated_at_column'
    ) THEN
        DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
        CREATE TRIGGER update_user_profiles_updated_at
            BEFORE UPDATE ON user_profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Backfill existing users (if any)
INSERT INTO user_profiles (id, email, full_name)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Add Foreign Key Constraints
-- ============================================

-- Update foreign key for test_cases.created_by to reference user_profiles
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

-- Update foreign key for test_run_results.executed_by to reference user_profiles
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
-- Verification Queries
-- ============================================

-- Check user_profiles data
SELECT COUNT(*) as user_profiles_count FROM user_profiles;

-- Check foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('test_cases', 'test_run_results')
    AND kcu.column_name IN ('created_by', 'executed_by');

-- ============================================
-- COMPLETE!
-- ============================================
-- Now you can join test_cases and test_run_results with user_profiles
-- to display creator and executor information
-- ============================================
