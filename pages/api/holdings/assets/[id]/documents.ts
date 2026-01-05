import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { logActivity } from '@/lib/activityLog';
import Busboy from "busboy";
import { v4 as uuidv4 } from "uuid";
import { createStorageClient } from "@/lib/storage";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_ROLES = ["CEO", "ADMIN", "COO", "FINANCE"];

const HOLDING_ASSET_DOCS_BUCKET = "holdingAssetDocs";
const holdingAssetDocsStorageClient = createStorageClient(HOLDING_ASSET_DOCS_BUCKET);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function isValidFileType(mimeType: string): boolean {
  return mimeType.toLowerCase() === "application/pdf";
}

function parseForm(req: NextApiRequest): Promise<{
  fields: Record<string, string>;
  file: { buffer: Buffer; filename: string; mimeType: string; size: number } | null;
}> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields: Record<string, string> = {};
    let file: { buffer: Buffer; filename: string; mimeType: string; size: number } | null = null;

    busboy.on("file", (name, stream, info) => {
      if (name === "file") {
        const filename = info.filename;
        const mimeType = info.mimeType;
        const chunks: Buffer[] = [];

        stream.on("data", (data) => chunks.push(data));
        stream.on("end", () => {
          const buffer = Buffer.concat(chunks);
          if (buffer.length > 0 && buffer.length <= MAX_FILE_SIZE && isValidFileType(mimeType)) {
            file = {
              buffer,
              filename,
              mimeType,
              size: buffer.length,
            };
          }
        });
      } else {
        stream.resume(); // Skip other files
      }
    });

    busboy.on("field", (name, val) => {
      fields[name] = val;
    });

    busboy.on("finish", () => {
      resolve({ fields, file });
    });

    busboy.on("error", reject);
    req.pipe(busboy);
  });
}

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
      const { fields, file } = await parseForm(req);

      const name = fields.name;
      const description = fields.description;
      const category = fields.category;

      if (!name) {
        return res.status(400).json({ error: 'name is required' });
      }

      if (!file) {
        return res.status(400).json({ error: 'PDF file is required' });
      }

      if (!isValidFileType(file.mimeType)) {
        return res.status(400).json({ error: 'Only PDF files are allowed' });
      }

      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        });
      }

      // Upload file to Supabase storage
      const ext = file.filename.includes(".") ? file.filename.split(".").pop() : "pdf";
      const timestamp = Date.now();
      const random = uuidv4().substring(0, 8);
      const storageKey = `asset-${assetId}-${timestamp}-${random}.${ext}`;

      const uploadResult = await holdingAssetDocsStorageClient.upload(
        storageKey,
        file.buffer,
        file.mimeType
      );

      // Generate a signed URL for the file (valid for 1 year)
      const fileUrl = await holdingAssetDocsStorageClient.signedUrl(
        uploadResult.bucket,
        uploadResult.path,
        31536000 // 1 year in seconds
      );

      const document = await prisma.holdingAssetDocument.create({
        data: {
          assetId,
          name,
          description: description || null,
          category: category || null,
          fileUrl, // Store the signed URL
          fileName: file.filename,
          mimeType: file.mimeType,
          sizeBytes: file.size,
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
        metadata: { assetId, category, fileName: file.filename },
        req,
      });

      return res.status(201).json(document);
    } catch (err: any) {
      console.error('Create document error:', err);
      return res.status(500).json({ error: 'Internal server error', detail: err.message });
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
