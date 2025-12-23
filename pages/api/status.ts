import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import packageJson from '../../package.json';

type StatusResponse = {
  status: 'ok' | 'degraded';
  time: string;
  appVersion: string;
  db: 'ok' | 'error';
  uptime: number;
  environment: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<StatusResponse>) {
  let dbStatus: 'ok' | 'error' = 'error';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'ok';
  } catch (error) {
    dbStatus = 'error';
  }

  const overallStatus = dbStatus === 'ok' ? 'ok' : 'degraded';

  const response: StatusResponse = {
    status: overallStatus,
    time: new Date().toISOString(),
    appVersion: packageJson.version,
    db: dbStatus,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };

  res.status(overallStatus === 'ok' ? 200 : 503).json(response);
}
