import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

type ImportType = 'LOADS' | 'CUSTOMERS' | 'CARRIERS' | 'SHIPPERS' | 'HOTEL_KPIS' | 'HOTEL_DAILY' | 'FREIGHT_KPIS' | 'HOTEL_DISPUTES' | 'BANK_TRANSACTIONS' | 'HOTEL_REVIEWS' | 'BPO_METRICS' | 'GENERIC';

interface ImportMappingRecord {
  id: number;
  name: string;
  type: ImportType;
  sourceHash: string | null;
  configJson: unknown;
  createdById: number | null;
  createdBy?: { id: number; name: string | null; email: string };
  createdAt: Date;
  updatedAt: Date;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = prisma as unknown as {
    importMapping: {
      findMany: (args: unknown) => Promise<ImportMappingRecord[]>;
      delete: (args: unknown) => Promise<unknown>;
    };
  };

  if (req.method === 'GET') {
    const { type } = req.query;

    const where = type ? { type: type as ImportType } : {};

    const mappings = await db.importMapping.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return res.status(200).json(mappings);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Mapping ID required' });
    }

    await db.importMapping.delete({
      where: { id: Number(id) },
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
