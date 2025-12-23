import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting load alias backfill...");

  const loads = await prisma.load.findMany({
    where: {
      OR: [
        { salesAgentAliasId: null },
        { csrAliasId: null },
        { dispatcherAliasId: null },
      ],
    },
    include: {
      createdBy: true,
    },
  });

  console.log(`Found ${loads.length} loads to process...`);

  let updated = 0;
  let skipped = 0;

  for (const load of loads) {
    let salesAgentAliasId = load.salesAgentAliasId;
    let csrAliasId = load.csrAliasId;
    let dispatcherAliasId = load.dispatcherAliasId;

    // If load has a createdBy user, try to find their primary alias
    if (load.createdBy) {
      const alias = await prisma.staffAlias.findFirst({
        where: {
          userId: load.createdBy.id,
          isPrimaryForUser: true,
        },
      });

      if (alias) {
        // Assign based on alias role
        if (alias.role === "SALES_AGENT" && !salesAgentAliasId) {
          salesAgentAliasId = alias.id;
        } else if (alias.role === "CSR" && !csrAliasId) {
          csrAliasId = alias.id;
        } else if (alias.role === "DISPATCHER" && !dispatcherAliasId) {
          dispatcherAliasId = alias.id;
        }
      }
    }

    // If createdByTmsName exists, try to match by normalized name
    if (load.createdByTmsName) {
      const normalizedName = load.createdByTmsName.trim().toUpperCase();
      const alias = await prisma.staffAlias.findUnique({
        where: { normalizedName },
      });

      if (alias) {
        if (alias.role === "SALES_AGENT" && !salesAgentAliasId) {
          salesAgentAliasId = alias.id;
        } else if (alias.role === "CSR" && !csrAliasId) {
          csrAliasId = alias.id;
        } else if (alias.role === "DISPATCHER" && !dispatcherAliasId) {
          dispatcherAliasId = alias.id;
        }
      }
    }

    // Only update if we found at least one alias
    if (
      salesAgentAliasId !== load.salesAgentAliasId ||
      csrAliasId !== load.csrAliasId ||
      dispatcherAliasId !== load.dispatcherAliasId
    ) {
      await prisma.load.update({
        where: { id: load.id },
        data: {
          salesAgentAliasId,
          csrAliasId,
          dispatcherAliasId,
        },
      });
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\nBackfill complete:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
