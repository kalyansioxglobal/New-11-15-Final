import prisma from "@/lib/prisma";

const cityToCode = (city: string): string => {
  if (!city) return "XXX";
  const main = city.split(",")[0].trim();
  if (main.length <= 3) return main.toUpperCase();
  return main.slice(0, 3).toUpperCase();
};

export async function generateLoadReference(
  ventureId: number,
  pickupCity: string,
  dropCity: string
): Promise<string> {
  const venture = await prisma.venture.findUnique({
    where: { id: ventureId },
    select: { code: true },
  });

  const ventureCode = venture?.code || "XX";
  const originCode = cityToCode(pickupCity);
  const destCode = cityToCode(dropCity);

  const lastLoad = await prisma.load.findFirst({
    where: {
      reference: { startsWith: `${ventureCode}-` },
    },
    orderBy: { id: "desc" },
    select: { reference: true },
  });

  let sequence = 10001;
  if (lastLoad?.reference) {
    const parts = lastLoad.reference.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${ventureCode}-${originCode}-${destCode}-${sequence}`;
}

export async function assignLoadReference(loadId: number): Promise<string> {
  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      id: true,
      reference: true,
      ventureId: true,
      pickupCity: true,
      dropCity: true,
    },
  });

  if (!load) {
    throw new Error(`Load ${loadId} not found`);
  }

  if (load.reference) {
    return load.reference;
  }

  if (!load.ventureId) {
    throw new Error(`Load ${loadId} has no ventureId`);
  }

  const reference = await generateLoadReference(
    load.ventureId,
    load.pickupCity || "",
    load.dropCity || ""
  );

  await prisma.load.update({
    where: { id: loadId },
    data: { reference },
  });

  return reference;
}
