import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedIncentives() {
  const ventures = await prisma.venture.findMany();
  
  console.log(`Found ${ventures.length} ventures`);
  
  for (const venture of ventures) {
    const existingPlan = await prisma.incentivePlan.findFirst({
      where: { ventureId: venture.id }
    });
    
    if (!existingPlan) {
      const plan = await prisma.incentivePlan.create({
        data: {
          ventureId: venture.id,
          name: `${venture.name} Incentive Plan`,
          isActive: true,
          effectiveFrom: new Date('2025-01-01'),
          effectiveTo: null
        }
      });
      console.log(`Created incentive plan for ${venture.name}: ${plan.id}`);
      
      const rules = [
        { roleKey: 'SALES_REP', metricKey: 'LOADS_BOOKED', calcType: 'FLAT_PER_UNIT', rate: 50, currency: 'USD' },
        { roleKey: 'SALES_REP', metricKey: 'REVENUE', calcType: 'PERCENT_OF_METRIC', rate: 0.5, currency: 'USD' },
        { roleKey: 'DISPATCHER', metricKey: 'LOADS_DISPATCHED', calcType: 'FLAT_PER_UNIT', rate: 25, currency: 'USD' },
      ];
      
      for (const rule of rules) {
        await prisma.incentiveRule.create({
          data: {
            planId: plan.id,
            roleKey: rule.roleKey,
            metricKey: rule.metricKey,
            calcType: rule.calcType as any,
            rate: rule.rate,
            currency: rule.currency,
            isEnabled: true
          }
        });
      }
      console.log(`Created ${rules.length} rules for plan ${plan.id}`);
    } else {
      console.log(`Plan already exists for ${venture.name}`);
    }
  }
  
  console.log('Done seeding incentives!');
}

seedIncentives()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
