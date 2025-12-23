const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedIncentiveData() {
  try {
    console.log('🌱 Seeding incentive test data...');

    // 1. Create Venture with id=1 if it doesn't exist
    const venture = await prisma.venture.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: 'Test Venture for Incentives',
        type: 'LOGISTICS',
        logisticsRole: 'BROKER'
      }
    });
    console.log('✅ Venture created/updated:', venture.name);

    // 2. Create a test user mapped to venture 1
    const user = await prisma.user.upsert({
      where: { email: 'test.incentive@example.com' },
      update: {},
      create: {
        email: 'test.incentive@example.com',
        fullName: 'Test Incentive User',
        role: 'EMPLOYEE',
        isTestUser: true
      }
    });

    // Map user to venture
    await prisma.ventureUser.upsert({
      where: {
        userId_ventureId: {
          userId: user.id,
          ventureId: 1
        }
      },
      update: {},
      create: {
        userId: user.id,
        ventureId: 1
      }
    });
    console.log('✅ User created and mapped to venture:', user.fullName);

    // 3. Create IncentivePlan with id=1, ventureId=1
    const plan = await prisma.incentivePlan.upsert({
      where: { id: 1 },
      update: {
        ventureId: 1,
        name: 'Test Incentive Plan',
        isActive: true,
        effectiveFrom: new Date('2024-01-01')
      },
      create: {
        id: 1,
        ventureId: 1,
        name: 'Test Incentive Plan',
        isActive: true,
        effectiveFrom: new Date('2024-01-01')
      }
    });
    console.log('✅ Incentive plan created:', plan.name);

    // 4. Create IncentiveRules with different calcTypes
    const rules = [
      {
        planId: 1,
        roleKey: 'SALES',
        metricKey: 'loads_revenue',
        calcType: 'PERCENT_OF_METRIC',
        rate: 0.02, // 2% of revenue
        currency: 'USD',
        isEnabled: true
      },
      {
        planId: 1,
        roleKey: 'SALES', 
        metricKey: 'loads_completed',
        calcType: 'FLAT_PER_UNIT',
        rate: 50, // $50 per load
        currency: 'USD',
        isEnabled: true
      },
      {
        planId: 1,
        roleKey: 'SALES',
        metricKey: 'loads_miles',
        calcType: 'CURRENCY_PER_DOLLAR',
        rate: 0.1, // $0.10 per mile
        currency: 'USD',
        isEnabled: true
      },
      {
        planId: 1,
        roleKey: 'SALES',
        metricKey: 'loads_completed',
        calcType: 'BONUS_ON_TARGET',
        rate: 0,
        currency: 'USD',
        config: {
          thresholdValue: 10, // 10 loads threshold
          bonusAmount: 500 // $500 bonus
        },
        isEnabled: true
      }
    ];

    // Delete existing rules for plan 1 first
    await prisma.incentiveRule.deleteMany({
      where: { planId: 1 }
    });

    for (const rule of rules) {
      const createdRule = await prisma.incentiveRule.create({
        data: rule
      });
      console.log(`✅ Rule created: ${createdRule.calcType} for ${createdRule.metricKey}`);
    }

    // 5. Create some Load data for the test date
    const testDate = new Date('2024-01-15');
    const billingDate = new Date('2024-01-15');
    
    // Create loads with different values
    const loads = [
      {
        ventureId: 1,
        createdById: user.id,
        loadStatus: 'DELIVERED',
        billingDate: billingDate,
        billAmount: 1000,
        miles: 500,
        marginAmount: 200
      },
      {
        ventureId: 1,
        createdById: user.id,
        loadStatus: 'DELIVERED',
        billingDate: billingDate,
        billAmount: 1500,
        miles: 750,
        marginAmount: 300
      },
      {
        ventureId: 1,
        createdById: user.id,
        loadStatus: 'DELIVERED',
        billingDate: billingDate,
        billAmount: 2000,
        miles: 1000,
        marginAmount: 400
      }
    ];

    for (const loadData of loads) {
      const load = await prisma.load.create({
        data: {
          ...loadData,
          pickupCity: 'Test City',
          pickupState: 'TX',
          dropCity: 'Test Delivery',
          dropState: 'CA',
          pickupDate: testDate,
          dropDate: testDate,
          reference: `TEST-${Date.now()}`,
          shipperName: 'Test Shipper',
          customerName: 'Test Customer',
          equipmentType: 'VAN',
          weightLbs: 10000,
          rate: loadData.billAmount,
          isTest: true
        }
      });
      console.log(`✅ Load created: $${load.billAmount}, ${load.miles} miles, $${load.marginAmount} margin`);
    }

    console.log('\n📊 Expected Calculations for 2024-01-15:');
    console.log('Total Revenue: $4,500 (1000 + 1500 + 2000)');
    console.log('Total Miles: 2,250 (500 + 750 + 1000)');
    console.log('Total Loads: 3');
    console.log('');
    console.log('Expected Incentives:');
    console.log('- PERCENT_OF_METRIC (2% of $4,500): $90');
    console.log('- FLAT_PER_UNIT (3 loads × $50): $150');
    console.log('- CURRENCY_PER_DOLLAR (2,250 miles × $0.10): $225');
    console.log('- BONUS_ON_TARGET (3 loads < 10 threshold): $0');
    console.log('Total Expected: $465');

    console.log('\n✅ Incentive test data seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding incentive data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedIncentiveData();