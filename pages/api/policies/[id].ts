import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { canEditPolicies } from '@/lib/permissions';
import { storageClient } from '@/lib/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const { id } = req.query;
  const policyId = Number(id);
  if (isNaN(policyId)) return res.status(400).json({ error: 'INVALID_ID' });

  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    include: {
      venture: true,
      office: true,
      creator: true,
      files: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      },
    },
  });

  if (!policy) return res.status(404).json({ error: 'NOT_FOUND' });

  if (policy.isTest !== user.isTestUser) {
    return res.status(403).json({ error: 'FORBIDDEN_CONTEXT' });
  }

  const scope = getUserScope(user);

  if (!scope.allVentures && !scope.ventureIds.includes(policy.ventureId)) {
    return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
  }
  if (
    policy.officeId &&
    !scope.allOffices &&
    !scope.officeIds.includes(policy.officeId)
  ) {
    return res.status(403).json({ error: 'FORBIDDEN_OFFICE' });
  }

  if (req.method === 'GET') {
    // Generate signed URLs for all files
    const filesWithUrls = await Promise.all(
      policy.files.map(async (file) => {
        try {
          const url = await storageClient.signedUrl(
            file.bucket,
            file.path,
            60 * 60 // 1 hour expiry
          );
          return {
            id: file.id,
            fileName: file.fileName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            url,
            createdAt: file.createdAt,
            uploadedBy: file.uploadedBy,
          };
        } catch (err) {
          console.error(`Failed to generate URL for file ${file.id}:`, err);
          return {
            id: file.id,
            fileName: file.fileName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            url: null as string | null,
            error: 'Failed to generate URL',
            createdAt: file.createdAt,
            uploadedBy: file.uploadedBy,
          };
        }
      })
    );

    return res.status(200).json({
      id: policy.id,
      name: policy.name,
      type: policy.type,
      provider: policy.provider,
      policyNo: policy.policyNo,
      status: policy.status,
      startDate: policy.startDate,
      endDate: policy.endDate,
      fileUrl: policy.fileUrl, // Keep for backward compatibility
      files: filesWithUrls, // Array of files with signed URLs
      notes: policy.notes,
      ventureId: policy.ventureId,
      ventureName: policy.venture?.name ?? null,
      officeId: policy.officeId,
      officeName: policy.office?.name ?? null,
      createdByName: policy.creator?.fullName ?? null,
      isTest: policy.isTest,
      isDeleted: policy.isDeleted,
    });
  }

  if (req.method === 'PATCH') {
    if (!canEditPolicies(user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const {
      name,
      type,
      provider,
      policyNo,
      status,
      startDate,
      endDate,
      fileUrl,
      notes,
    } = req.body as {
      name?: string;
      type?: string;
      provider?: string | null;
      policyNo?: string | null;
      status?: string;
      startDate?: string | null;
      endDate?: string | null;
      fileUrl?: string | null;
      notes?: string | null;
    };

    const updated = await prisma.policy.update({
      where: { id: policyId },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type: type as any }),
        ...(provider !== undefined && { provider }),
        ...(policyNo !== undefined && { policyNo }),
        ...(status !== undefined && { status: status as any }),
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(notes !== undefined && { notes }),
        // Allow restoring deleted policies by setting isDeleted to false
        ...(req.body.isDeleted !== undefined && { isDeleted: req.body.isDeleted }),
      },
    });

    return res.status(200).json({ id: updated.id });
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).end();
}
