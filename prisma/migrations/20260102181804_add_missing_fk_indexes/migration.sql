-- Add missing indexes for foreign keys and common query patterns
-- This addresses Supabase performance issues with sequential scans on foreign keys

-- Office model foreign keys
CREATE INDEX IF NOT EXISTS "Office_ventureId_idx" ON "Office"("ventureId");

-- Task model foreign keys  
CREATE INDEX IF NOT EXISTS "Task_officeId_idx" ON "Task"("officeId");
CREATE INDEX IF NOT EXISTS "Task_createdBy_idx" ON "Task"("createdBy");
CREATE INDEX IF NOT EXISTS "Task_customerId_idx" ON "Task"("customerId");
CREATE INDEX IF NOT EXISTS "Task_loadId_idx" ON "Task"("loadId");
CREATE INDEX IF NOT EXISTS "Task_quoteId_idx" ON "Task"("quoteId");

-- Policy model foreign keys
CREATE INDEX IF NOT EXISTS "Policy_officeId_idx" ON "Policy"("officeId");
CREATE INDEX IF NOT EXISTS "Policy_createdBy_idx" ON "Policy"("createdBy");

-- HotelProperty model foreign keys
CREATE INDEX IF NOT EXISTS "HotelProperty_ventureId_idx" ON "HotelProperty"("ventureId");

-- HotelKpiDaily model foreign keys
CREATE INDEX IF NOT EXISTS "HotelKpiDaily_hotelId_idx" ON "HotelKpiDaily"("hotelId");

-- HotelDailyReport model foreign keys
CREATE INDEX IF NOT EXISTS "HotelDailyReport_hotelId_idx" ON "HotelDailyReport"("hotelId");

-- HotelNightAudit model foreign keys
CREATE INDEX IF NOT EXISTS "HotelNightAudit_hotelId_idx" ON "HotelNightAudit"("hotelId");
CREATE INDEX IF NOT EXISTS "HotelNightAudit_postedByUserId_idx" ON "HotelNightAudit"("postedByUserId");

-- HotelPnlMonthly model foreign keys
CREATE INDEX IF NOT EXISTS "HotelPnlMonthly_hotelId_idx" ON "HotelPnlMonthly"("hotelId");

-- GeneralLedgerEntry model foreign keys
CREATE INDEX IF NOT EXISTS "GeneralLedgerEntry_hotelId_idx" ON "GeneralLedgerEntry"("hotelId");

-- Load model foreign keys (additional ones that might be missing)
CREATE INDEX IF NOT EXISTS "Load_officeId_idx" ON "Load"("officeId");
CREATE INDEX IF NOT EXISTS "Load_createdById_idx" ON "Load"("createdById");
CREATE INDEX IF NOT EXISTS "Load_lostReasonId_idx" ON "Load"("lostReasonId");

-- LogisticsShipper model foreign keys
CREATE INDEX IF NOT EXISTS "LogisticsShipper_ventureId_idx" ON "LogisticsShipper"("ventureId");
CREATE INDEX IF NOT EXISTS "LogisticsShipper_customerId_idx" ON "LogisticsShipper"("customerId");

-- LogisticsLoadEvent model foreign keys
CREATE INDEX IF NOT EXISTS "LogisticsLoadEvent_loadId_idx" ON "LogisticsLoadEvent"("loadId");
CREATE INDEX IF NOT EXISTS "LogisticsLoadEvent_createdById_idx" ON "LogisticsLoadEvent"("createdById");

-- FreightQuote model foreign keys
CREATE INDEX IF NOT EXISTS "FreightQuote_shipperId_idx" ON "FreightQuote"("shipperId");

-- HotelReview model foreign keys
CREATE INDEX IF NOT EXISTS "HotelReview_hotelId_idx" ON "HotelReview"("hotelId");
CREATE INDEX IF NOT EXISTS "HotelReview_respondedById_idx" ON "HotelReview"("respondedById");

-- BpoCampaign model foreign keys
CREATE INDEX IF NOT EXISTS "BpoCampaign_officeId_idx" ON "BpoCampaign"("officeId");

