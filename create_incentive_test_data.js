const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createIncentiveTestData() {
  try {
    console.log('Creating incentive test data...');
    
    // Get the first user (should be CEO in dev mode)
    const user = await prisma.user.findFirst({
      orderBy: { id: 'asc' }
    });
    
    if (!user) {
      console.log('No users found. Please seed users first.');
      return;
    }
    
    console.log(`Creating incentive data for user: ${user.email} (ID: ${user.id})`);
    
    // Get the first venture
    const venture = await prisma.venture.findFirst({
      orderBy: { id: 'asc' }
    });
    
    if (!venture) {
      console.log('No ventures found. Please seed ventures first.');
      return;
    }
    
    console.log(`Using venture: ${venture.name} (ID: ${venture.id})`);
    
    // Create incentive data for the last 10 days
    const incentiveData = [];
    const today = new Date();
    
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0); // Normalize to start of day
      
      const amount = Math.random() * 500 + 50; // Random amount between $50-$550
      const breakdown = {
        rules: [
          { ruleId: 1, amount: amount * 0.6 },
          { ruleId: 2, amount: amount * 0.4 }
        ]
      };
      
      incentiveData.push({
        userId: user.id,
        ventureId: venture.id,
        date: date,
        amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
        currency: 'USD',
        breakdown: breakdown
      });
    }
    
    // Insert the data using upsert to avoid duplicates
    for (const data of incentiveData) {
      await prisma.incentiveDaily.upsert({
        where: {
          userId_date_ventureId: {
            userId: data.userId,
            date: data.date,
            ventureId: data.ventureId
          }
        },
        update: {
          amount: data.amount,
          currency: data.currency,
          breakdown: data.breakdown
        },
        create: data
      });
    }
    
    console.log(`Created ${incentiveData.length} incentive records`);
    
    // Verify the data
    const count = await prisma.incentiveDaily.count({
      where: { userId: user.id }
    });
    
    console.log(`Total incentive records for user: ${count}`);
    
  } catch (error) {
    console.error('Error creating incentive test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createIncentiveTestData();