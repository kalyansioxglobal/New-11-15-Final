-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CEO', 'ADMIN', 'VENTURE_HEAD', 'OFFICE_MANAGER', 'EMPLOYEE', 'COO', 'TEAM_LEAD', 'CONTRACTOR', 'AUDITOR', 'FINANCE', 'HR_ADMIN', 'TEST_USER', 'CSR', 'DISPATCHER', 'CARRIER_TEAM', 'ACCOUNTING');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('DISPATCH', 'CARRIER_TEAM', 'SHIPPER_SALES', 'FINANCE', 'HR', 'MANAGEMENT', 'OPERATIONS', 'OTHER');

-- CreateEnum
CREATE TYPE "VentureType" AS ENUM ('LOGISTICS', 'TRANSPORT', 'HOSPITALITY', 'BPO', 'SAAS', 'TESTING', 'HOLDINGS');

-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('GOOGLE', 'TRIPADVISOR', 'BOOKING', 'EXPEDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('INSURANCE', 'LEASE', 'CONTRACT', 'LICENSE', 'PERMIT', 'OTHER');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HotelStatus" AS ENUM ('ACTIVE', 'CLOSED', 'RENOVATION', 'SOLD');

-- CreateEnum
CREATE TYPE "HotelDisputeStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WON', 'LOST', 'CLOSED_NO_ACTION');

-- CreateEnum
CREATE TYPE "HotelDisputeType" AS ENUM ('CHARGEBACK', 'OTA_DISPUTE', 'RATE_DISCREPANCY', 'GUEST_COMPLAINT', 'NO_SHOW', 'OTHER');

-- CreateEnum
CREATE TYPE "HotelDisputeChannel" AS ENUM ('OTA', 'CREDIT_CARD_PROCESSOR', 'BANK', 'DIRECT_GUEST', 'CORPORATE', 'OTHER');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('OPEN', 'WORKING', 'COVERED', 'AT_RISK', 'FELL_OFF', 'LOST', 'DELIVERED', 'DORMANT', 'MAYBE', 'MOVED');

-- CreateEnum
CREATE TYPE "LoadEventType" AS ENUM ('QUOTE_SENT', 'CARRIER_OFFERED', 'CARRIER_REJECTED', 'SHIPPER_REJECTED', 'FELL_OFF', 'LOST_CONFIRMED', 'STATUS_CHANGED', 'NOTE', 'AI_RISK');

-- CreateEnum
CREATE TYPE "LogisticsRole" AS ENUM ('BROKER', 'CARRIER');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('PASS', 'FLAG', 'FAIL');

-- CreateEnum
CREATE TYPE "CustomerApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('LOADS', 'CUSTOMERS', 'CARRIERS', 'SHIPPERS', 'HOTEL_KPIS', 'FREIGHT_KPIS', 'HOTEL_DISPUTES', 'BANK_TRANSACTIONS', 'HOTEL_REVIEWS', 'BPO_METRICS', 'GENERIC');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'MAPPED', 'VALIDATED', 'IMPORTING', 'IMPORTED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avatarUrl" TEXT,
    "password" TEXT,
    "department" "Department",
    "impersonatedById" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTestUser" BOOLEAN NOT NULL DEFAULT false,
    "jobDepartmentId" INTEGER,
    "jobRoleId" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMapping" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "rcExtension" TEXT,
    "rcUserName" TEXT,
    "rcEmail" TEXT,
    "tmsEmployeeCode" TEXT,
    "tmsEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesPersonCost" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "monthlyCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesPersonCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "policyNumber" TEXT,
    "coverageType" TEXT,
    "fileUrl" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureUser" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeUser" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "officeId" INTEGER NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficeUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venture" (
    "id" SERIAL NOT NULL,
    "slug" TEXT,
    "name" TEXT NOT NULL,
    "type" "VentureType" NOT NULL,
    "logisticsRole" "LogisticsRole",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Venture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Office" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT DEFAULT 'India',
    "timezone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER,
    "officeId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedTo" INTEGER,
    "createdBy" INTEGER,
    "isTest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "officeId" INTEGER,
    "provider" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER,
    "fileUrl" TEXT,
    "name" TEXT NOT NULL,
    "policyNo" TEXT,
    "type" "PolicyType" NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreightKpiDaily" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "loadsInbound" INTEGER NOT NULL DEFAULT 0,
    "loadsQuoted" INTEGER NOT NULL DEFAULT 0,
    "loadsCovered" INTEGER NOT NULL DEFAULT 0,
    "loadsLost" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeShippers" INTEGER NOT NULL DEFAULT 0,
    "newShippers" INTEGER NOT NULL DEFAULT 0,
    "activeCarriers" INTEGER NOT NULL DEFAULT 0,
    "newCarriers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreightKpiDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelProperty" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "ventureId" INTEGER NOT NULL,
    "brand" TEXT,
    "rooms" INTEGER,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "status" "HotelStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelKpiDaily" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "roomsSold" INTEGER NOT NULL DEFAULT 0,
    "roomsAvailable" INTEGER NOT NULL DEFAULT 0,
    "occupancyPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roomRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revpar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "roomsOutOfOrder" INTEGER NOT NULL DEFAULT 0,
    "ventureId" INTEGER NOT NULL,

    CONSTRAINT "HotelKpiDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelDailyReport" (
    "id" SERIAL NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "roomSold" INTEGER,
    "totalRoom" INTEGER,
    "cash" DOUBLE PRECISION,
    "credit" DOUBLE PRECISION,
    "online" DOUBLE PRECISION,
    "refund" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "dues" DOUBLE PRECISION,
    "lostDues" DOUBLE PRECISION,
    "occupancy" DOUBLE PRECISION,
    "adr" DOUBLE PRECISION,
    "revpar" DOUBLE PRECISION,
    "highLossFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelDailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelNightAudit" (
    "id" SERIAL NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "auditDate" TIMESTAMP(3) NOT NULL,
    "postedToGl" BOOLEAN NOT NULL DEFAULT false,
    "postedByUserId" INTEGER,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelNightAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralLedgerEntry" (
    "id" SERIAL NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "auditDate" TIMESTAMP(3) NOT NULL,
    "accountCode" TEXT NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneralLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Load" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER,
    "officeId" INTEGER,
    "tmsLoadId" TEXT,
    "reference" TEXT,
    "shipperName" TEXT,
    "shipperRef" TEXT,
    "customerName" TEXT,
    "customerId" INTEGER,
    "pickupCity" TEXT,
    "pickupState" TEXT,
    "pickupZip" TEXT,
    "pickupDate" TIMESTAMP(3),
    "dropCity" TEXT,
    "dropState" TEXT,
    "dropZip" TEXT,
    "dropDate" TIMESTAMP(3),
    "equipmentType" TEXT,
    "weightLbs" INTEGER,
    "rate" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "loadStatus" "LoadStatus" NOT NULL DEFAULT 'OPEN',
    "atRiskFlag" BOOLEAN NOT NULL DEFAULT false,
    "lostAt" TIMESTAMP(3),
    "fellOffAt" TIMESTAMP(3),
    "lostReasonId" INTEGER,
    "status" TEXT,
    "lostReason" TEXT,
    "dormantReason" TEXT,
    "notes" TEXT,
    "carrierId" INTEGER,
    "createdById" INTEGER,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "buyRate" DOUBLE PRECISION,
    "sellRate" DOUBLE PRECISION,
    "shipperId" INTEGER,
    "lostReasonCategory" TEXT,
    "billAmount" DOUBLE PRECISION,
    "costAmount" DOUBLE PRECISION,
    "marginAmount" DOUBLE PRECISION,
    "marginPercentage" DOUBLE PRECISION,
    "arInvoiceDate" TIMESTAMP(3),
    "apInvoiceDate" TIMESTAMP(3),
    "dispatchDate" TIMESTAMP(3),
    "arPaymentStatus" TEXT,
    "arDatePaid" TIMESTAMP(3),
    "arBalanceDue" DOUBLE PRECISION,
    "billingDate" TIMESTAMP(3),
    "miles" DOUBLE PRECISION,
    "rpm" DOUBLE PRECISION,
    "lineHaulRevenue" DOUBLE PRECISION,
    "fuelRevenue" DOUBLE PRECISION,
    "accessorialRevenue" DOUBLE PRECISION,
    "otherRevenue" DOUBLE PRECISION,
    "lineHaulCost" DOUBLE PRECISION,
    "fuelCost" DOUBLE PRECISION,
    "lumperCost" DOUBLE PRECISION,
    "tollsCost" DOUBLE PRECISION,
    "detentionCost" DOUBLE PRECISION,
    "otherCost" DOUBLE PRECISION,
    "createdByTmsName" TEXT,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LostLoadReason" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LostLoadReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "mcNumber" TEXT,
    "dotNumber" TEXT,
    "tmsCarrierCode" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "equipmentTypes" TEXT,
    "lanesJson" TEXT,
    "rating" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "complianceStatus" "ComplianceStatus" NOT NULL DEFAULT 'PASS',
    "fmcsaStatus" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tmsCustomerCode" TEXT,
    "internalCode" TEXT,
    "assignedManagerName" TEXT,
    "assignedManagerUserId" INTEGER,
    "vertical" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ventureId" INTEGER,
    "assignedSalesId" INTEGER,
    "assignedCsrId" INTEGER,
    "assignedDispatcherId" INTEGER,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierContact" (
    "id" SERIAL NOT NULL,
    "carrierId" INTEGER NOT NULL,
    "loadId" INTEGER,
    "madeById" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "outcome" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarrierContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeKpiDaily" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "officeId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "hoursPlanned" DOUBLE PRECISION,
    "hoursWorked" DOUBLE PRECISION,
    "tasksCompleted" INTEGER,
    "loadsTouched" INTEGER,
    "loadsCovered" INTEGER,
    "contactsMade" INTEGER,
    "callsMade" INTEGER,
    "ticketsClosed" INTEGER,
    "qaScore" DOUBLE PRECISION,
    "revenueGenerated" DOUBLE PRECISION,
    "quotesGiven" INTEGER,
    "quotesWon" INTEGER,
    "notes" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeKpiDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "officeId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "type" TEXT,
    "entityType" TEXT,
    "entityId" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpersonationLog" (
    "id" SERIAL NOT NULL,
    "initiatorId" INTEGER NOT NULL,
    "impersonatedId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "reason" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "ImpersonationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsShipper" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tmsShipperCode" TEXT,
    "internalCode" TEXT,
    "customerId" INTEGER,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsShipper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsLoadEvent" (
    "id" SERIAL NOT NULL,
    "loadId" INTEGER NOT NULL,
    "type" "LoadEventType" NOT NULL,
    "message" TEXT,
    "data" JSONB,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogisticsLoadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelReview" (
    "id" SERIAL NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "source" "ReviewSource" NOT NULL,
    "externalId" TEXT,
    "reviewerName" TEXT,
    "rating" DOUBLE PRECISION,
    "title" TEXT,
    "comment" TEXT,
    "language" TEXT DEFAULT 'en',
    "reviewDate" TIMESTAMP(3),
    "responseText" TEXT,
    "respondedById" INTEGER,
    "respondedAt" TIMESTAMP(3),
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BpoCampaign" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "clientName" TEXT,
    "formulaJson" JSONB,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "officeId" INTEGER,
    "timezone" TEXT,
    "vertical" TEXT,

    CONSTRAINT "BpoCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BpoAgent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "campaignId" INTEGER,
    "employeeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "seatMonthlyCost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BpoAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BpoKpiRecord" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "agentId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "calls" INTEGER,
    "talkTimeSec" INTEGER,
    "qaScore" DOUBLE PRECISION,
    "customJson" JSONB,
    "scoreComputed" DOUBLE PRECISION,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BpoKpiRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BpoDailyMetric" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "talkTimeMin" INTEGER,
    "handledCalls" INTEGER,
    "outboundCalls" INTEGER,
    "leadsCreated" INTEGER,
    "demosBooked" INTEGER,
    "salesClosed" INTEGER,
    "fteCount" DOUBLE PRECISION,
    "avgQaScore" DOUBLE PRECISION,
    "revenue" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BpoDailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BpoCallLog" (
    "id" SERIAL NOT NULL,
    "agentId" INTEGER NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "officeId" INTEGER,
    "campaignId" INTEGER,
    "callStartedAt" TIMESTAMP(3) NOT NULL,
    "callEndedAt" TIMESTAMP(3),
    "dialCount" INTEGER NOT NULL DEFAULT 1,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "appointmentSet" BOOLEAN NOT NULL DEFAULT false,
    "dealWon" BOOLEAN NOT NULL DEFAULT false,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BpoCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BpoAgentMetric" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "userId" INTEGER,
    "agentName" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "talkTimeMin" INTEGER,
    "handledCalls" INTEGER,
    "outboundCalls" INTEGER,
    "leadsCreated" INTEGER,
    "demosBooked" INTEGER,
    "salesClosed" INTEGER,
    "avgQaScore" DOUBLE PRECISION,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BpoAgentMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaasCustomer" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "domain" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaasSubscription" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "planName" TEXT NOT NULL,
    "mrr" DOUBLE PRECISION NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoldingAsset" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT,
    "valueEstimate" DOUBLE PRECISION,
    "acquiredDate" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HoldingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankSnapshot" (
    "id" SERIAL NOT NULL,
    "bankAccountId" INTEGER NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccountSnapshot" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER,
    "bankName" TEXT,
    "accountName" TEXT,
    "accountLast4" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "balance" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccountSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER,
    "officeId" INTEGER,
    "taskId" INTEGER,
    "policyId" INTEGER,
    "loadId" INTEGER,
    "shipperId" INTEGER,
    "carrierId" INTEGER,
    "hotelId" INTEGER,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'supabase',
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "tag" TEXT,
    "uploadedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDepartment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ventureType" "VentureType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isManager" BOOLEAN NOT NULL DEFAULT false,
    "departmentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerApprovalRequest" (
    "id" SERIAL NOT NULL,
    "businessUnit" TEXT NOT NULL DEFAULT 'LOGISTICS',
    "ventureId" INTEGER,
    "customerId" INTEGER,
    "shipperId" INTEGER,
    "customerLegalName" TEXT NOT NULL,
    "dbaName" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "website" TEXT,
    "customerCode" TEXT,
    "usdotNumber" TEXT,
    "mcNumber" TEXT,
    "referenceNotes" TEXT,
    "paymentTermsRequested" TEXT,
    "creditLimitRequested" DOUBLE PRECISION,
    "status" "CustomerApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" INTEGER,
    "requestedByUserId" INTEGER,
    "autoChecks" JSONB,
    "checklist" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRouting" (
    "id" SERIAL NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "toEmails" TEXT NOT NULL,
    "ccEmails" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRouting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerApproval" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "decisionNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOtp" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionMatrix" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "json" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelDispute" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "reservationId" TEXT,
    "folioNumber" TEXT,
    "type" "HotelDisputeType" NOT NULL,
    "channel" "HotelDisputeChannel" NOT NULL,
    "sourceRef" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "postedDate" TIMESTAMP(3),
    "stayFrom" TIMESTAMP(3),
    "stayTo" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "disputedAmount" DOUBLE PRECISION NOT NULL,
    "originalAmount" DOUBLE PRECISION,
    "status" "HotelDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT,
    "internalNotes" TEXT,
    "evidenceDueDate" TIMESTAMP(3),
    "submittedDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "outcomeNotes" TEXT,
    "ownerId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelDisputeNote" (
    "id" SERIAL NOT NULL,
    "disputeId" INTEGER NOT NULL,
    "authorId" INTEGER,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelDisputeNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" SERIAL NOT NULL,
    "type" "ImportType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT,
    "mimeType" TEXT,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "rowCount" INTEGER,
    "successCount" INTEGER,
    "errorCount" INTEGER,
    "errorMessage" TEXT,
    "errorRows" JSONB,
    "mappingId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportMapping" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ImportType" NOT NULL,
    "sourceHash" TEXT,
    "configJson" JSONB NOT NULL,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITAsset" (
    "id" SERIAL NOT NULL,
    "assetTag" TEXT NOT NULL,
    "serialNumber" TEXT,
    "category" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "specs" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "condition" TEXT NOT NULL DEFAULT 'Good',
    "purchaseDate" TIMESTAMP(3),
    "purchaseCost" DOUBLE PRECISION,
    "warrantyExpiry" TIMESTAMP(3),
    "notes" TEXT,
    "currentUserId" INTEGER,
    "ventureId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ITAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITAssetFile" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ITAssetFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITAssetHistory" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "fromUserId" INTEGER,
    "toUserId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ITAssetHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITIncident" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'Low',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "reportedById" INTEGER,
    "assignedToId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ITIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" SERIAL NOT NULL,
    "venture" TEXT,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyPreview" TEXT,
    "relatedLoadId" INTEGER,
    "sentByUserId" INTEGER,
    "sentByAgent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitWindow" (
    "id" SERIAL NOT NULL,
    "ipHash" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_jobDepartmentId_idx" ON "User"("jobDepartmentId");

-- CreateIndex
CREATE INDEX "User_jobRoleId_idx" ON "User"("jobRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMapping_userId_key" ON "UserMapping"("userId");

-- CreateIndex
CREATE INDEX "UserMapping_rcExtension_idx" ON "UserMapping"("rcExtension");

-- CreateIndex
CREATE INDEX "UserMapping_rcEmail_idx" ON "UserMapping"("rcEmail");

-- CreateIndex
CREATE INDEX "UserMapping_tmsEmployeeCode_idx" ON "UserMapping"("tmsEmployeeCode");

-- CreateIndex
CREATE INDEX "UserMapping_tmsEmail_idx" ON "UserMapping"("tmsEmail");

-- CreateIndex
CREATE INDEX "SalesPersonCost_userId_effectiveFrom_idx" ON "SalesPersonCost"("userId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "InsurancePolicy_ventureId_idx" ON "InsurancePolicy"("ventureId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_status_idx" ON "InsurancePolicy"("status");

-- CreateIndex
CREATE INDEX "InsurancePolicy_endDate_idx" ON "InsurancePolicy"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "VentureUser_userId_ventureId_key" ON "VentureUser"("userId", "ventureId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeUser_userId_officeId_key" ON "OfficeUser"("userId", "officeId");

-- CreateIndex
CREATE UNIQUE INDEX "Venture_slug_key" ON "Venture"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Venture_name_logisticsRole_key" ON "Venture"("name", "logisticsRole");

-- CreateIndex
CREATE UNIQUE INDEX "Office_name_key" ON "Office"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FreightKpiDaily_ventureId_date_key" ON "FreightKpiDaily"("ventureId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HotelProperty_code_key" ON "HotelProperty"("code");

-- CreateIndex
CREATE UNIQUE INDEX "HotelKpiDaily_hotelId_date_key" ON "HotelKpiDaily"("hotelId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HotelDailyReport_hotelId_date_key" ON "HotelDailyReport"("hotelId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HotelNightAudit_hotelId_auditDate_key" ON "HotelNightAudit"("hotelId", "auditDate");

-- CreateIndex
CREATE INDEX "GeneralLedgerEntry_hotelId_auditDate_idx" ON "GeneralLedgerEntry"("hotelId", "auditDate");

-- CreateIndex
CREATE UNIQUE INDEX "Load_tmsLoadId_key" ON "Load"("tmsLoadId");

-- CreateIndex
CREATE INDEX "Load_billingDate_idx" ON "Load"("billingDate");

-- CreateIndex
CREATE INDEX "Load_arInvoiceDate_idx" ON "Load"("arInvoiceDate");

-- CreateIndex
CREATE INDEX "Load_ventureId_idx" ON "Load"("ventureId");

-- CreateIndex
CREATE INDEX "Load_status_idx" ON "Load"("status");

-- CreateIndex
CREATE INDEX "Load_loadStatus_idx" ON "Load"("loadStatus");

-- CreateIndex
CREATE INDEX "Load_lostAt_idx" ON "Load"("lostAt");

-- CreateIndex
CREATE INDEX "Load_pickupDate_idx" ON "Load"("pickupDate");

-- CreateIndex
CREATE INDEX "Load_loadStatus_ventureId_idx" ON "Load"("loadStatus", "ventureId");

-- CreateIndex
CREATE INDEX "Load_loadStatus_lostAt_idx" ON "Load"("loadStatus", "lostAt");

-- CreateIndex
CREATE INDEX "Load_loadStatus_pickupDate_idx" ON "Load"("loadStatus", "pickupDate");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_mcNumber_key" ON "Carrier"("mcNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_dotNumber_key" ON "Carrier"("dotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_tmsCarrierCode_key" ON "Carrier"("tmsCarrierCode");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tmsCustomerCode_key" ON "Customer"("tmsCustomerCode");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_internalCode_key" ON "Customer"("internalCode");

-- CreateIndex
CREATE INDEX "Customer_tmsCustomerCode_idx" ON "Customer"("tmsCustomerCode");

-- CreateIndex
CREATE INDEX "Customer_internalCode_idx" ON "Customer"("internalCode");

-- CreateIndex
CREATE INDEX "Customer_ventureId_idx" ON "Customer"("ventureId");

-- CreateIndex
CREATE INDEX "Customer_assignedSalesId_idx" ON "Customer"("assignedSalesId");

-- CreateIndex
CREATE INDEX "Customer_assignedCsrId_idx" ON "Customer"("assignedCsrId");

-- CreateIndex
CREATE INDEX "Customer_assignedDispatcherId_idx" ON "Customer"("assignedDispatcherId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeKpiDaily_userId_date_ventureId_officeId_key" ON "EmployeeKpiDaily"("userId", "date", "ventureId", "officeId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_date_ventureId_officeId_key" ON "Attendance"("userId", "date", "ventureId", "officeId");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsShipper_tmsShipperCode_key" ON "LogisticsShipper"("tmsShipperCode");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsShipper_internalCode_key" ON "LogisticsShipper"("internalCode");

-- CreateIndex
CREATE INDEX "LogisticsShipper_tmsShipperCode_idx" ON "LogisticsShipper"("tmsShipperCode");

-- CreateIndex
CREATE INDEX "LogisticsShipper_internalCode_idx" ON "LogisticsShipper"("internalCode");

-- CreateIndex
CREATE INDEX "BpoKpiRecord_campaignId_date_idx" ON "BpoKpiRecord"("campaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BpoKpiRecord_campaignId_agentId_date_key" ON "BpoKpiRecord"("campaignId", "agentId", "date");

-- CreateIndex
CREATE INDEX "BpoDailyMetric_campaignId_date_idx" ON "BpoDailyMetric"("campaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BpoDailyMetric_campaignId_date_key" ON "BpoDailyMetric"("campaignId", "date");

-- CreateIndex
CREATE INDEX "BpoCallLog_agentId_callStartedAt_idx" ON "BpoCallLog"("agentId", "callStartedAt");

-- CreateIndex
CREATE INDEX "BpoCallLog_campaignId_callStartedAt_idx" ON "BpoCallLog"("campaignId", "callStartedAt");

-- CreateIndex
CREATE INDEX "BpoCallLog_ventureId_callStartedAt_idx" ON "BpoCallLog"("ventureId", "callStartedAt");

-- CreateIndex
CREATE INDEX "BpoAgentMetric_campaignId_date_idx" ON "BpoAgentMetric"("campaignId", "date");

-- CreateIndex
CREATE INDEX "BpoAgentMetric_userId_date_idx" ON "BpoAgentMetric"("userId", "date");

-- CreateIndex
CREATE INDEX "BankAccount_ventureId_idx" ON "BankAccount"("ventureId");

-- CreateIndex
CREATE INDEX "BankSnapshot_bankAccountId_snapshotDate_idx" ON "BankSnapshot"("bankAccountId", "snapshotDate");

-- CreateIndex
CREATE INDEX "BankAccountSnapshot_ventureId_date_idx" ON "BankAccountSnapshot"("ventureId", "date");

-- CreateIndex
CREATE INDEX "File_ventureId_idx" ON "File"("ventureId");

-- CreateIndex
CREATE INDEX "File_loadId_idx" ON "File"("loadId");

-- CreateIndex
CREATE INDEX "File_carrierId_idx" ON "File"("carrierId");

-- CreateIndex
CREATE INDEX "File_shipperId_idx" ON "File"("shipperId");

-- CreateIndex
CREATE INDEX "JobDepartment_ventureType_idx" ON "JobDepartment"("ventureType");

-- CreateIndex
CREATE UNIQUE INDEX "JobDepartment_name_ventureType_key" ON "JobDepartment"("name", "ventureType");

-- CreateIndex
CREATE INDEX "JobRole_departmentId_idx" ON "JobRole"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "JobRole_name_departmentId_key" ON "JobRole"("name", "departmentId");

-- CreateIndex
CREATE INDEX "CustomerApprovalRequest_businessUnit_idx" ON "CustomerApprovalRequest"("businessUnit");

-- CreateIndex
CREATE INDEX "CustomerApprovalRequest_status_idx" ON "CustomerApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "CustomerApprovalRequest_customerCode_idx" ON "CustomerApprovalRequest"("customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRouting_ventureId_key" ON "ApprovalRouting"("ventureId");

-- CreateIndex
CREATE INDEX "CustomerApproval_customerId_idx" ON "CustomerApproval"("customerId");

-- CreateIndex
CREATE INDEX "CustomerApproval_ventureId_status_idx" ON "CustomerApproval"("ventureId", "status");

-- CreateIndex
CREATE INDEX "EmailOtp_email_idx" ON "EmailOtp"("email");

-- CreateIndex
CREATE INDEX "EmailOtp_code_idx" ON "EmailOtp"("code");

-- CreateIndex
CREATE INDEX "HotelDispute_propertyId_idx" ON "HotelDispute"("propertyId");

-- CreateIndex
CREATE INDEX "HotelDispute_status_idx" ON "HotelDispute"("status");

-- CreateIndex
CREATE INDEX "HotelDisputeNote_disputeId_idx" ON "HotelDisputeNote"("disputeId");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ImportJob_type_idx" ON "ImportJob"("type");

-- CreateIndex
CREATE INDEX "ImportJob_createdById_idx" ON "ImportJob"("createdById");

-- CreateIndex
CREATE INDEX "ImportMapping_type_idx" ON "ImportMapping"("type");

-- CreateIndex
CREATE INDEX "ImportMapping_sourceHash_idx" ON "ImportMapping"("sourceHash");

-- CreateIndex
CREATE UNIQUE INDEX "ImportMapping_name_type_key" ON "ImportMapping"("name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ITAsset_assetTag_key" ON "ITAsset"("assetTag");

-- CreateIndex
CREATE UNIQUE INDEX "ITAsset_serialNumber_key" ON "ITAsset"("serialNumber");

-- CreateIndex
CREATE INDEX "ITAsset_category_idx" ON "ITAsset"("category");

-- CreateIndex
CREATE INDEX "ITAsset_status_idx" ON "ITAsset"("status");

-- CreateIndex
CREATE INDEX "ITAsset_currentUserId_idx" ON "ITAsset"("currentUserId");

-- CreateIndex
CREATE INDEX "ITAsset_ventureId_idx" ON "ITAsset"("ventureId");

-- CreateIndex
CREATE INDEX "ITAssetFile_assetId_idx" ON "ITAssetFile"("assetId");

-- CreateIndex
CREATE INDEX "ITAssetHistory_assetId_idx" ON "ITAssetHistory"("assetId");

-- CreateIndex
CREATE INDEX "ITAssetHistory_action_idx" ON "ITAssetHistory"("action");

-- CreateIndex
CREATE INDEX "ITIncident_assetId_idx" ON "ITIncident"("assetId");

-- CreateIndex
CREATE INDEX "ITIncident_status_idx" ON "ITIncident"("status");

-- CreateIndex
CREATE INDEX "ITIncident_severity_idx" ON "ITIncident"("severity");

-- CreateIndex
CREATE INDEX "ITIncident_reportedById_idx" ON "ITIncident"("reportedById");

-- CreateIndex
CREATE INDEX "ITIncident_assignedToId_idx" ON "ITIncident"("assignedToId");

-- CreateIndex
CREATE INDEX "EmailLog_relatedLoadId_idx" ON "EmailLog"("relatedLoadId");

-- CreateIndex
CREATE INDEX "EmailLog_sentByUserId_idx" ON "EmailLog"("sentByUserId");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimitWindow_expiresAt_idx" ON "RateLimitWindow"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitWindow_ipHash_routeKey_windowStart_key" ON "RateLimitWindow"("ipHash", "routeKey", "windowStart");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_jobDepartmentId_fkey" FOREIGN KEY ("jobDepartmentId") REFERENCES "JobDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_impersonatedById_fkey" FOREIGN KEY ("impersonatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMapping" ADD CONSTRAINT "UserMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPersonCost" ADD CONSTRAINT "SalesPersonCost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureUser" ADD CONSTRAINT "VentureUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureUser" ADD CONSTRAINT "VentureUser_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeUser" ADD CONSTRAINT "OfficeUser_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeUser" ADD CONSTRAINT "OfficeUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreightKpiDaily" ADD CONSTRAINT "FreightKpiDaily_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelProperty" ADD CONSTRAINT "HotelProperty_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelKpiDaily" ADD CONSTRAINT "HotelKpiDaily_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "HotelProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelKpiDaily" ADD CONSTRAINT "HotelKpiDaily_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelDailyReport" ADD CONSTRAINT "HotelDailyReport_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "HotelProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelNightAudit" ADD CONSTRAINT "HotelNightAudit_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "HotelProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelNightAudit" ADD CONSTRAINT "HotelNightAudit_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_lostReasonId_fkey" FOREIGN KEY ("lostReasonId") REFERENCES "LostLoadReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "LogisticsShipper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assignedSalesId_fkey" FOREIGN KEY ("assignedSalesId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assignedCsrId_fkey" FOREIGN KEY ("assignedCsrId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assignedDispatcherId_fkey" FOREIGN KEY ("assignedDispatcherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierContact" ADD CONSTRAINT "CarrierContact_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierContact" ADD CONSTRAINT "CarrierContact_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierContact" ADD CONSTRAINT "CarrierContact_madeById_fkey" FOREIGN KEY ("madeById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeKpiDaily" ADD CONSTRAINT "EmployeeKpiDaily_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeKpiDaily" ADD CONSTRAINT "EmployeeKpiDaily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeKpiDaily" ADD CONSTRAINT "EmployeeKpiDaily_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationLog" ADD CONSTRAINT "ImpersonationLog_impersonatedId_fkey" FOREIGN KEY ("impersonatedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationLog" ADD CONSTRAINT "ImpersonationLog_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsShipper" ADD CONSTRAINT "LogisticsShipper_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsShipper" ADD CONSTRAINT "LogisticsShipper_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsLoadEvent" ADD CONSTRAINT "LogisticsLoadEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsLoadEvent" ADD CONSTRAINT "LogisticsLoadEvent_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelReview" ADD CONSTRAINT "HotelReview_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "HotelProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelReview" ADD CONSTRAINT "HotelReview_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoCampaign" ADD CONSTRAINT "BpoCampaign_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoCampaign" ADD CONSTRAINT "BpoCampaign_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoAgent" ADD CONSTRAINT "BpoAgent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "BpoCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoAgent" ADD CONSTRAINT "BpoAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoAgent" ADD CONSTRAINT "BpoAgent_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoKpiRecord" ADD CONSTRAINT "BpoKpiRecord_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "BpoAgent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoKpiRecord" ADD CONSTRAINT "BpoKpiRecord_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "BpoCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoDailyMetric" ADD CONSTRAINT "BpoDailyMetric_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "BpoCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoCallLog" ADD CONSTRAINT "BpoCallLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "BpoAgent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoCallLog" ADD CONSTRAINT "BpoCallLog_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoCallLog" ADD CONSTRAINT "BpoCallLog_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoCallLog" ADD CONSTRAINT "BpoCallLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "BpoCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoAgentMetric" ADD CONSTRAINT "BpoAgentMetric_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "BpoCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpoAgentMetric" ADD CONSTRAINT "BpoAgentMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasCustomer" ADD CONSTRAINT "SaasCustomer_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasSubscription" ADD CONSTRAINT "SaasSubscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "SaasCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoldingAsset" ADD CONSTRAINT "HoldingAsset_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankSnapshot" ADD CONSTRAINT "BankSnapshot_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccountSnapshot" ADD CONSTRAINT "BankAccountSnapshot_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "HotelProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "LogisticsShipper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRole" ADD CONSTRAINT "JobRole_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "JobDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerApprovalRequest" ADD CONSTRAINT "CustomerApprovalRequest_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerApprovalRequest" ADD CONSTRAINT "CustomerApprovalRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerApprovalRequest" ADD CONSTRAINT "CustomerApprovalRequest_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "LogisticsShipper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerApprovalRequest" ADD CONSTRAINT "CustomerApprovalRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerApprovalRequest" ADD CONSTRAINT "CustomerApprovalRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRouting" ADD CONSTRAINT "ApprovalRouting_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerApproval" ADD CONSTRAINT "CustomerApproval_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerApproval" ADD CONSTRAINT "CustomerApproval_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerApproval" ADD CONSTRAINT "CustomerApproval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelDispute" ADD CONSTRAINT "HotelDispute_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "HotelProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelDispute" ADD CONSTRAINT "HotelDispute_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelDispute" ADD CONSTRAINT "HotelDispute_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelDisputeNote" ADD CONSTRAINT "HotelDisputeNote_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "HotelDispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelDisputeNote" ADD CONSTRAINT "HotelDisputeNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "ImportMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportMapping" ADD CONSTRAINT "ImportMapping_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITAsset" ADD CONSTRAINT "ITAsset_currentUserId_fkey" FOREIGN KEY ("currentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITAsset" ADD CONSTRAINT "ITAsset_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITAssetFile" ADD CONSTRAINT "ITAssetFile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ITAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITAssetHistory" ADD CONSTRAINT "ITAssetHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ITAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITIncident" ADD CONSTRAINT "ITIncident_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ITAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITIncident" ADD CONSTRAINT "ITIncident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITIncident" ADD CONSTRAINT "ITIncident_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

