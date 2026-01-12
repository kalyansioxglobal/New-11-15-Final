import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { ROLE_CONFIG } from '@/lib/permissions';
import { sendAndLogEmail } from '@/lib/comms/email';
import { getMissedEodExplanationEmailHTML } from '@/templates/emails/missedEodExplanation.html';
import type { UserRole } from '@prisma/client';

// Missed EOD explanation notification handler
// - POST only: marks a missedEodExplanation as managerNotified and logs an
//   activity entry.
// - Auth: requireUser; unauthenticated requests receive 401 UNAUTHENTICATED.
// - RBAC / ownership rules:
//   * Global admins (ventureScope === 'all') may notify for any explanation.
//   * The explanation owner may notify for their own record if they belong to
//     the same venture.
//   * Others with venture access but not owner/global-admin are rejected with
//     FORBIDDEN / ONLY_OWNER_CAN_NOTIFY.
// - Idempotency:
//   * If managerNotified is already true, the handler returns 200 with
//     alreadyNotified: true without making changes.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const { explanationId } = req.body;
  if (!explanationId) {
    return res.status(400).json({ error: 'MISSING_EXPLANATION_ID' });
  }

  const explanation = await (prisma as any).missedEodExplanation.findUnique({
    where: { id: Number(explanationId) },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      venture: { select: { id: true, name: true } },
    },
  });

  if (!explanation) {
    return res.status(404).json({ error: 'EXPLANATION_NOT_FOUND' });
  }
  
  // Get missed dates from explanation
  const missedDates = (explanation.missedDates || []).map((d: Date) => 
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  );

  const isGlobalAdmin = ROLE_CONFIG[user.role]?.ventureScope === 'all';
  const isExplanationOwner = explanation.userId === user.id;
  const hasVentureAccess = user.ventureIds?.includes(explanation.ventureId);

  if (!isGlobalAdmin && !isExplanationOwner && !hasVentureAccess) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  if (!isGlobalAdmin && !isExplanationOwner) {
    return res.status(403).json({ error: 'ONLY_OWNER_CAN_NOTIFY' });
  }

  if (explanation.managerNotified) {
    return res.status(200).json({ message: 'Already notified', alreadyNotified: true });
  }

  // Update the explanation as notified
  await (prisma as any).missedEodExplanation.update({
    where: { id: explanation.id },
    data: {
      managerNotified: true,
      notifiedAt: new Date(),
    },
  });

  // Find managers to notify
  // Include: CEO, ADMIN, COO (all ventures), VENTURE_HEAD, OFFICE_MANAGER, HR_ADMIN (venture-specific)
  const managerRoles: UserRole[] = ['CEO', 'ADMIN', 'COO', 'VENTURE_HEAD', 'OFFICE_MANAGER', 'HR_ADMIN'];
  
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

  // Get venture-specific managers
  const ventureManagers = await prisma.user.findMany({
    where: {
      role: { in: ['VENTURE_HEAD', 'OFFICE_MANAGER', 'HR_ADMIN'] },
      isActive: true,
      ventures: {
        some: {
          ventureId: explanation.ventureId,
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

  // Combine and deduplicate managers
  const allManagersMap = new Map<number, typeof globalAdmins[0]>();
  [...globalAdmins, ...ventureManagers].forEach((manager) => {
    if (!allManagersMap.has(manager.id)) {
      allManagersMap.set(manager.id, manager);
    }
  });
  const managersToNotify = Array.from(allManagersMap.values());

  // Prepare email data
  const baseUrl = process.env.NEXTAUTH_URL || 'https://new-11-15-final.vercel.app';
  const explanationUrl = `${baseUrl}/eod-reports`;
  
  const emailData = {
    employeeName: explanation.user.fullName || explanation.user.email,
    employeeEmail: explanation.user.email,
    ventureName: explanation.venture.name,
    consecutiveDays: explanation.consecutiveDays || missedDates.length,
    missedDates: missedDates.length > 0 ? missedDates : ['Date not available'],
    explanation: explanation.explanation || 'No explanation provided',
    explanationUrl,
  };

  // Send emails and create notifications
  const notificationPromises: Promise<any>[] = [];
  
  for (const manager of managersToNotify) {
    // Send email
    if (manager.email) {
      const emailPromise = sendAndLogEmail({
        to: manager.email,
        subject: `Missed EOD Reports - ${emailData.employeeName} (${emailData.ventureName})`,
        html: getMissedEodExplanationEmailHTML(emailData),
        venture: explanation.venture.name,
        sentByUserId: user.id,
      }).catch((err) => {
        console.error(`Failed to send email to ${manager.email}:`, err);
        // Don't fail the whole operation if email fails
      });
      notificationPromises.push(emailPromise);
    }

    // Create in-app notification directly via Prisma
    const notificationPromise = prisma.notification.create({
      data: {
        userId: manager.id,
        title: `Missed EOD Reports - ${emailData.employeeName}`,
        body: `${emailData.employeeName} has submitted an explanation for ${emailData.consecutiveDays} missed EOD report${emailData.consecutiveDays > 1 ? 's' : ''} in ${emailData.ventureName}.`,
        type: 'warning',
        entityType: 'MissedEodExplanation',
        entityId: explanation.id,
      },
    }).then(async (notification) => {
      // Push via SSE
      try {
        const { pushNotificationViaSSE, pushUnreadCountViaSSE } = await import("@/lib/notifications/push");
        await pushNotificationViaSSE(manager.id, notification);
        const unreadCount = await prisma.notification.count({
          where: { userId: manager.id, isRead: false },
        });
        await pushUnreadCountViaSSE(manager.id, unreadCount);
      } catch (sseErr) {
        console.error(`Failed to push notification via SSE for user ${manager.id}:`, sseErr);
      }
      return notification;
    }).catch((err) => {
      console.error(`Failed to create notification for user ${manager.id}:`, err);
      // Don't fail the whole operation if notification creation fails
    });
    notificationPromises.push(notificationPromise);
  }

  // Wait for all notifications (emails and in-app) to be sent
  // Don't fail if some notifications fail
  await Promise.allSettled(notificationPromises);

  // Create activity log
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'MISSED_EOD_EXPLANATION_NOTIFIED',
      module: 'eod-reports',
      entityType: 'MissedEodExplanation',
      entityId: String(explanationId),
      description: `Missed EOD explanation notification sent to ${managersToNotify.length} manager(s) for ${explanation.user.fullName || explanation.user.email}`,
      metadata: {
        explanationId,
        employeeId: explanation.userId,
        ventureId: explanation.ventureId,
        managersNotified: managersToNotify.length,
        managerIds: managersToNotify.map((m) => m.id),
      },
    },
  });

  return res.status(200).json({
    success: true,
    message: 'Managers will be notified',
    managersNotified: managersToNotify.length,
  });
}
