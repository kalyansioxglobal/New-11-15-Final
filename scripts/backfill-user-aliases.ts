import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalize(str: string) {
  return str.trim().toUpperCase();
}

async function main() {
  console.log("Starting user alias backfill...");
  
  const users = await prisma.user.findMany();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    const alias = (user.alias ?? user.fullName ?? "").trim();
    if (!alias) {
      skipped++;
      continue;
    }

    const normalizedName = normalize(alias);

    const existing = await prisma.staffAlias.findUnique({
      where: { normalizedName },
    });

    if (!existing) {
      await prisma.staffAlias.create({
        data: {
          name: alias,
          normalizedName,
          role: "DISPATCHER",
          userId: user.id,
          isPrimaryForUser: true,
        },
      });
      created++;
      console.log(`Created alias "${alias}" for user ${user.email}`);
    } else if (!existing.userId) {
      await prisma.staffAlias.update({
        where: { id: existing.id },
        data: {
          userId: user.id,
          isPrimaryForUser: true,
        },
      });
      updated++;
      console.log(`Linked existing alias "${alias}" to user ${user.email}`);
    } else {
      skipped++;
    }

    if (!user.alias) {
      await prisma.user.update({
        where: { id: user.id },
        data: { alias },
      });
    }
  }

  console.log(`\nBackfill complete:`);
  console.log(`  Created: ${created}`);
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
