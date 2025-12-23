const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedBonusThresholdData() {
  try {
    console.log('🎯 Creating additional loads to test BONUS_ON_TARGET...');

    // Get the test user
    const user = await prisma.user.findFirst({
      where: { email: 'test.incentive@example.com' }
    });

    if (!user) {
      console.error('❌ Test user not found');
      return;
    }

    const testDate = new Date('2024-01-16'); // Different date for bonus test
    const billingDate = new Date('2024-01-16');
    
    // Create 12 more loads to exceed the 10-load threshold (total will be 15)
    const additionalLoads = [];
    for (let i = 0; i < 12; i++) {
      additionalLoads.push({
        ventureId: 1,
        createdById: user.id,
        loadStatus: 'DELIVERED',
        billingDate: billingDate,
        billAmount: 1000 + (i * 100),
        miles: 500 + (i * 50),
        marginAmount: 200 + (i * 20),
        pickupCity: 'Test City',
        pickupState: 'TX',
        dropCity: 'Test Delivery',
        dropState: 'CA',
        pickupDate: testDate,
        dropDate: testDate,
        reference: `BONUS-TEST-${i + 1}`,
        shipperName: 'Test Shipper',
        customerName: 'Test Customer',
        equipmentType: 'VAN',
        weightLbs: 10000,
        rate: 1000 + (i * 100),
        isTest: true
      });
    }

    for (const loadData of additionalLoads) {
      const load = await prisma.load.create({
        data: loadData
      });
      console.log(`✅ Bonus test load created: $${load.billAmount}, ${load.miles} miles`);
    }

    console.log('\n📊 Expected Calculations for 2024-01-16 (with 12 loads):');
    console.log('Total Loads: 12 (exceeds 10 threshold)');
    console.log('Expected BONUS_ON_TARGET: $500 (threshold met)');

    console.log('\n✅ Bonus threshold test data seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding bonus threshold data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedBonusThresholdData();