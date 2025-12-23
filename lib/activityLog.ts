import type { NextApiRequest } from 'next';
import prisma from './prisma';

export interface ActivityLogParams {
  userId: number;
  action: string;
  module: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  req?: NextApiRequest;
}

export async function logActivity(params: ActivityLogParams): Promise<void> {
  const {
    userId,
    action,
    module,
    entityType,
    entityId = null,
    description = null,
    metadata = null,
    req,
  } = params;

  try {
    const ipAddress = req
      ? (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        null
      : null;
    const userAgent = req?.headers['user-agent'] || null;

    await prisma.activityLog.create({
      data: {
        userId,
        action,
        module,
        entityType,
        entityId,
        description,
        metadata: metadata as object,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

export const ACTIVITY_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  VIEW: 'VIEW',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  IMPORT: 'IMPORT',
  EXPORT: 'EXPORT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  SAVE_OFFER_ACCEPTED: 'SAVE_OFFER_ACCEPTED',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
  IMPERSONATION_START: 'IMPERSONATION_START',
  IMPERSONATION_END: 'IMPERSONATION_END',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
} as const;

export const ACTIVITY_MODULES = {
  AUTH: 'AUTH',
  ADMIN: 'ADMIN',
  FREIGHT: 'FREIGHT',
  HOTEL: 'HOTEL',
  BPO: 'BPO',
  SAAS: 'SAAS',
  HOLDINGS: 'HOLDINGS',
  IMPORT: 'IMPORT',
} as const;