-- BpoAgent model foreign keys
CREATE INDEX IF NOT EXISTS "BpoAgent_userId_idx" ON "BpoAgent"("userId");
CREATE INDEX IF NOT EXISTS "BpoAgent_campaignId_idx" ON "BpoAgent"("campaignId");

-- BpoKpiRecord model foreign keys
CREATE INDEX IF NOT EXISTS "BpoKpiRecord_agentId_idx" ON "BpoKpiRecord"("agentId");

-- BpoCallLog model foreign keys
CREATE INDEX IF NOT EXISTS "BpoCallLog_officeId_idx" ON "BpoCallLog"("officeId");

-- SaasCustomer model foreign keys
CREATE INDEX IF NOT EXISTS "SaasCustomer_ventureId_idx" ON "SaasCustomer"("ventureId");

-- HoldingAssetDocument model foreign keys
CREATE INDEX IF NOT EXISTS "HoldingAssetDocument_assetId_idx" ON "HoldingAssetDocument"("assetId");
CREATE INDEX IF NOT EXISTS "HoldingAssetDocument_uploadedById_idx" ON "HoldingAssetDocument"("uploadedById");

-- BankSnapshot model foreign keys
CREATE INDEX IF NOT EXISTS "BankSnapshot_bankAccountId_idx" ON "BankSnapshot"("bankAccountId");

-- File model foreign keys
CREATE INDEX IF NOT EXISTS "File_uploadedById_idx" ON "File"("uploadedById");

-- JobRole model foreign keys
CREATE INDEX IF NOT EXISTS "JobRole_departmentId_idx" ON "JobRole"("departmentId");

-- CustomerApprovalRequest model foreign keys
CREATE INDEX IF NOT EXISTS "CustomerApprovalRequest_requestedByUserId_idx" ON "CustomerApprovalRequest"("requestedByUserId");

-- CustomerApproval model foreign keys
CREATE INDEX IF NOT EXISTS "CustomerApproval_requestedById_idx" ON "CustomerApproval"("requestedById");

-- HotelDispute model foreign keys
CREATE INDEX IF NOT EXISTS "HotelDispute_createdById_idx" ON "HotelDispute"("createdById") WHERE "createdById" IS NOT NULL;

-- ImportJob model foreign keys
CREATE INDEX IF NOT EXISTS "ImportJob_mappingId_idx" ON "ImportJob"("mappingId") WHERE "mappingId" IS NOT NULL;

-- ITAssetFile model foreign keys
CREATE INDEX IF NOT EXISTS "ITAssetFile_assetId_idx" ON "ITAssetFile"("assetId");

-- IncentivePlan model foreign keys
CREATE INDEX IF NOT EXISTS "IncentivePlan_ventureId_idx" ON "IncentivePlan"("ventureId");

-- UserIncentiveOverride model foreign keys
CREATE INDEX IF NOT EXISTS "UserIncentiveOverride_ruleId_idx" ON "UserIncentiveOverride"("ruleId");

-- IncentiveScenario model foreign keys
CREATE INDEX IF NOT EXISTS "IncentiveScenario_createdByUserId_idx" ON "IncentiveScenario"("createdByUserId");

-- AuditRun model foreign keys
CREATE INDEX IF NOT EXISTS "AuditRun_scopeOfficeId_idx" ON "AuditRun"("scopeOfficeId") WHERE "scopeOfficeId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "AuditRun_scopePropertyId_idx" ON "AuditRun"("scopePropertyId") WHERE "scopePropertyId" IS NOT NULL;

-- JobRunLog model foreign keys
CREATE INDEX IF NOT EXISTS "JobRunLog_ventureId_idx" ON "JobRunLog"("ventureId") WHERE "ventureId" IS NOT NULL;

-- ITIncidentTagMapping model foreign keys
CREATE INDEX IF NOT EXISTS "ITIncidentTagMapping_tagId_idx" ON "ITIncidentTagMapping"("tagId");

