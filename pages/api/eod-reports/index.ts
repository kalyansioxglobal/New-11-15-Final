import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { ROLE_CONFIG } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { awardPointsForEvent } from '@/lib/gamification/awardPoints';
import { sendAndLogEmail } from '@/lib/comms/email';
import { getEodReportSubmittedEmailHTML } from '@/templates/emails/eodReportSubmitted.html';
import type { UserRole } from '@prisma/client';

// EOD reports index handler
// - GET: returns a capped list of EOD reports visible to the current user.
//   * Auth via requireUser (401 UNAUTHENTICATED if missing).
//   * Visibility rules:
//     - Regular employees see only their own reports unless ROLE_CONFIG[role].task.assign is true.
//     - Managers (canViewTeam === true) may request other users via userId
//       and default to team scope when no userId is passed.
//   * Venture scope is enforced via getUserScope; out-of-scope ventureId
//     returns FORBIDDEN_VENTURE or defaults to scoped ventures.
//   * Results are limited to the latest 100 reports, ordered by date and
//     createdAt.
// - POST: upserts the caller's own EOD report for a given venture and date.
//   * Prevents future-dated submissions via CANNOT_SUBMIT_FUTURE_REPORT.
//   * Uses a unique (userId, date, ventureId) key to update or create.
//   * Status transitions preserve manager-reviewed statuses: DRAFT -> SUBMITTED,
//     otherwise existing status is kept.
// - This endpoint is the canonical read/write path for per-day EOD entries;
//   other endpoints (team, my-status, missed-*) build summaries on top of it.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const scope = getUserScope(user);
  const includeTest = req.query.includeTest === 'true';
  const canViewTeam = ROLE_CONFIG[user.role]?.task?.assign === true;

  logger.info('api_request', {
    endpoint: '/api/eod-reports',
    userId: user.id,
    userRole: user.role,
    outcome: 'start',
  });

  // GET: employees see their own EODs; managers (ROLE_CONFIG.task.assign) may view team.

  if (req.method === 'GET') {
    const { date, userId, ventureId } = req.query;

    const where: any = {};
    if (!includeTest) where.isTest = false;

    if (date) {
      const dateStart = new Date(date as string);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date as string);
      dateEnd.setHours(23, 59, 59, 999);
      where.date = { gte: dateStart, lte: dateEnd };
    }

    if (userId) {
      const requestedUserId = Number(userId);
      if (requestedUserId !== user.id && !canViewTeam) {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }
      where.userId = requestedUserId;
    } else if (!canViewTeam) {
      where.userId = user.id;
    }

    if (ventureId) {
      const requestedVentureId = Number(ventureId);
      if (!scope.allVentures && !scope.ventureIds.includes(requestedVentureId)) {
        return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
      }
      where.ventureId = requestedVentureId;
    } else if (!scope.allVentures) {
      if (scope.ventureIds.length === 0) {
        return res.status(200).json([]);
      }
      where.ventureId = { in: scope.ventureIds };
    }

    try {
      const reports = await prisma.eodReport.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          venture: { select: { id: true, name: true } },
          office: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, fullName: true } },
        },
        take: 100,
      });

      return res.status(200).json(
        reports.map((r: typeof reports[number]) => ({
          id: r.id,
          userId: r.userId,
          userName: r.user.fullName ?? r.user.email,
          userEmail: r.user.email,
          ventureId: r.ventureId,
          ventureName: r.venture.name,
          officeId: r.officeId,
          officeName: r.office?.name ?? null,
          date: r.date,
          summary: r.summary,
          accomplishments: r.accomplishments,
          blockers: r.blockers,
          tomorrowPlan: r.tomorrowPlan,
          hoursWorked: r.hoursWorked,
          tasksCompleted: r.tasksCompleted,
          status: r.status,
          managerNotes: r.managerNotes,
          reviewedAt: r.reviewedAt,
          reviewedByName: r.reviewedBy?.fullName ?? null,
          createdAt: r.createdAt,
        })),
      );
    } catch (error: any) {
      logger.error('api_request_error', {
        endpoint: '/api/eod-reports',
        userId: user.id,
        userRole: user.role,
        outcome: 'error',
        error: error?.message || String(error),
        stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined,
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { ventureId, officeId, date, summary, accomplishments, blockers, tomorrowPlan, hoursWorked, tasksCompleted } = req.body;

    if (!ventureId || !summary) {
      return res.status(400).json({ error: 'VENTURE_AND_SUMMARY_REQUIRED' });
    }

    const vId = Number(ventureId);
    const oId = officeId ? Number(officeId) : null;

    if (!scope.allVentures && !scope.ventureIds.includes(vId)) {
      return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
    }

    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reportDate > today) {
      return res.status(400).json({ error: 'CANNOT_SUBMIT_FUTURE_REPORT' });
    }

    try {
      const existingReport = await prisma.eodReport.findUnique({
        where: {
          userId_date_ventureId: {
            userId: user.id,
            date: reportDate,
            ventureId: vId,
          },
        },
      });

      if (existingReport) {
        const updated = await prisma.eodReport.update({
          where: { id: existingReport.id },
          data: {
            summary,
            accomplishments: accomplishments ?? null,
            blockers: blockers ?? null,
            tomorrowPlan: tomorrowPlan ?? null,
            hoursWorked: hoursWorked ? Number(hoursWorked) : null,
            tasksCompleted: tasksCompleted ? Number(tasksCompleted) : null,
            officeId: oId,
            // Preserve existing status
            status: existingReport.status,
            updatedAt: new Date(),
          },
        });
        return res.status(200).json({ id: updated.id, updated: true });
      }

      const report = await prisma.eodReport.create({
        data: {
          userId: user.id,
          ventureId: vId,
          officeId: oId,
          date: reportDate,
          summary,
          accomplishments: accomplishments ?? null,
          blockers: blockers ?? null,
          tomorrowPlan: tomorrowPlan ?? null,
          hoursWorked: hoursWorked ? Number(hoursWorked) : null,
          tasksCompleted: tasksCompleted ? Number(tasksCompleted) : null,
          status: 'SUBMITTED',
          isTest: user.isTestUser,
        },
      });

      // Award gamification points for EOD submission
      awardPointsForEvent(user.id, vId, 'EOD_REPORT_SUBMITTED', {
        officeId: oId,
        metadata: { eodReportId: report.id },
        idempotencyKey: `eod-${report.id}`,
      }).catch(err => console.error('[gamification] EOD award error:', err));

      // Check for perfect week (5 EODs in the same week)
      const weekStart = new Date(reportDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const eodCount = await prisma.eodReport.count({
        where: {
          userId: user.id,
          ventureId: vId,
          date: { gte: weekStart, lt: weekEnd },
        },
      });
      
      if (eodCount === 5) {
        // Perfect week! Award bonus points
        await awardPointsForEvent(
          user.id,
          vId,
          'PERFECT_WEEK_EOD',
          {
            officeId: oId,
            metadata: { weekStart: weekStart.toISOString(), eodCount },
            idempotencyKey: `perfect_week_${user.id}_${vId}_${weekStart.toISOString().split('T')[0]}`,
          }
        ).catch(err => {
          logger.error('gamification_perfect_week_award_failed', {
            event: 'PERFECT_WEEK_EOD',
            userId: user.id,
            ventureId: vId,
            key: `perfect_week_${user.id}_${vId}_${weekStart.toISOString().split('T')[0]}`,
            err: err instanceof Error ? err.message : String(err),
          });
        });
      }

      // Notify managers about new EOD report submission
      console.log('[EOD_NOTIFICATION] Starting manager notification process for report:', report.id);
      
      try {
        // Fetch user, venture, office, and attendance details for email
        const reportDateForQuery = new Date(reportDate);
        reportDateForQuery.setHours(0, 0, 0, 0);
        const reportDateEnd = new Date(reportDate);
        reportDateEnd.setHours(23, 59, 59, 999);

        const [reportUser, venture, office, attendance] = await Promise.all([
          prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, fullName: true, email: true },
          }),
          prisma.venture.findUnique({
            where: { id: vId },
            select: { id: true, name: true },
          }),
          oId ? prisma.office.findUnique({
            where: { id: oId },
            select: { id: true, name: true },
          }) : null,
          prisma.attendance.findFirst({
            where: {
              userId: user.id,
              ventureId: vId,
              date: {
                gte: reportDateForQuery,
                lte: reportDateEnd,
              },
            },
            select: {
              status: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
        ]);

        if (!reportUser || !venture) {
          console.error('[EOD_NOTIFICATION] Failed to fetch user or venture details:', { userId: user.id, ventureId: vId });
          // Continue without failing the request
        } else {
          console.log('[EOD_NOTIFICATION] Fetched user and venture details:', {
            employeeName: reportUser.fullName,
            ventureName: venture.name,
          });

          // Find managers to notify
          // Include: CEO, ADMIN, COO (all ventures), VENTURE_HEAD, OFFICE_MANAGER, HR_ADMIN (venture-specific)
          console.log('[EOD_NOTIFICATION] Finding managers for venture:', vId);
          
          // Get global admins (CEO, ADMIN, COO)
          const globalAdmins = await prisma.user.findMany({
            where: {
              role: { in: ['CEO', 'ADMIN', 'COO'] },
              isActive: true,
            },
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
            },
          });
          console.log('[EOD_NOTIFICATION] Found global admins:', globalAdmins.length);

          // Get venture-specific managers
          const ventureManagers = await prisma.user.findMany({
            where: {
              role: { in: ['VENTURE_HEAD', 'OFFICE_MANAGER', 'HR_ADMIN'] },
              isActive: true,
              ventures: {
                some: {
                  ventureId: vId,
                },
              },
            },
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
            },
          });
          console.log('[EOD_NOTIFICATION] Found venture managers:', ventureManagers.length);

          // Combine and deduplicate managers
          const allManagersMap = new Map<number, typeof globalAdmins[0]>();
          [...globalAdmins, ...ventureManagers].forEach((manager) => {
            if (!allManagersMap.has(manager.id)) {
              allManagersMap.set(manager.id, manager);
            }
          });
          const managersToNotify = Array.from(allManagersMap.values());
          console.log('[EOD_NOTIFICATION] Total managers to notify:', managersToNotify.length);

          if (managersToNotify.length > 0) {
            // Prepare email data
            const baseUrl = process.env.NEXTAUTH_URL || 'https://new-11-15-final.vercel.app';
            const reportUrl = `${baseUrl}/eod-reports`;
            const formattedDate = reportDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            // Format attendance timestamps with timezone info
            // Store as ISO strings for accurate timezone representation
            // In the email template, we'll format them properly
            let attendanceMarkedAt: string | undefined;
            let attendanceUpdatedAt: string | undefined;
            
            if (attendance) {
              const markedDate = new Date(attendance.createdAt);
              const updatedDate = new Date(attendance.updatedAt);
              
              // Check if attendance was updated (updatedAt > createdAt means it was changed)
              const wasUpdated = updatedDate.getTime() > markedDate.getTime() + 1000; // 1 second buffer
              
              // Store as ISO string (UTC) - email template will format it
              attendanceMarkedAt = markedDate.toISOString();
              
              if (wasUpdated) {
                attendanceUpdatedAt = updatedDate.toISOString();
              }
            }

            const emailData = {
              employeeName: reportUser.fullName || reportUser.email,
              employeeEmail: reportUser.email,
              ventureName: venture.name,
              officeName: office?.name,
              reportDate: formattedDate,
              summary: summary,
              accomplishments: accomplishments || undefined,
              blockers: blockers || undefined,
              tomorrowPlan: tomorrowPlan || undefined,
              hoursWorked: hoursWorked ? Number(hoursWorked) : undefined,
              tasksCompleted: tasksCompleted ? Number(tasksCompleted) : undefined,
              attendanceStatus: attendance?.status,
              attendanceMarkedAt,
              attendanceUpdatedAt,
              reportUrl,
            };

            // Send emails and create notifications
            const notificationPromises: Promise<any>[] = [];

            for (const manager of managersToNotify) {
              console.log('[EOD_NOTIFICATION] Processing notification for manager:', {
                id: manager.id,
                email: manager.email,
                name: manager.fullName,
                role: manager.role,
              });

              // Send email
              if (manager.email) {
                const emailPromise = sendAndLogEmail({
                  to: manager.email,
                  subject: `New EOD Report - ${emailData.employeeName} (${venture.name})`,
                  html: getEodReportSubmittedEmailHTML(emailData),
                  venture: venture.name,
                  sentByUserId: user.id,
                })
                  .then(() => {
                    console.log('[EOD_NOTIFICATION] Email sent successfully to:', manager.email);
                  })
                  .catch((err) => {
                    console.error('[EOD_NOTIFICATION] Failed to send email to', manager.email, ':', err);
                    // Don't fail the whole operation if email fails
                  });
                notificationPromises.push(emailPromise);
              } else {
                console.warn('[EOD_NOTIFICATION] Manager has no email address:', manager.id);
              }

              // Create in-app notification directly via Prisma
              const notificationPromise = prisma.notification
                .create({
                  data: {
                    userId: manager.id,
                    title: `New EOD Report - ${emailData.employeeName}`,
                    body: `${emailData.employeeName} has submitted their EOD report for ${formattedDate} in ${venture.name}.`,
                    type: 'info',
                    entityType: 'EodReport',
                    entityId: report.id,
                  },
                })
                .then(() => {
                  console.log('[EOD_NOTIFICATION] In-app notification created for manager:', manager.id);
                })
                .catch((err) => {
                  console.error('[EOD_NOTIFICATION] Failed to create notification for user', manager.id, ':', err);
                  // Don't fail the whole operation if notification creation fails
                });
              notificationPromises.push(notificationPromise);
            }

            // Wait for all notifications (emails and in-app) to be sent
            // Don't fail if some notifications fail
            const results = await Promise.allSettled(notificationPromises);
            const successful = results.filter((r) => r.status === 'fulfilled').length;
            const failed = results.filter((r) => r.status === 'rejected').length;
            console.log('[EOD_NOTIFICATION] Notification results:', {
              total: results.length,
              successful,
              failed,
            });

            // Create activity log
            await prisma.activityLog
              .create({
                data: {
                  userId: user.id,
                  action: 'EOD_REPORT_SUBMITTED',
                  module: 'eod-reports',
                  entityType: 'EodReport',
                  entityId: String(report.id),
                  description: `EOD report submitted by ${reportUser.fullName || reportUser.email} for ${formattedDate}. Notifications sent to ${managersToNotify.length} manager(s).`,
                  metadata: {
                    reportId: report.id,
                    ventureId: vId,
                    officeId: oId,
                    managersNotified: managersToNotify.length,
                    managerIds: managersToNotify.map((m) => m.id),
                    notificationResults: {
                      total: results.length,
                      successful,
                      failed,
                    },
                  },
                },
              })
              .catch((err) => {
                console.error('[EOD_NOTIFICATION] Failed to create activity log:', err);
              });

            console.log('[EOD_NOTIFICATION] Manager notification process completed for report:', report.id);
          } else {
            console.log('[EOD_NOTIFICATION] No managers found to notify for venture:', vId);
          }
        }
      } catch (notifyError: any) {
        // Log error but don't fail the request
        console.error('[EOD_NOTIFICATION] Error in manager notification process:', notifyError);
        logger.error('eod_notification_error', {
          reportId: report.id,
          userId: user.id,
          ventureId: vId,
          error: notifyError?.message || String(notifyError),
        });
      }

      return res.status(201).json({ id: report.id });
    } catch (error: any) {
      logger.error('api_request_error', {
        endpoint: '/api/eod-reports',
        userId: user.id,
        userRole: user.role,
        outcome: 'error',
      });
      console.error('EOD POST error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
