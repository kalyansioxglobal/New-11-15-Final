-- Fix RLS policies to optimize performance
-- For service_role policies, the simplest and most performant pattern is to use 'true'
-- This avoids any auth function calls that could be re-evaluated per row

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
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        BEGIN
            -- Drop existing policy
            EXECUTE format('DROP POLICY IF EXISTS service_role_all_access ON public.%I', table_name);
            
            -- Recreate with simple 'true' condition (most performant for service_role)
            EXECUTE format(
                'CREATE POLICY service_role_all_access ON public.%I FOR ALL TO service_role USING (true)',
                table_name
            );
            
            RAISE NOTICE 'Fixed policy on table: %', table_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error fixing table %: %', table_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Finished processing all tables';
END $$;

