-- Fix RLS policies to optimize performance
-- This script fixes the auth_rls_initplan issues by recreating service_role_all_access policies
-- with optimized auth function calls wrapped in subqueries
--
-- Pattern: Replace auth.role() with (select auth.role()) to prevent per-row re-evaluation

-- List of all tables from the CSV file that need fixing
DO $$
DECLARE
    table_names TEXT[] := ARRAY[
        'AiDraftTemplate', 'AiUsageLog', 'ApiRouteConfig', 'ApprovalRouting',
        'Attendance', 'AuditCheck', 'AuditIssue', 'AuditLog', 'AuditRun',
        'BankAccount', 'BankAccountSnapshot', 'BankSnapshot', 'BpoAgent',
        'BpoAgentMetric', 'BpoCallLog', 'BpoCampaign', 'BpoDailyMetric',
        'BpoKpiRecord', 'Carrier', 'CarrierContact', 'CarrierDispatcher',
        'CarrierPreferredLane', 'CarrierVentureStats', 'Customer',
        'CustomerApproval', 'CustomerApprovalRequest', 'CustomerTouch',
        'DispatchConversation', 'DispatchDriver', 'DispatchLoad',
        'DispatchMessage', 'DispatchTruck', 'EodReport', 'EmailLog',
        'EmailOtp', 'EmailProviderConnection', 'EmployeeKpiDaily',
        'FeedbackSubmission', 'File', 'FmcsaSyncLog', 'FreightKpiDaily',
        'FreightQuote', 'GamificationConfig', 'GamificationEvent',
        'GamificationPointsBalance', 'GeneralLedgerEntry', 'HoldingAsset',
        'HoldingAssetDocument', 'HotelDailyReport', 'HotelDispute',
        'HotelDisputeNote', 'HotelKpiDaily', 'HotelNightAudit',
        'HotelPnlMonthly', 'HotelProperty', 'HotelReview', 'ImportJob',
        'ImportMapping', 'ImpersonationLog', 'IncentiveDaily',
        'IncentivePlan', 'IncentivePayout', 'IncentiveQualification',
        'IncentiveRule', 'IncentiveScenario', 'InsurancePolicy', 'ITAsset',
        'ITAssetFile', 'ITAssetHistory', 'ITIncident', 'ITIncidentTag',
        'ITIncidentTagMapping', 'JobDepartment', 'JobRole', 'JobRunLog',
        'Load', 'LogisticsLoadEvent', 'LogisticsShipper', 'LostLoadReason',
        'MissedEodExplanation', 'Notification', 'Office', 'OfficeUser',
        'OutreachAttribution', 'OutreachConversation', 'OutreachMessage',
        'OutreachRecipient', 'OutreachReply', 'PermissionMatrix', 'Policy',
        'RateLimitWindow', 'SaasCustomer', 'SaasSubscription',
        'SalesClientOnboarding', 'SalesPersonCost', 'Settlement',
        'ShipperPreferredLane', 'StaffAlias', 'Task', 'TaskOverdueExplanation',
        'ThreePlLoadMapping', 'User', 'UserIncentiveOverride', 'UserMapping',
        'UserPreferences', 'Venture', 'VentureOutboundConfig',
        'VenturePermissionOverride', 'VentureUser', 'WebhookQuarantine'
    ];
    table_name TEXT;
    policy_exists BOOLEAN;
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        -- Check if policy exists
        SELECT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = table_name
            AND policyname = 'service_role_all_access'
            AND schemaname = 'public'
        ) INTO policy_exists;
        
        IF policy_exists THEN
            -- Drop existing policy
            EXECUTE format('DROP POLICY IF EXISTS service_role_all_access ON public.%I', table_name);
            
            -- Recreate with optimized version
            -- For service_role, we use (select auth.role()) = ''service_role'' to prevent per-row evaluation
            EXECUTE format(
                'CREATE POLICY service_role_all_access ON public.%I FOR ALL TO service_role USING ((select auth.role()) = ''service_role'')',
                table_name
            );
            
            RAISE NOTICE 'Fixed policy on table: %', table_name;
        ELSE
            RAISE NOTICE 'Policy not found on table: % (skipping)', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Finished processing all tables';
END $$;

