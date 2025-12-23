import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { logActivity } from '@/lib/activityLog';

const ALLOWED_ROLES = ["CEO", "ADMIN", "COO", "FINANCE"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!ALLOWED_ROLES.includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden - insufficient role permissions' });
  }

  const assetId = Number(req.query.id);
  if (!assetId || isNaN(assetId)) {
    return res.status(400).json({ error: 'Invalid asset ID' });
  }

  const scope = getUserScope(user);

  const asset = await prisma.holdingAsset.findUnique({
    where: { id: assetId },
    include: { venture: true },
  });

  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  if (asset.ventureId && !scope.allVentures && !scope.ventureIds.includes(asset.ventureId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    try {
      const documents = await prisma.holdingAssetDocument.findMany({
        where: { assetId },
        include: {
          uploadedBy: {
            select: { id: true, fullName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(documents);
    } catch (err) {
      console.error('Get documents error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, category, fileUrl, fileName, mimeType, sizeBytes } = req.body as {
        name: string;
        description?: string;
        category?: string;
        fileUrl: string;
        fileName: string;
        mimeType?: string;
        sizeBytes?: number;
      };

      if (!name || !fileUrl || !fileName) {
        return res.status(400).json({ error: 'name, fileUrl, and fileName are required' });
      }

      const document = await prisma.holdingAssetDocument.create({
        data: {
          assetId,
          name,
          description: description || null,
          category: category || null,
          fileUrl,
          fileName,
          mimeType: mimeType || null,
          sizeBytes: sizeBytes || null,
          uploadedById: user.id,
        },
        include: {
          uploadedBy: {
            select: { id: true, fullName: true },
          },
        },
      });

      await logActivity({
        userId: user.id,
        action: 'DOCUMENT_UPLOADED',
        module: 'HOLDINGS',
        entityType: 'HOLDING_ASSET_DOCUMENT',
        entityId: String(document.id),
        description: `Uploaded document "${name}" to asset "${asset.name}"`,
        metadata: { assetId, category, fileName },
        req,
      });

      return res.status(201).json(document);
    } catch (err) {
      console.error('Create document error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const docId = Number(req.query.docId);
      if (!docId || isNaN(docId)) {
        return res.status(400).json({ error: 'docId query param required' });
      }

      const doc = await prisma.holdingAssetDocument.findFirst({
        where: { id: docId, assetId },
      });

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      await prisma.holdingAssetDocument.delete({
        where: { id: docId },
      });

      await logActivity({
        userId: user.id,
        action: 'DOCUMENT_DELETED',
        module: 'HOLDINGS',
        entityType: 'HOLDING_ASSET_DOCUMENT',
        entityId: String(docId),
        description: `Deleted document "${doc.name}" from asset "${asset.name}"`,
        metadata: { assetId, docName: doc.name },
        req,
      });

      return res.json({ success: true });
    } catch (err) {
      console.error('Delete document error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
