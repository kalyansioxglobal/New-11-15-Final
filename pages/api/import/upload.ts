import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { parseFile, generateSourceHash } from '@/lib/import/parser';
import { canUploadImports } from '@/lib/permissions';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'imports');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

interface UploadResponse {
  jobId: number;
  fileName: string;
  columns: string[];
  sampleRows: string[][];
  totalRows: number;
  suggestedMappings?: {
    id: number;
    name: string;
    type: string;
    configJson: Record<string, string>;
  }[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = Number(session.user.id);
  const userRole = session.user.role as string;

  if (!canUploadImports({ role: userRole as any })) {
    return res.status(403).json({ error: 'Forbidden - insufficient permissions to upload imports' });
  }

  try {
    const form = formidable({
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024,
    });

    const [, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const content = fs.readFileSync(file.filepath);
    const fileName = file.originalFilename || 'unknown';
    const mimeType = file.mimetype || 'application/octet-stream';

    const parseResult = await parseFile(content, mimeType, fileName, { previewOnly: true });

    if (parseResult.columns.length === 0) {
      fs.unlinkSync(file.filepath);
      return res.status(400).json({ error: 'Could not detect columns in file. Make sure the file has a header row.' });
    }

    const sourceHash = generateSourceHash(parseResult.columns);

    const importJob = await (prisma as unknown as { importJob: { create: (args: unknown) => Promise<{ id: number }> } }).importJob.create({
      data: {
        type: 'GENERIC',
        fileName,
        filePath: file.filepath,
        mimeType,
        status: 'UPLOADED',
        rowCount: parseResult.totalRows,
        createdById: userId,
      },
    });

    const suggestedMappings = await (prisma as unknown as { importMapping: { findMany: (args: unknown) => Promise<Array<{ id: number; name: string; type: string; configJson: unknown; updatedAt: Date }>> } }).importMapping.findMany({
      where: {
        OR: [
          { sourceHash },
          { sourceHash: null },
        ],
      },
      orderBy: [
        { sourceHash: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 5,
    });

    const response: UploadResponse = {
      jobId: importJob.id,
      fileName,
      columns: parseResult.columns,
      sampleRows: parseResult.rows,
      totalRows: parseResult.totalRows,
      suggestedMappings: suggestedMappings.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        configJson: m.configJson as Record<string, string>,
      })),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process upload' 
    });
  }
}
