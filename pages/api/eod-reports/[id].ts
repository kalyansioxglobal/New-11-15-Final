import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { ROLE_CONFIG } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { sendAndLogEmail } from '@/lib/comms/email';
import { getEodReportNeedsAttentionEmailHTML } from '@/templates/emails/eodReportNeedsAttention.html';

// Single EOD report handler
// - GET: returns detailed information for a single EOD report.
//   * Auth via requireUser (401 UNAUTHENTICATED if missing).
//   * Venture scope via getUserScope; out-of-scope venture returns
//     FORBIDDEN_VENTURE.
//   * Access rules:
//     - The report owner can always view.
//     - Roles with ROLE_CONFIG[role].task.assign (e.g. managers) may also
//       view as reviewers.
// - PATCH: allows limited updates either by the owner (content fields) or by a
//   reviewer (status/managerNotes), depending on role:
//   * Owners may update text fields (summary, accomplishments, blockers,
//     tomorrowPlan, hoursWorked, tasksCompleted) when not changing status.
//   * Managers/reviewers may set status/managerNotes and implicitly stamp
//     reviewedAt/reviewedById.
// - This route does not change EOD creation semantics; it only edits existing
//   rows created via /eod-reports (index handler).

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const { id } = req.query;
  const reportId = Number(id);

  if (!reportId || Number.isNaN(reportId)) {
    return res.status(400).json({ error: 'INVALID_ID' });
  }

  const report = await prisma.eodReport.findUnique({
    where: { id: reportId },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      venture: { select: { id: true, name: true } },
      office: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });

  if (!report) return res.status(404).json({ error: 'NOT_FOUND' });

  const scope = getUserScope(user);

  if (!scope.allVentures && !scope.ventureIds.includes(report.ventureId)) {
    return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
  }

  if (req.method === 'GET') {
    const isOwner = report.userId === user.id;
    const canReview = ROLE_CONFIG[user.role]?.task?.assign === true;

    if (!isOwner && !canReview) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    return res.status(200).json({
      id: report.id,
      userId: report.userId,
      userName: report.user.fullName ?? report.user.email,
      userEmail: report.user.email,
      ventureId: report.ventureId,
      ventureName: report.venture.name,
      officeId: report.officeId,
      officeName: report.office?.name ?? null,
      date: report.date,
      summary: report.summary,
      accomplishments: report.accomplishments,
      blockers: report.blockers,
      tomorrowPlan: report.tomorrowPlan,
      hoursWorked: report.hoursWorked,
      tasksCompleted: report.tasksCompleted,
      status: report.status,
      managerNotes: report.managerNotes,
      reviewedAt: report.reviewedAt,
      reviewedByName: report.reviewedBy?.fullName ?? null,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    });
  }

  if (req.method === 'PATCH') {
    const { status, managerNotes } = req.body;

    const isOwner = report.userId === user.id;
    const canReview = ROLE_CONFIG[user.role]?.task?.assign === true;

    if (!isOwner && !canReview) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const updateData: any = {};

    if (isOwner && !status) {
      const { summary, accomplishments, blockers, tomorrowPlan, hoursWorked, tasksCompleted } = req.body;
      if (summary) updateData.summary = summary;
      if (accomplishments !== undefined) updateData.accomplishments = accomplishments;
      if (blockers !== undefined) updateData.blockers = blockers;
      if (tomorrowPlan !== undefined) updateData.tomorrowPlan = tomorrowPlan;
      if (hoursWorked !== undefined) updateData.hoursWorked = hoursWorked ? Number(hoursWorked) : null;
      if (tasksCompleted !== undefined) updateData.tasksCompleted = tasksCompleted ? Number(tasksCompleted) : null;
    }

    if (canReview) {
      if (status) {
        updateData.status = status;
        updateData.reviewedAt = new Date();
        updateData.reviewedById = user.id;
      }
      if (managerNotes !== undefined) updateData.managerNotes = managerNotes;
    }

    const updated = await prisma.eodReport.update({
      where: { id: reportId },
      data: updateData,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        venture: { select: { id: true, name: true } },
        office: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    // Send email notification to employee when status is set to NEEDS_ATTENTION
    if (canReview && status === 'NEEDS_ATTENTION' && updated.status === 'NEEDS_ATTENTION') {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://new-11-15-final.vercel.app';
        const reportUrl = `${baseUrl}/eod-reports/${reportId}`;
        
        const formattedDate = new Date(updated.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const emailHTML = getEodReportNeedsAttentionEmailHTML({
          employeeName: updated.user.fullName || updated.user.email,
          managerName: updated.reviewedBy?.fullName || user.fullName || 'Manager',
          ventureName: updated.venture.name,
          officeName: updated.office?.name || undefined,
          reportDate: formattedDate,
          managerNotes: managerNotes || undefined,
          reportUrl,
        });

        const emailResult = await sendAndLogEmail({
          to: updated.user.email,
          subject: `Your EOD Report Needs Attention - ${formattedDate}`,
          html: emailHTML,
          venture: updated.venture.name,
          sentByUserId: user.id,
        });

        if (emailResult.status === 'SENT') {
          logger.info('eod_report_needs_attention_email_sent', {
            reportId: reportId,
            employeeEmail: updated.user.email,
            managerId: user.id,
          });
        } else {
          logger.error('eod_report_needs_attention_email_failed', {
            reportId: reportId,
            employeeEmail: updated.user.email,
            status: emailResult.status,
            errorMessage: emailResult.errorMessage,
          });
        }
      } catch (emailError: any) {
        logger.error('eod_report_needs_attention_email_exception', {
          reportId: reportId,
          employeeEmail: updated.user.email,
          error: emailError?.message || 'Unknown error',
        });
        // Don't fail the request if email fails - the status update succeeded
      }
    }

    return res.status(200).json({ id: updated.id });
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).end();
}
