import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BackfillStats {
  scanned: number;
  updated: number;
  skippedMissingShipper: number;
  skippedShipperMissingCustomer: number;
}

async function backfillLoadCustomerIdFromShipper(options: {
  dryRun: boolean;
  limit: number;
  offset: number;
}): Promise<BackfillStats> {
  const { dryRun, limit, offset } = options;

  const stats: BackfillStats = {
    scanned: 0,
    updated: 0,
    skippedMissingShipper: 0,
    skippedShipperMissingCustomer: 0,
  };

  console.log(`\n=== Backfill Load CustomerIds from Shipper ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`Limit: ${limit}, Offset: ${offset}\n`);

  const loadsToProcess = await prisma.load.findMany({
    where: {
      shipperId: { not: null },
      customerId: null,
    },
    select: {
      id: true,
      shipperId: true,
      tmsLoadId: true,
    },
    skip: offset,
    take: limit,
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${loadsToProcess.length} loads to process\n`);

  for (const load of loadsToProcess) {
    stats.scanned++;

    if (!load.shipperId) {
      stats.skippedMissingShipper++;
      console.log(`[SKIP] Load ${load.id}: Missing shipperId`);
      continue;
    }

    const shipper = await prisma.logisticsShipper.findUnique({
      where: { id: load.shipperId },
      select: { id: true, customerId: true, name: true },
    });

    if (!shipper) {
      stats.skippedMissingShipper++;
      console.log(`[SKIP] Load ${load.id}: Shipper ${load.shipperId} not found`);
      continue;
    }

    if (!shipper.customerId) {
      stats.skippedShipperMissingCustomer++;
      console.log(`[SKIP] Load ${load.id}: Shipper "${shipper.name}" (${shipper.id}) has no customerId`);
      continue;
    }

    if (dryRun) {
      console.log(`[DRY RUN] Load ${load.id}: Would set customerId to ${shipper.customerId}`);
      stats.updated++;
    } else {
      await prisma.load.update({
        where: { id: load.id },
        data: { customerId: shipper.customerId },
      });
      console.log(`[UPDATED] Load ${load.id}: Set customerId to ${shipper.customerId}`);
      stats.updated++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Scanned: ${stats.scanned}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped (missing shipper): ${stats.skippedMissingShipper}`);
  console.log(`Skipped (shipper missing customer): ${stats.skippedShipperMissingCustomer}`);

  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  
  const dryRun = !args.includes('--apply');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const offsetArg = args.find(a => a.startsWith('--offset='));

  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 5000;
  const offset = offsetArg ? parseInt(offsetArg.split('=')[1], 10) : 0;

  if (limit > 5000) {
    console.error('Error: limit cannot exceed 5000 per run');
    process.exit(1);
  }

  try {
    await backfillLoadCustomerIdFromShipper({ dryRun, limit, offset });
  } catch (error) {
    console.error('Error during backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
