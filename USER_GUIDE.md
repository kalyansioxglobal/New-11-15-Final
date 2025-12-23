# SIOX Command Center - User Guide

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Dashboard & Daily Briefing](#dashboard--daily-briefing)
4. [Logistics & Freight Management](#logistics--freight-management)
5. [Coverage War Room](#coverage-war-room)
6. [Lost & At-Risk Loads](#lost--at-risk-loads)
7. [AI Drafting Assistant](#ai-drafting-assistant)
8. [Shipper Churn Analytics](#shipper-churn-analytics)
9. [Shipper ICP Analysis](#shipper-icp-analysis)
10. [Carrier Management & FMCSA Import](#carrier-management--fmcsa-import)
11. [Dispatcher Directory](#dispatcher-directory)
12. [Find Carriers & Matching](#find-carriers--matching)
13. [Hospitality Management](#hospitality-management)
14. [Hotel KPI Year-over-Year Reports](#hotel-kpi-year-over-year-reports)
15. [Hotel P&L Management](#hotel-pl-management)
16. [Hotel Disputes & Chargebacks](#hotel-disputes--chargebacks)
17. [BPO Management](#bpo-management)
18. [SaaS Management](#saas-management)
19. [SaaS Sales KPI](#saas-sales-kpi)
20. [Holdings & Finance](#holdings--finance)
21. [IT Assets](#it-assets)
22. [Administration](#administration)
23. [AI Usage Monitoring](#ai-usage-monitoring)
24. [User Roles & Permissions](#user-roles--permissions)
25. [Data Import Guide](#data-import-guide)
26. [EOD Reports & Accountability](#eod-reports--accountability)
27. [Gamification](#gamification)
28. [User Preferences](#user-preferences)
29. [Test Mode](#test-mode)
30. [Common Workflows](#common-workflows)
31. [FAQ & Troubleshooting](#faq--troubleshooting)

---

## Overview

### What is SIOX Command Center?

SIOX Command Center is a comprehensive multi-venture management platform designed to centralize oversight of diverse business operations. Whether you're managing logistics companies, hotels, BPO call centers, SaaS products, or holding assets, this platform provides a unified dashboard to monitor performance, track KPIs, manage tasks, and make data-driven decisions.

### Key Benefits

- **Unified View**: See all your ventures in one place
- **Role-Based Access**: Secure access controls ensure users only see what's relevant to them
- **Real-Time KPIs**: Track performance metrics across all business verticals
- **AI-Powered Insights**: Lost load analysis and automated carrier outreach
- **Advanced Analytics**: Shipper churn prediction with pattern-based risk scoring
- **Comprehensive Carrier Vetting**: Full FMCSA data including insurance, safety, and compliance
- **Flexible Imports**: Bring in data from TMS systems, RingCentral, and more
- **Daily Briefings**: Executive "War Room" style summaries of critical issues and wins
- **Gamification**: Points and leaderboards to encourage performance
- **Test Mode**: Toggle between production and test data for development

### Supported Business Verticals

| Vertical | Description |
|----------|-------------|
| **Logistics** | Freight brokerage, load management, carrier relationships, shipper churn analytics |
| **Hospitality** | Hotel properties, occupancy, revenue, guest reviews, dispute management |
| **BPO** | Call center campaigns, agent metrics, lead tracking, real-time dashboards |
| **SaaS** | Customer management, subscriptions, MRR/churn, sales KPI tracking |
| **Holdings** | Bank accounts, asset tracking, financial oversight, document vault |

---

## Getting Started

### Logging In

1. Navigate to the SIOX Command Center URL
2. Enter your email address (must be registered in the system)
3. Click **Send Code** to receive a One-Time Password (OTP)
4. Check your email for the 6-digit verification code
5. Enter the code and click **Verify** to log in

Your home dashboard will load based on your assigned role and ventures.

### OTP Authentication

The system uses email-based One-Time Passwords for secure passwordless login:

- **Code Validity**: Each code is valid for 10 minutes
- **Single Use**: Codes can only be used once
- **Rate Limited**: Maximum 5 OTP requests per email per hour
- **Sender**: Codes are sent from itsupport@sioxglobal.com

**Troubleshooting OTP Issues**:
- Check your spam/junk folder
- Ensure your email address is registered
- Wait a few minutes if you've requested multiple codes
- Contact your administrator if issues persist

### Current CEO Users

The following users have CEO-level access:
- herry@sioxglobal.com
- leo@sioxlogistics.com
- shakti@sioxglobal.com

### Navigation

The left sidebar provides collapsible sections for easy navigation:

**Main**
- **My Day** - Personal tasks, EOD status, and priorities
- **Overview** - Executive dashboard with venture health scores

**Operations**
- **Tasks** - To-do items, assignments, deadlines
- **EOD Reports** - Daily accountability reporting

**Freight**
- **Loads** - All freight shipments
- **Carriers** - Carrier network management
- **Shippers** - Customer management
- **Sales KPI** - Sales team performance
- **Lost & At-Risk** - Load rescue and analysis
- **Shipper Churn** - Customer retention analytics
- **Carrier Search** - Find new carriers
- **P&L** - Profitability reporting

**Hospitality**
- **Hotels** - Property management
- **Disputes** - Chargeback tracking
- **Snapshot** - Revenue overview
- **Loss Nights** - Problem night analysis

**BPO**
- **Campaigns** - Call center projects
- **Real-Time** - Live agent dashboard
- **Incentives** - Performance pay tracking

**SaaS**
- **Customers** - Software customers
- **Sales KPI** - Demo and onboarding tracking

**Holdings**
- **Bank Accounts** - Financial accounts
- **Assets** - Property and investments
- **Documents** - Document vault

**Admin**
- **Users** - User management
- **Org Chart** - Reporting hierarchy
- **Audit** - Compliance checks
- **Activity Log** - User actions
- **AI Usage** - Monitor AI feature usage

### Collapsible Navigation

Each section can be expanded or collapsed:
- Click on section headers to toggle
- Use "+" to expand all sections
- Use "−" to collapse all sections
- Your preferences are saved automatically

---

## Dashboard & Daily Briefing

### The Executive Overview

The Overview page provides a high-level health check of all ventures you have access to. Each venture card shows:

- **Health Score** - Calculated from policy compliance, task completion, and KPI performance
- **Active Tasks** - Number of open tasks for that venture
- **Policy Status** - Upcoming renewals or expired policies
- **Key Metrics** - Venture-specific KPIs

### Daily Briefing ("War Room")

The Daily Briefing analyzes your operations and categorizes issues:

| Category | What It Means | Example |
|----------|---------------|---------|
| **Firefront** | Critical issues requiring immediate attention | Load pickup in 2 hours with no carrier |
| **Stormfront** | Serious issues that need action within 24-48 hours | Hotel occupancy down 20% |
| **Watch** | Items to monitor that could escalate | Customer hasn't shipped in 30 days |
| **Wins** | Positive developments and achievements | Best margin week of the quarter |

This helps leadership focus on what matters most each day.

---

## Logistics & Freight Management

### Overview

The Logistics module is designed for freight brokerages and logistics companies. It provides end-to-end load management, carrier relationships, shipper tracking, and financial analysis.

### Loads

**Accessing Loads**: Navigate to **Freight > Loads**

Each load contains:
- **Reference Number** - Unique identifier from your TMS
- **Status** - OPEN, COVERED, IN_TRANSIT, DELIVERED, LOST, etc.
- **Pickup/Delivery** - Dates, cities, states, zip codes
- **Equipment Type** - Van, Reefer, Flatbed, etc.
- **Financials** - Bill amount, carrier cost, margin, RPM

**Load Statuses Explained**:

| Status | Description |
|--------|-------------|
| OPEN | Load is available, seeking carrier |
| COVERED | Carrier confirmed, ready for pickup |
| DISPATCHED | Carrier has been dispatched |
| IN_TRANSIT | Load is moving |
| DELIVERED | Load completed successfully |
| INVOICED | Customer has been billed |
| PAID | Payment received |
| LOST | Load was lost to competition |
| FELL_OFF | Carrier cancelled after coverage |

### Sales KPI Dashboard

**Accessing Sales KPIs**: Navigate to **Freight > Sales KPI**

Monitor your sales team's performance:
- **Calls Made** - Daily call activity from RingCentral imports
- **Quotes Given** - Number of quotes provided
- **Quotes Won** - Conversion rate
- **Revenue Generated** - Total revenue per rep
- **Margin %** - Profitability by salesperson
- **ROI** - Revenue vs. cost analysis

Filter by date range, venture, office, or individual rep.

### P&L Reporting

**Accessing P&L**: Navigate to **Freight > P&L**

Analyze profitability:
- Daily margin breakdown
- Customer-level profitability
- Lane analysis
- Office-by-office comparison

Loads with margins below 8% are highlighted in red for quick identification.

---

## Coverage War Room

### Overview

The Coverage War Room is a real-time operations dashboard designed to help dispatchers and managers monitor load coverage status and take immediate action on at-risk loads.

**Accessing Coverage War Room**: Navigate to **Freight > Coverage War Room**

### Dashboard Summary Cards

The War Room displays four key metrics at a glance:

| Card | Description |
|------|-------------|
| **Coverage Rate** | Percentage of loads that are covered vs. total loads |
| **Total Loads** | Total number of loads in the current period |
| **Open/At-Risk** | Loads needing immediate attention |
| **Lost Loads** | Loads lost to competition |

### Loads Needing Attention

The main table shows loads sorted by urgency:
- **Hours to Pickup** - Loads closest to pickup appear first
- **Status** - Current coverage status (OPEN, WORKING, AT_RISK)
- **Lane** - Origin and destination
- **Equipment** - Required trailer type
- **Quick Actions** - Find carriers button for immediate matching

### Dispatcher Leaderboard

Track dispatcher performance:
- **Contacts Made** - Number of carrier outreach attempts
- **Loads Covered** - Successfully covered loads
- **Avg Time to First Contact** - Speed of initial outreach

### Daily Coverage Trend

A line chart showing coverage rate over the past 7-30 days, helping identify patterns and improvement trends.

---

## Lost & At-Risk Loads

### Overview

This powerful module helps you rescue loads before they're lost and analyze patterns in lost business.

### At-Risk Loads

**Accessing At-Risk**: Navigate to **Freight > Lost & At-Risk** and select the **At-Risk** tab

At-risk loads are those approaching pickup without confirmed coverage. Filter by:
- Hours until pickup (e.g., 12h, 24h, 48h)
- Equipment type
- Lane

**Taking Action**:
1. Click on any at-risk load
2. View carrier suggestions based on lane and equipment
3. Use the AI Lost Load Agent to send outreach emails

### Lost Loads Analysis

**Accessing Lost Loads**: Select the **Lost Loads** tab

Review historical lost loads with filters:
- Date range
- Shipper
- Sales rep
- Lane (origin/destination)
- Lost reason

**Reason Summary**: See aggregated counts by loss reason to identify patterns.

### AI Postmortem

**Accessing Postmortem**: Click **Run AI Postmortem**

The AI analyzes your lost load data and provides:
- **Pattern Recognition** - Common reasons for losses
- **Rep-Specific Insights** - Individual coaching opportunities
- **Lane Analysis** - Geographic areas with high loss rates
- **Actionable Recommendations** - Specific steps to reduce losses

---

## AI Drafting Assistant

### Overview

The AI Drafting Assistant helps your freight team generate professional, compliant outreach messages to carriers. It's designed to save time on message composition while ensuring quality and consistency.

**Key Principle**: All AI output is **draft-only**. A human must review and approve before any message is sent. The AI is a writing assistant, not an automation tool.

**Accessing AI Drafting**: Navigate to **Freight > AI Drafting**

### Getting Started with AI Drafting

The AI Drafting form guides you through composing a carrier outreach message:

1. **Select a Carrier** (optional)
   - Use the autocomplete field to search by carrier name, MC number, or DOT number
   - This pre-populates some carrier information for context
   - If your carrier is not in the system, you can skip this step

2. **Choose Contact Role**
   - **Dispatcher** - Direct contact at the trucking company (primary point of contact)
   - **Owner/Principal** - Company owner or management (for relationship-building or escalations)

3. **Enter Contact Information**
   - If you selected **Dispatcher** from the database and one is assigned, it will auto-populate
   - If you selected **Dispatcher** but it's a new/temporary contact, enter their name and optional email
   - The system accepts both database dispatchers and free-form entries

4. **Select Draft Type**
   - **Inquiry** - General questions about lane coverage or capacity
   - **Coverage Request** - Request specific equipment/dates
   - **Relationship** - Relationship building, thank you, or follow-up

5. **Provide Load Context** (optional)
   - Pickup date, weight, equipment type, commodity
   - This helps the AI tailor the message to your specific load

6. **Add Internal Notes** (optional)
   - Notes for yourself or your team (not included in the draft)
   - Useful for context the AI should know about

7. **Generate Draft**
   - Click **Generate Draft**
   - The AI will compose a professional message in 5-10 seconds

### Understanding the Draft Output

The AI produces:
- **Draft Text** - A professional, pre-composed message
- **Token Count** - System metric (can be ignored)
- **Copy Button** - Copy the draft to your clipboard

### Contact Role Explanation

#### Dispatcher Role
Use this when you have a specific contact who handles operations:
- Dispatchers typically manage day-to-day load assignments
- They have immediate authority to commit capacity
- Best for specific, time-sensitive requests
- **Database Dispatcher**: If you've worked with this company before, their dispatcher may already be in the system
- **Free-Form Dispatcher**: For new contacts or when you don't have the database record yet

**Why separate "Dispatcher" from "Owner"?**
- Dispatchers have operational authority for load assignments
- Owners are better for relationship escalations or policy negotiations
- Using the right contact shows professionalism and improves response rates

#### Owner/Principal Role
Use this for:
- Relationship building and follow-ups
- Escalations or special requests
- Long-term partnership discussions
- Direct communication when dispatcher is unavailable

### Safety Guardrails

The AI is designed with built-in safety rules:
- ✅ **Safe**: Professional tone, specific load details, request for capacity
- ❌ **NOT ALLOWED**: Pricing commitments, contractual promises, automated follow-up
- ❌ **NOT ALLOWED**: Pretending to be human, self-reference as AI, invented numbers

The system enforces these guardrails in the prompt itself.

### After You Get the Draft

1. **Review the draft** for accuracy and tone
2. **Edit as needed** for your specific situation
3. **Copy the text** using the Copy button
4. **Paste into email** or your communication tool
5. **Send manually** - this step is always human-controlled

### Example Workflow

**Scenario**: You have an at-risk load going from Chicago to Dallas tomorrow. You want to reach out to a known dispatcher at ABC Trucking.

**Steps**:
1. Click "AI Drafting" under Freight
2. Search "ABC Trucking" in the Carrier field → system finds it
3. Click ABC Trucking to select it
4. Choose **Contact Role**: "Dispatcher"
5. System shows "John Smith" as primary dispatcher with email
6. Choose **Draft Type**: "Coverage Request"
7. Enter Load details:
   - Pickup: Tomorrow 6 AM, Chicago IL
   - Equipment: Dry Van
   - Weight: 40,000 lbs
   - Commodity: Non-hazmat palletized goods
8. Click **Generate Draft** → AI produces professional message
9. Review the draft (looks good!)
10. Copy to clipboard
11. Paste into your email client and send

### Troubleshooting

**Q: Carrier not in database?**
A: It's okay! Skip the carrier search and manually enter the dispatcher name. The AI works just as well with free-form inputs.

**Q: Draft doesn't match my tone?**
A: Review the draft and edit before sending. The system provides a starting point; you control the final message.

**Q: Can the AI send the email automatically?**
A: No. All outputs are draft-only. You must manually copy, paste, and send using your email tool. This ensures human approval of every communication.

**Q: What if I need a price quote in the draft?**
A: The AI won't include pricing in order to prevent commitments. You can manually add pricing after generation if needed.

---

## Shipper Churn Analytics

### Overview

The Shipper Churn module uses advanced pattern analysis to predict which customers are at risk of stopping their business with you.

**Accessing Shipper Churn**: Navigate to **Freight > Shipper Churn**

### Understanding Churn Status

| Status | Description |
|--------|-------------|
| **Active** | Shipping regularly, within expected patterns |
| **At-Risk** | Overdue for their next load based on historical patterns |
| **Churned** | No activity beyond expected timeframe |
| **New** | Recently onboarded customer |
| **Reactivated** | Previously churned customer who resumed shipping |

### Risk Scoring

Each shipper receives a risk score (0-100) based on:
- **Days Overdue** (40%) - How many days past their expected next load
- **Volume Decline** (30%) - Drop in load count vs. historical average
- **Pattern Deviation** (20%) - Shipping frequency changes
- **Tenure** (10%) - How long they've been a customer

### Dynamic Thresholds

The system adapts thresholds based on each shipper's typical shipping frequency:
- **Frequent shippers** (weekly): Tighter windows for at-risk detection
- **Infrequent shippers** (monthly): Longer windows before flagging

### Load Frequency Labels

| Label | Meaning |
|-------|---------|
| **Very High** | Ships multiple times per week |
| **Weekly** | Ships about once per week |
| **Bi-weekly** | Ships every 2 weeks |
| **Monthly** | Ships about once per month |
| **Infrequent** | Ships less than once per month |

### Using the Dashboard

The dashboard has four tabs:
1. **Summary** - Overview of all shippers by status
2. **At-Risk** - Shippers who may churn soon
3. **Churned** - Inactive customers to win back
4. **High Risk** - Active shippers with elevated risk scores

**Actions**:
- Click **Refresh Metrics** to recalculate all shipper patterns
- Use venture filter to focus on specific business units
- Toggle test mode to include/exclude test data

---

## Shipper ICP Analysis

### Overview

The Shipper ICP (Ideal Customer Profile) Analysis helps you identify your best customers and find more like them.

**Accessing Shipper ICP**: Navigate to **Freight > Shipper ICP**

### ICP Scoring

Each shipper receives an ICP score (0-100) based on five factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Margin** | 25% | Average margin percentage on loads |
| **Volume** | 25% | Number of loads shipped |
| **Coverage Rate** | 20% | Percentage of loads successfully covered |
| **Tenure** | 15% | How long they've been a customer |
| **Lane Diversity** | 15% | Variety of lanes/routes used |

### Tier Segmentation

Shippers are grouped into tiers based on their ICP score:

| Tier | Score Range | Description |
|------|-------------|-------------|
| **A** | 80-100 | Top performers, ideal customers |
| **B** | 60-79 | Strong customers with growth potential |
| **C** | 40-59 | Average customers, may need attention |
| **D** | 0-39 | Underperforming, evaluate relationship |

### Ideal Profile

The system analyzes your A-tier customers to create an "Ideal Shipper Profile" showing:
- Average load volume
- Typical margin range
- Common equipment types
- Preferred lanes
- Average tenure

Use this profile to identify prospects who match your best customers.

### Growth Potential

Each shipper is assigned a growth potential rating:
- **HIGH** - Room to significantly increase volume
- **MEDIUM** - Some growth opportunity
- **LOW** - Already at capacity or declining

### Risk/Reward Quadrant

The quadrant matrix categorizes shippers for strategic action:

| Quadrant | Action |
|----------|--------|
| **Protect** | High value, low risk - Maintain relationship |
| **Retain** | High value, high risk - Prevent churn |
| **Grow** | Low value, low risk - Increase volume |
| **Evaluate** | Low value, high risk - Consider dropping |

---

## Carrier Management & FMCSA Import

### Overview

The Carrier module helps you build and maintain a vetted carrier network with comprehensive FMCSA data.

**Accessing Carriers**: Navigate to **Freight > Carriers**

### Importing from FMCSA

Click **Import from FMCSA** to look up carriers by DOT or MC number.

The system captures 30+ data points including:

**Company Information**
- Legal name and DBA name
- Entity type (Carrier, Broker, Freight Forwarder)
- Power units and driver count
- Passenger carrier status

**Identifiers**
- DOT Number
- MC Number
- EIN (Tax ID)

**Operating Authority**
- Common Authority status
- Contract Authority status
- Broker Authority status
- Interstate vs Intrastate operation

**Insurance Coverage**
- BIPD (Bodily Injury/Property Damage) - Amount on file, required amount
- Cargo Insurance - Amount on file
- Bond Insurance - Amount on file

**Safety & Compliance**
- Safety Rating (Satisfactory, Conditional, Unsatisfactory)
- MCS-150 filing status (current or outdated)
- Out of Service date (if applicable)
- ISS Score (Inspection Selection Score)

**Crash History**
- Total crashes
- Fatal crashes
- Injury crashes
- Towaway crashes

**Inspection Data**
- Driver inspections and OOS rate vs national average
- Vehicle inspections and OOS rate vs national average
- Hazmat inspections and OOS rate vs national average

### Safety Blocking

The system automatically blocks carriers from being onboarded if they have:
- **OUT OF SERVICE** status (oosDate set)
- **NOT AUTHORIZED** operating status

This prevents unsafe carriers from entering your network.

### Carrier Search

**Accessing Carrier Search**: Navigate to **Freight > Carrier Search**

Find carriers for specific lanes:
- **Recommended Carriers** - Based on lane history and past success
- **Explore New Carriers** - Expand your network
- City/state autocomplete or ZIP code entry
- Scoring based on on-time rate, equipment match, profile completeness

---

## Dispatcher Directory

### Overview

The Dispatcher Directory lets you manage multiple contacts at each carrier company, including dispatchers, owners, and after-hours contacts.

**Accessing Dispatchers**: Navigate to any carrier detail page, then scroll to the **Dispatchers** section.

### Dispatcher Information

Each dispatcher record includes:

| Field | Description |
|-------|-------------|
| **Name** | Contact name |
| **Email** | Email address |
| **Phone** | Primary phone number |
| **Mobile** | Mobile/cell number |
| **Role** | Dispatcher, Owner, After-Hours, etc. |
| **Is Backup** | Whether this is a backup contact |
| **Preferred Contact Method** | Email, Phone, or Text |
| **Notes** | Free-form notes about this contact |

### Managing Dispatchers

**Adding a Dispatcher**:
1. Go to a carrier's detail page
2. Click **Add Dispatcher** in the Dispatchers section
3. Fill in contact details
4. Click **Save**

**Editing a Dispatcher**:
1. Click the edit icon next to any dispatcher
2. Update fields as needed
3. Click **Save**

**Removing a Dispatcher**:
1. Click the delete icon next to the dispatcher
2. Confirm deletion

### Primary Dispatcher

The first dispatcher (or one marked as primary) appears automatically when:
- Viewing carrier matches for a load
- Using the AI Drafting tool
- Sending carrier drop notifications

---

## Find Carriers & Matching

### Overview

The intelligent carrier matching system helps you find the best carriers for each load based on multiple factors including lane history, equipment, and performance.

**Accessing Find Carriers**: From any load detail page, click **Find Carriers**

### Matching Algorithm

The system scores carriers (0-100) based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Equipment Match** | 25% | Carrier has required equipment type |
| **Lane History** | 15% | Previous successful deliveries on this lane |
| **Location Proximity** | 20% | Carrier base/recent location near pickup |
| **Rating** | 15% | Carrier's overall performance rating |
| **Compliance** | 15% | FMCSA status, insurance, and safety |
| **Availability** | 10% | Based on recent activity patterns |

### Lane History Scoring

The lane history component rewards carriers who have successfully delivered on similar routes:

- **Exact City Match** - Up to 75 points for matching origin AND destination cities
- **State Match** - Up to 30 points for matching states
- **Volume Bonus** - Extra points for high-volume carriers on the lane
- **Recency Decay** - Recent deliveries weighted more heavily

### Using the Results

The Find Carriers page shows:
- Carrier name with link to profile
- Match score with breakdown
- Primary dispatcher contact
- Equipment types available
- Last activity date

**Quick Actions**:
- **Draft AI Email** - Generate a personalized outreach email
- **Log Contact** - Record a phone call or email attempt
- **View Profile** - See full carrier details

### Notify Carriers

For urgent loads, use the **Notify Carriers** button to:
- Automatically email up to 5 top-matching carriers
- Include load details and contact information
- Rate-limited to prevent spam (30-minute cooldown)
- Creates contact log entries automatically

---

## Hospitality Management

### Hotel Properties

**Accessing Hotels**: Navigate to **Hotels**

Manage your hotel portfolio:
- Property name, code, and brand
- Location (city, state)
- Room count
- Status (Active, Renovation, Closed, Sold)
- Venture assignment

### Hotel KPIs

**Accessing KPIs**: Navigate to **Hotels > KPI**

Track daily performance metrics:

| Metric | Description |
|--------|-------------|
| **Occupancy %** | Rooms sold / Rooms available |
| **ADR** | Average Daily Rate - revenue per room sold |
| **RevPAR** | Revenue Per Available Room |
| **Room Revenue** | Total room sales |
| **Other Revenue** | F&B, parking, etc. |
| **Total Revenue** | Combined revenue |

### Reviews

**Accessing Reviews**: Navigate to **Hospitality > Reviews**

Monitor guest feedback across platforms:
- Google
- TripAdvisor
- Booking.com
- Expedia

Track response rates and manage your online reputation.

### Loss Nights

**Accessing Loss Nights**: Navigate to **Hotels > Loss Nights**

Track nights with unexpectedly low revenue or occupancy for root cause analysis.

---

## Hotel KPI Year-over-Year Reports

### Overview

Compare your hotel performance against the same period last year to identify trends and measure improvement.

**Accessing KPI Reports**: Navigate to **Hotels > KPI Report**

### Report Tabs

**MTD vs Last Year MTD**
- Month-to-date current year vs. same month last year
- Shows growth/decline percentages
- Color-coded indicators (green = improvement, red = decline)

**YTD vs Last Year YTD**
- Year-to-date current year vs. same period last year
- Cumulative performance comparison
- Rolling trend analysis

### Metrics Compared

| Metric | Description |
|--------|-------------|
| **Revenue** | Total room revenue, TY vs LY |
| **Occupancy %** | Rooms sold / available, TY vs LY |
| **ADR** | Average Daily Rate, TY vs LY |
| **RevPAR** | Revenue Per Available Room, TY vs LY |
| **Rooms Sold** | Total rooms sold, TY vs LY |
| **Rooms Available** | Total inventory, TY vs LY |

### 30-Day Trend Charts

Visual comparison charts showing daily performance for:
- Revenue this year vs. last year
- Occupancy this year vs. last year
- ADR this year vs. last year
- RevPAR this year vs. last year

---

## Hotel P&L Management

### Overview

Track hotel profit and loss with detailed expense categorization.

**Accessing P&L Manager**: Navigate to **Admin > Hotels > P&L**

### Monthly P&L Entry

Enter monthly financial data for each property:
- Revenue figures from STR or PMS
- Operating expenses
- Cash expenses (petty cash, on-site purchases)
- Bank expenses (credit card, ACH, wire payments)

### Expense Categories

| Category | Color Code | Description |
|----------|------------|-------------|
| **Operating Expenses** | Default | Standard operational costs |
| **Cash Expenses** | Green | Cash transactions at property |
| **Bank Expenses** | Blue | Electronic payment transactions |

### P&L Calculation

Net P&L = Total Revenue - (Operating Expenses + Cash Expenses + Bank Expenses)

The system automatically calculates net profit/loss and highlights:
- Profitable months in green
- Loss months in red

---

## Hotel Disputes & Chargebacks

### Overview

Track and resolve credit card chargebacks and OTA disputes.

**Accessing Disputes**: Navigate to **Hotels > Disputes**

### Dispute Types

- **Chargebacks** - Credit card disputes
- **OTA Disputes** - Issues with Booking.com, Expedia, Airbnb
- **Rate Discrepancies** - Pricing conflicts
- **Guest Complaints** - Direct guest issues

### Tracking Information

Each dispute tracks:
- Disputed amount and original charge
- Guest information
- Stay dates
- Evidence due dates
- Resolution status (Open, WON, LOST)
- Notes and history

### Summary Dashboard

The disputes page shows:
- **Total Disputes** count
- **Open/WON/LOST** breakdown
- **Chargeback Totals by Hotel** - Sorted by amount lost (highest first)

This helps identify problem properties that need attention.

### Resolving Disputes

1. Click on a dispute to view details
2. Add notes with evidence and updates
3. Use **Mark as Won** or **Mark as Lost** buttons
4. Enter resolution reason in the modal
5. Decision date is recorded automatically

---

## BPO Management

### Campaigns

**Accessing Campaigns**: Navigate to **BPO > Campaigns**

Manage call center campaigns:
- Campaign name and type
- Client information
- Start/end dates
- FTE count
- Active status

### Daily Metrics

Track campaign performance:

| Metric | Description |
|--------|-------------|
| **Handled Calls** | Total calls processed |
| **Outbound Calls** | Calls made by agents |
| **Talk Time** | Total minutes on calls |
| **Leads Created** | New leads generated |
| **Demos Booked** | Scheduled demonstrations |
| **Sales Closed** | Completed sales |
| **QA Score** | Quality assurance rating |
| **Revenue** | Total campaign revenue |
| **Cost** | Campaign operating costs |

### Real-Time Dashboard

**Accessing Real-Time**: Navigate to **BPO > Real-Time**

See live agent status:
- Available
- On Call
- After Call Work
- Break
- Offline

### Incentives

**Accessing Incentives**: Navigate to **BPO > Incentives** or **Incentives > [Venture]**

Track performance-based pay:
- Incentive plan tiers
- Daily performance calculations
- Payout history
- Filter by venture and office

---

## SaaS Management

### Customers

**Accessing SaaS Customers**: Navigate to **SaaS > Customers**

Track your software customers:
- Company name and contacts
- Subscription tier
- Monthly recurring revenue (MRR)
- Account status

### Subscriptions

**Accessing Subscriptions**: Navigate to **SaaS > Subscriptions**

Manage subscription lifecycle:
- Plan details
- Billing frequency
- Renewal dates
- Usage metrics
- Cancellation with reason capture

### Metrics

**Accessing Metrics**: Navigate to **SaaS > Metrics**

Key SaaS metrics:
- **MRR/ARR** - Monthly/Annual recurring revenue
- **Churn Rate** - Customer loss percentage
- **ARPU** - Average revenue per user
- **Cohort Analysis** - Retention curves by signup month

---

## SaaS Sales KPI

### Overview

Track your SaaS sales team's performance from demos to onboarding.

**Accessing Sales KPI**: Navigate to **SaaS > Sales KPI**

### Dashboard Features

**Filters**
- Venture filter (SaaS ventures only)
- Date range (Today, Last 7 Days, MTD)

**Summary Cards**
- Total Calls made
- Hours on Phone
- Active Reps count
- Demos Booked
- Clients Onboarded (with pending count)
- Monthly MRR contribution

**Recent Client Onboardings Table**
- Client name
- Sales rep who closed
- Plan selected
- MRR value
- Status (Pending/Active)
- Date

**User Performance Table**
- Demo-to-client conversion rate
- Pending onboardings
- MRR generated
- Cost
- ROI percentage

### Recording Daily KPIs

Use the inline form to record:
- Salesperson name
- Calls made
- Hours on phone
- Demos booked
- Clients onboarded

---

## Holdings & Finance

### Bank Accounts

**Accessing Bank Accounts**: Navigate to **Holdings > Bank**

Track financial accounts across ventures:
- Account name and bank
- Account number
- Currency (USD, INR, etc.)
- Current balance

### Balance Snapshots

Record point-in-time balances:
- Date of snapshot
- Balance amount
- Notes

View per-currency totals with proper formatting.

### Assets

**Accessing Assets**: Navigate to **Holdings > Assets**

Track holding company assets and investments:
- Property details
- Acquisition date and value
- Current status
- Linked documents

### Document Vault

**Accessing Documents**: Navigate to **Holdings > Documents**

Store and organize important documents:
- Contracts and deeds
- Insurance policies
- Financial statements
- Categorization by type
- Link to specific assets

---

## IT Assets

### Asset Inventory

**Accessing IT Assets**: Navigate to **IT Assets**

Track hardware and equipment:
- **Asset Tag** - Your internal identifier (e.g., IT-001)
- **Serial Number** - Manufacturer serial
- **Category** - Laptop, Desktop, Monitor, Phone, etc.
- **Make/Model** - Dell XPS 15, MacBook Pro, etc.
- **Specs** - RAM, storage, processor
- **Status** - Available, Assigned, Maintenance, Retired
- **Condition** - Excellent, Good, Fair, Poor
- **Warranty Expiration** - Track warranty coverage

### Assignment Tracking

- See which user has each asset
- View assignment history
- Transfer assets between users
- Track warranty expiration dates

---

## Administration

### User Management

**Accessing Users**: Navigate to **Admin > Users** (CEO/Admin only)

Manage system users:
- Create new users with email
- Assign roles
- Associate users with ventures and offices
- Set reporting manager
- Activate/deactivate accounts

### Org Chart

**Accessing Org Chart**: Navigate to **Admin > Org Chart**

Visual representation of reporting hierarchy:
- Collapsible tree view
- See who reports to whom
- Role-based sorting

### Impersonation

Administrators and CEOs can impersonate other users to:
- Troubleshoot access issues
- Verify what users can see
- Test role-based permissions

All impersonation activity is logged for audit purposes.

---

## AI Usage Monitoring

### Overview

Monitor and manage AI feature usage across the organization to ensure responsible use and cost control.

**Accessing AI Usage**: Navigate to **Admin > AI Usage** (CEO/Admin only)

### Dashboard Metrics

The AI Usage dashboard shows:

| Metric | Description |
|--------|-------------|
| **Total Requests** | Number of AI requests in the period |
| **Unique Users** | How many users have used AI features |
| **Success Rate** | Percentage of successful AI calls |
| **Tokens Used** | Estimated token consumption |

### Usage by User

See which users are leveraging AI features:
- Request count per user
- Success/failure rates
- Most used AI endpoints

### Daily Trends

Line chart showing AI usage patterns over time:
- Identify peak usage days
- Spot unusual activity
- Plan capacity needs

### Error Breakdown

When AI requests fail, the system categorizes errors:
- **Rate Limited** - User exceeded usage limits
- **Guardrail Blocked** - Potentially unsafe input detected
- **API Error** - OpenAI service issues
- **Timeout** - Request took too long

### AI Safety Guardrails

The system includes built-in safety measures:

**Rate Limiting**
- 10 requests per user per minute per endpoint
- 100 total AI calls per user per day

**Input Validation**
- Blocks prompt injection attempts
- Sanitizes HTML and script tags
- Filters potentially harmful content

**Output Filtering**
- Redacts sensitive data from AI responses
- Removes API keys, passwords, SSNs if accidentally generated

### Activity Log

**Accessing Activity Log**: Navigate to **Admin > Activity Log**

See all user actions:
- Login/logout
- Create, update, delete operations
- Filter by user, action type, module
- Timestamp and details

### Audit System

**Accessing Audit**: Navigate to **Admin > Audit**

Automated compliance checking:
- Data quality issues
- Missing required fields
- Policy violations
- Run audits on demand
- View issue severity

---

## User Roles & Permissions

### Role Hierarchy

| Role | Access Level |
|------|--------------|
| **CEO** | Full access to all ventures, can impersonate any user |
| **ADMIN** | Full access, can impersonate non-CEO users |
| **COO** | Operational access to all ventures |
| **HR_ADMIN** | User management access |
| **VENTURE_HEAD** | Full access to assigned ventures only |
| **OFFICE_MANAGER** | Manages assigned offices within ventures |
| **TEAM_LEAD** | Team-level access within offices |
| **EMPLOYEE** | Basic access to assigned tasks |
| **FINANCE** | Financial data and KPI access |
| **CSR** | Customer service rep - customer-scoped access |
| **DISPATCHER** | Logistics dispatching access |
| **CARRIER_TEAM** | Carrier relationship management |
| **ACCOUNTING** | Financial records and reporting |
| **AUDITOR** | Read-only access for compliance |

### Permission Types

| Permission | Levels |
|------------|--------|
| **None** | No access |
| **View** | Can see but not modify |
| **Edit** | Can modify existing records |
| **Manage** | Full CRUD access |

---

## Data Import Guide

### Flexible Import System

**Accessing Import**: Navigate to **Import**

SIOX supports importing data from various sources.

### Supported File Formats
- CSV (Comma Separated Values)
- XLSX (Excel)
- TSV (Tab Separated Values)
- TXT (Text files with delimiters)

### Import Types

| Type | Description |
|------|-------------|
| **TMS Loads** | Import load data from transportation management systems |
| **RingCentral Calls** | Import call logs for sales KPI tracking |
| **Carriers** | Bulk import carrier information |
| **Shippers** | Bulk import shipper data |
| **Hotel KPIs** | Import daily hotel performance data |
| **Freight KPIs** | Import freight performance metrics |
| **BPO Metrics** | Import call center daily metrics |

### Import Workflow

1. **Upload File** - Drag and drop or select your file
2. **Preview Data** - Review the first few rows
3. **Map Columns** - Match your columns to system fields
4. **Validate** - System checks for errors
5. **Save Template** (optional) - Reuse mapping for future imports
6. **Commit** - Import the data

---

## EOD Reports & Accountability

### End-of-Day Reports

**Submitting EOD**: Navigate to **EOD Reports > Submit**

Daily reports include:
- **Summary** - Brief overview of your day
- **Accomplishments** - What you completed
- **Blockers** - Issues preventing progress
- **Tomorrow's Plan** - Next day priorities
- **Hours Worked** - Time tracking
- **Tasks Completed** - Link to finished tasks

### Streak Tracking

The system tracks consecutive days of EOD submission:
- Build streaks for consistent reporting
- Visible on My Day page
- Encourages daily accountability

### Overdue Tasks

Tasks have priority-based thresholds:
- **High/Critical**: 3 days before overdue
- **Medium**: 7 days before overdue

Overdue tasks require explanation before proceeding.

---

## Gamification

### Overview

**Accessing Gamification**: Navigate to **Gamification**

The system rewards positive behaviors with points:
- Completing tasks
- Submitting EOD reports on time
- Meeting KPI targets
- Maintaining streaks

### Leaderboards

See top performers:
- Company-wide rankings
- Venture-specific rankings
- Office-specific rankings
- Weekly/Monthly views

Filter by venture and office for focused views.

---

## User Preferences

### Accessing Preferences

Navigate to **Settings > Preferences**

### Available Settings

| Setting | Options |
|---------|---------|
| **Theme** | Light, Dark, System (auto-detect) |
| **Density** | Comfortable (more spacing), Compact (less spacing) |
| **Font Size** | Small, Medium, Large |
| **Landing Page** | Choose your default page after login |

Changes take effect immediately.

---

## Test Mode

### Overview

Test Mode allows you to include or exclude test data from all views.

### Toggling Test Mode

Look for the **Test Mode: OFF/ON** toggle in the bottom-left corner of the sidebar.

### When Test Mode is OFF (Default)
- Only production data is shown
- Test hotels, shippers, and ventures are hidden
- Recommended for daily operations

### When Test Mode is ON
- Test data is included alongside production data
- Useful for development and training
- Test records are marked with `isTest: true` in the database

### Affected Modules

Test mode filtering applies to:
- Hotels and hospitality reports
- Shippers and shipper churn analytics
- Ventures
- All related KPIs and metrics

---

## Common Workflows

### Daily Operations - Logistics

**Morning Routine**:
1. Check **Daily Briefing** for urgent issues
2. Review **At-Risk Loads** approaching pickup
3. Check **Lost Loads** from previous day
4. Review **Sales KPI Dashboard** for team performance

**Throughout the Day**:
- Monitor loads in transit
- Cover open loads
- Respond to carrier/shipper issues

**End of Day**:
- Submit EOD report
- Review tomorrow's pickups
- Check shipper churn for at-risk customers

### Monthly Reviews

1. Run **AI Postmortem** on lost loads
2. Review **Shipper Churn** high-risk list
3. Check **Carrier Performance** metrics
4. Analyze **P&L** by lane and customer

---

## FAQ & Troubleshooting

### Login Issues

**Q: I'm not receiving the OTP email**
A: Check your spam folder. If still not received, contact your administrator.

**Q: My session expired**
A: Sessions expire after periods of inactivity. Simply log in again.

### Data Questions

**Q: Why can't I see certain ventures?**
A: Your role may not have access. Contact your administrator.

**Q: Why is some data missing?**
A: Check if Test Mode is OFF - test data is hidden by default.

### Performance

**Q: The page is loading slowly**
A: Try refreshing or narrowing your date range filters.

---

*Last Updated: December 10, 2025*

---

## Quick Reference

### Key URLs

| Feature | Path |
|---------|------|
| Login | / |
| Overview | /overview |
| Loads | /freight/loads |
| Carriers | /freight/carriers |
| Coverage War Room | /freight/coverage-war-room |
| Shipper Churn | /freight/shipper-churn |
| Shipper ICP | /freight/shipper-icp |
| AI Drafting | /freight/ai/carrier-draft |
| Hotels | /hotels |
| Hotel KPI Report | /hotels/kpi-report |
| BPO Real-Time | /bpo/real-time |
| SaaS Metrics | /saas/metrics |
| AI Usage | /admin/ai-usage |
| User Settings | /settings |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Close modal/dialog |
| `Enter` | Submit form |
| `Tab` | Navigate between fields |

### Support

For technical support or questions:
- Contact your system administrator
- Email: itsupport@sioxglobal.com