-- OutreachMessage model foreign keys
CREATE INDEX IF NOT EXISTS "OutreachMessage_createdById_idx" ON "OutreachMessage"("createdById");

-- OutreachAttribution model foreign keys
CREATE INDEX IF NOT EXISTS "OutreachAttribution_carrierId_idx" ON "OutreachAttribution"("carrierId") WHERE "carrierId" IS NOT NULL;

-- WebhookQuarantine model foreign keys
CREATE INDEX IF NOT EXISTS "WebhookQuarantine_attachedCarrierId_idx" ON "WebhookQuarantine"("attachedCarrierId") WHERE "attachedCarrierId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "WebhookQuarantine_attachedLoadId_idx" ON "WebhookQuarantine"("attachedLoadId") WHERE "attachedLoadId" IS NOT NULL;

-- FeedbackSubmission model foreign keys
CREATE INDEX IF NOT EXISTS "FeedbackSubmission_resolvedById_idx" ON "FeedbackSubmission"("resolvedById") WHERE "resolvedById" IS NOT NULL;

-- DispatchDriver model foreign keys
CREATE INDEX IF NOT EXISTS "DispatchDriver_carrierId_idx" ON "DispatchDriver"("carrierId") WHERE "carrierId" IS NOT NULL;

-- DispatchTruck model foreign keys
CREATE INDEX IF NOT EXISTS "DispatchTruck_driverId_idx" ON "DispatchTruck"("driverId") WHERE "driverId" IS NOT NULL;

-- DispatchLoad model foreign keys
CREATE INDEX IF NOT EXISTS "DispatchLoad_truckId_idx" ON "DispatchLoad"("truckId") WHERE "truckId" IS NOT NULL;

-- Settlement model foreign keys
CREATE INDEX IF NOT EXISTS "Settlement_dispatchLoadId_idx" ON "Settlement"("dispatchLoadId") WHERE "dispatchLoadId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Settlement_carrierId_idx" ON "Settlement"("carrierId") WHERE "carrierId" IS NOT NULL;

-- DispatchConversation model foreign keys
CREATE INDEX IF NOT EXISTS "DispatchConversation_dispatchLoadId_idx" ON "DispatchConversation"("dispatchLoadId") WHERE "dispatchLoadId" IS NOT NULL;

-- Add composite indexes for common query patterns

-- Load queries with officeId + status
CREATE INDEX IF NOT EXISTS "Load_officeId_status_idx" ON "Load"("officeId", "status") WHERE "officeId" IS NOT NULL;

-- Task queries with officeId + status
CREATE INDEX IF NOT EXISTS "Task_officeId_status_idx" ON "Task"("officeId", "status") WHERE "officeId" IS NOT NULL;

-- HotelDispute queries with propertyId + status
CREATE INDEX IF NOT EXISTS "HotelDispute_propertyId_status_idx" ON "HotelDispute"("propertyId", "status");

-- EmployeeKpiDaily queries with officeId + date
CREATE INDEX IF NOT EXISTS "EmployeeKpiDaily_officeId_date_idx" ON "EmployeeKpiDaily"("officeId", "date") WHERE "officeId" IS NOT NULL;

-- EodReport queries with officeId + date
CREATE INDEX IF NOT EXISTS "EodReport_officeId_date_idx" ON "EodReport"("officeId", "date") WHERE "officeId" IS NOT NULL;

-- Attendance queries with officeId + date
CREATE INDEX IF NOT EXISTS "Attendance_officeId_date_idx" ON "Attendance"("officeId", "date") WHERE "officeId" IS NOT NULL;

-- BpoCallLog queries with officeId + callStartedAt
CREATE INDEX IF NOT EXISTS "BpoCallLog_officeId_callStartedAt_idx" ON "BpoCallLog"("officeId", "callStartedAt") WHERE "officeId" IS NOT NULL;

-- File queries with ventureId + createdAt
CREATE INDEX IF NOT EXISTS "File_ventureId_createdAt_idx" ON "File"("ventureId", "createdAt") WHERE "ventureId" IS NOT NULL;

