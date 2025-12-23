import { prisma } from '@/lib/prisma';

interface GetOrCreateDefaultLocationParams {
  ventureId: number;
  customerId: number;
  createdByUserId?: number;
}

interface NormalizeLoadCustomerAndLocationParams {
  customerId?: number | null;
  shipperId?: number | null;
  ventureId: number;
}

interface NormalizedLoadResult {
  customerId: number;
  shipperId: number;
}

export async function getOrCreateDefaultLocation({
  ventureId,
  customerId,
  createdByUserId,
}: GetOrCreateDefaultLocationParams) {
  const existingDefault = await prisma.logisticsShipper.findFirst({
    where: {
      customerId,
      isDefault: true,
    },
  });

  if (existingDefault) {
    return existingDefault;
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      name: true,
      address: true,
      phone: true,
      email: true,
    },
  });

  const defaultLocation = await prisma.logisticsShipper.create({
    data: {
      ventureId,
      customerId,
      name: 'Default Location',
      isDefault: true,
      addressLine1: customer?.address || null,
      phone: customer?.phone || null,
      email: customer?.email || null,
      isActive: true,
    },
  });

  return defaultLocation;
}

export function assertLocationBelongsToCustomer({
  customerId,
  shipperId,
  shipperCustomerId,
}: {
  customerId: number;
  shipperId: number;
  shipperCustomerId: number | null;
}): void {
  if (shipperCustomerId !== null && shipperCustomerId !== customerId) {
    throw new Error(
      `Location mismatch: Location ${shipperId} belongs to customer ${shipperCustomerId}, not ${customerId}`
    );
  }
}

export async function normalizeLoadCustomerAndLocation({
  customerId,
  shipperId,
  ventureId,
}: NormalizeLoadCustomerAndLocationParams): Promise<NormalizedLoadResult> {
  if (!customerId && !shipperId) {
    throw new Error('Either customerId or shipperId must be provided');
  }

  if (shipperId && !customerId) {
    const shipper = await prisma.logisticsShipper.findUnique({
      where: { id: shipperId },
      select: { customerId: true },
    });

    if (!shipper) {
      throw new Error(`Location ${shipperId} not found`);
    }

    if (!shipper.customerId) {
      throw new Error(`Location ${shipperId} has no associated customer`);
    }

    return {
      customerId: shipper.customerId,
      shipperId,
    };
  }

  if (customerId && !shipperId) {
    const defaultLocation = await getOrCreateDefaultLocation({
      ventureId,
      customerId,
    });

    return {
      customerId,
      shipperId: defaultLocation.id,
    };
  }

  if (customerId && shipperId) {
    const shipper = await prisma.logisticsShipper.findUnique({
      where: { id: shipperId },
      select: { customerId: true },
    });

    if (!shipper) {
      throw new Error(`Location ${shipperId} not found`);
    }

    assertLocationBelongsToCustomer({
      customerId,
      shipperId,
      shipperCustomerId: shipper.customerId,
    });

    return {
      customerId,
      shipperId,
    };
  }

  throw new Error('Unexpected state in normalizeLoadCustomerAndLocation');
}
