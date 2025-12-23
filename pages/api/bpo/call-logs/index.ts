import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { awardPointsForEvent } from '@/lib/gamification/awardPoints';
import { logAuditEvent } from '@/lib/audit';
import { logger } from '@/lib/logger';

/**
 * BPO Call Logs API
 * 
 * POST /api/bpo/call-logs - Create a new call log
 * GET /api/bpo/call-logs - List call logs (with filters)
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) return;

  const scope = getUserScope(user);

  if (req.method === 'POST') {
    try {
      const {
        agentId,
        ventureId,
        officeId,
        campaignId,
        callStartedAt,
        callEndedAt,
        dialCount,
        isConnected,
        appointmentSet,
        dealWon,
        revenue,
        notes,
        isTest,
      } = req.body;

      // Validation
      if (!agentId || !ventureId || !callStartedAt) {
        return res.status(400).json({
          error: 'agentId, ventureId, and callStartedAt are required',
        });
      }

      // Verify venture access
      if (!scope.allVentures && !scope.ventureIds.includes(Number(ventureId))) {
        return res.status(403).json({
          error: 'Forbidden: insufficient access to venture',
        });
      }

      // Verify agent exists and belongs to venture
      const agent = await prisma.bpoAgent.findFirst({
        where: {
          id: Number(agentId),
          ventureId: Number(ventureId),
        },
      });

      if (!agent) {
        return res.status(404).json({
          error: 'Agent not found or does not belong to venture',
        });
      }

      // Parse dates
      const startDate = new Date(callStartedAt);
      const endDate = callEndedAt ? new Date(callEndedAt) : null;

      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid callStartedAt date',
        });
      }

      if (endDate && isNaN(endDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid callEndedAt date',
        });
      }

      // Validate end date is after start date
      if (endDate && endDate < startDate) {
        return res.status(400).json({
          error: 'callEndedAt must be after callStartedAt',
        });
      }

      // Create call log
      const callLog = await prisma.bpoCallLog.create({
        data: {
          agentId: Number(agentId),
          ventureId: Number(ventureId),
          officeId: officeId ? Number(officeId) : null,
          campaignId: campaignId ? Number(campaignId) : null,
          callStartedAt: startDate,
          callEndedAt: endDate,
          dialCount: dialCount ? Number(dialCount) : 1,
          isConnected: isConnected === true,
          appointmentSet: appointmentSet === true,
          dealWon: dealWon === true,
          revenue: revenue ? Number(revenue) : 0,
          notes: notes || null,
          isTest: isTest === true,
        },
        include: {
          agent: {
            select: {
              id: true,
              userId: true,
            },
          },
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Award gamification points if call is completed (has callEndedAt)
      if (callLog.callEndedAt) {
        awardPointsForEvent(
          callLog.agent.userId,
          callLog.ventureId,
          'BPO_CALL_COMPLETED',
          {
            officeId: callLog.officeId || null,
            metadata: {
              callLogId: callLog.id,
              agentId: callLog.agentId,
              isConnected: callLog.isConnected,
              appointmentSet: callLog.appointmentSet,
              dealWon: callLog.dealWon,
            },
            idempotencyKey: `bpo_call_${callLog.id}_completed`,
          }
        ).catch(err => {
          logger.error('bpo_call_gamification_award_failed', {
            userId: callLog.agent.userId,
            ventureId: callLog.ventureId,
            callLogId: callLog.id,
            error: err.message || String(err),
          });
        });
      }

      // Log audit event
      await logAuditEvent(req, user, {
        domain: 'bpo',
        action: 'BPO_CALL_LOG_CREATED',
        entityType: 'bpoCallLog',
        entityId: callLog.id,
        metadata: {
          agentId: callLog.agentId,
          ventureId: callLog.ventureId,
          campaignId: callLog.campaignId,
          isConnected: callLog.isConnected,
          dealWon: callLog.dealWon,
        },
      });

      return res.status(201).json({
        success: true,
        callLog,
      });
    } catch (error: any) {
      logger.error('bpo_call_log_creation_failed', {
        userId: user.id,
        ventureId: req.body.ventureId,
        error: error.message || String(error),
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      });
      return res.status(500).json({
        error: 'Failed to create call log',
        details: error.message,
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const {
        agentId,
        ventureId,
        officeId,
        campaignId,
        from,
        to,
        isConnected,
        dealWon,
        limit = '50',
        cursor,
      } = req.query;

      const where: any = {
        isTest: user.isTestUser,
      };

      // Apply venture scope
      if (ventureId) {
        const vid = Number(ventureId);
        if (!scope.allVentures && !scope.ventureIds.includes(vid)) {
          return res.status(403).json({
            error: 'Forbidden: insufficient access to venture',
          });
        }
        where.ventureId = vid;
      } else if (!scope.allVentures && scope.ventureIds.length > 0) {
        where.ventureId = { in: scope.ventureIds };
      }

      // Apply filters
      if (agentId) where.agentId = Number(agentId);
      if (officeId) where.officeId = Number(officeId);
      if (campaignId) where.campaignId = Number(campaignId);
      if (isConnected !== undefined) where.isConnected = isConnected === 'true';
      if (dealWon !== undefined) where.dealWon = dealWon === 'true';

      // Date range filter
      if (from || to) {
        where.callStartedAt = {};
        if (from) {
          where.callStartedAt.gte = new Date(from as string);
        }
        if (to) {
          const toDate = new Date(to as string);
          toDate.setHours(23, 59, 59, 999);
          where.callStartedAt.lte = toDate;
        }
      }

      // Pagination - cursor-based only
      const take = Math.min(200, Math.max(1, Number(limit) || 50));
      const cursorValue = cursor ? Number(cursor) : undefined;

      const callLogs = await prisma.bpoCallLog.findMany({
        where,
        take: take + 1,
        ...(cursorValue ? { cursor: { id: cursorValue }, skip: 1 } : {}),
        orderBy: { callStartedAt: 'desc' },
        include: {
          agent: {
            select: {
              id: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const hasMore = callLogs.length > take;
      const items = hasMore ? callLogs.slice(0, take) : callLogs;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

      return res.status(200).json({
        items,
        hasMore,
        nextCursor,
        limit: take,
      });
    } catch (error: any) {
      logger.error('bpo_call_log_list_failed', {
        userId: user.id,
        ventureId: req.query.ventureId,
        error: error.message || String(error),
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      });
      return res.status(500).json({
        error: 'Failed to list call logs',
        details: error.message,
      });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

