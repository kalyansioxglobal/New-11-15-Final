import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedGamificationConfigs() {
  const ventures = await prisma.venture.findMany();
  
  console.log(`Found ${ventures.length} ventures`);
  
  for (const venture of ventures) {
    const existing = await prisma.gamificationConfig.findUnique({
      where: { ventureId: venture.id }
    });
    
    if (!existing) {
      await prisma.gamificationConfig.create({
        data: {
          ventureId: venture.id,
          config: {
            isEnabled: true,
            showLeaderboard: true,
            showBadges: true,
            pointsConfig: {
              pointsPerLoad: 100,
              pointsPerCall: 10,
              pointsPerBooking: 50,
              bonusThreshold: 1000,
              bonusMultiplier: 1.5
            }
          }
        }
      });
      console.log(`Created gamification config for venture: ${venture.name} (ID: ${venture.id})`);
    } else {
      console.log(`Config already exists for venture: ${venture.name} (ID: ${venture.id})`);
    }
  }
  
  console.log('Done!');
}

seedGamificationConfigs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
