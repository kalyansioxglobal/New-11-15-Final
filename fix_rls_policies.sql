-- Fix RLS policies to optimize performance
-- This script fixes the auth_rls_initplan issues by wrapping auth functions in subqueries
-- According to Supabase docs: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- The fix: Replace auth.<function>() with (select auth.<function>())

DO $$
DECLARE
    r RECORD;
    policy_qual TEXT;
    policy_with_check TEXT;
    new_qual TEXT;
    new_with_check TEXT;
BEGIN
    -- Loop through all policies named 'service_role_all_access'
    FOR r IN 
        SELECT 
            polrelid::regclass::text AS table_name,
            polname AS policy_name,
            pg_get_expr(polqual, polrelid) AS using_expression,
            pg_get_expr(polwithcheck, polrelid) AS with_check_expression
        FROM pg_policy
        WHERE polname = 'service_role_all_access'
    LOOP
        -- Get current expressions
        policy_qual := r.using_expression;
        policy_with_check := r.with_check_expression;
        
        -- Drop the existing policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON %s', 
            r.policy_name, r.table_name);
        
        -- Transform USING expression
        IF policy_qual IS NULL OR policy_qual = 'true' THEN
            new_qual := 'true';
        ELSE
            -- Replace auth.<function>() with (select auth.<function>())
            new_qual := regexp_replace(
                policy_qual,
                '\bauth\.([a-z_]+)\(\)',
                '(select auth.\1())',
                'gi'
            );
            -- Replace current_setting(...) with (select current_setting(...))
            new_qual := regexp_replace(
                new_qual,
                '\bcurrent_setting\(',
                '(select current_setting(',
                'gi'
            );
        END IF;
        
        -- Transform WITH CHECK expression (if exists)
        IF policy_with_check IS NOT NULL THEN
            new_with_check := regexp_replace(
                policy_with_check,
                '\bauth\.([a-z_]+)\(\)',
                '(select auth.\1())',
                'gi'
            );
            new_with_check := regexp_replace(
                new_with_check,
                '\bcurrent_setting\(',
                '(select current_setting(',
                'gi'
            );
        ELSE
            new_with_check := NULL;
        END IF;
        
        -- Recreate policy with optimized expressions
        IF new_with_check IS NULL THEN
            EXECUTE format(
                'CREATE POLICY %I ON %s FOR ALL TO service_role USING (%s)',
                r.policy_name, r.table_name, new_qual
            );
        ELSE
            EXECUTE format(
                'CREATE POLICY %I ON %s FOR ALL TO service_role USING (%s) WITH CHECK (%s)',
                r.policy_name, r.table_name, new_qual, new_with_check
            );
        END IF;
        
        RAISE NOTICE 'Fixed policy % on table %', r.policy_name, r.table_name;
    END LOOP;
    
    RAISE NOTICE 'Finished fixing RLS policies';
END $$;
