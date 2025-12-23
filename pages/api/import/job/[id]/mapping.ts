import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { generateSourceHash, parseFile } from '@/lib/import/parser';
import { ImportType } from '@prisma/client';
import fs from 'fs';

interface MappingPayload {
  type: string;
  mappingName?: string;
  columnToField: Record<string, string>;
  options?: {
    dateFormat?: string;
    currency?: string;
    ventureId?: number;
    propertyId?: number;
  };
  saveAsTemplate?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = Number(session.user.id);
  const jobId = Number(req.query.id);

  if (isNaN(jobId)) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }

  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: { mapping: true },
  });

  if (!job) {
    return res.status(404).json({ error: 'Import job not found' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      jobId: job.id,
      type: job.type,
      status: job.status,
      mapping: job.mapping ? {
        id: job.mapping.id,
        name: job.mapping.name,
        type: job.mapping.type,
        configJson: job.mapping.configJson,
      } : null,
    });
  }

  if (req.method === 'POST') {
    const { type, mappingName, columnToField, options, saveAsTemplate } = req.body as MappingPayload;

    if (!type || !columnToField) {
      return res.status(400).json({ error: 'type and columnToField are required' });
    }

    let mappingId = job.mappingId;

    if (saveAsTemplate && mappingName) {
      let sourceHash: string | null = null;
      
      if (job.filePath && fs.existsSync(job.filePath)) {
        const content = fs.readFileSync(job.filePath);
        const parseResult = await parseFile(content, job.mimeType || '', job.fileName);
        sourceHash = generateSourceHash(parseResult.columns);
      }

      const existingMapping = await prisma.importMapping.findFirst({
        where: { name: mappingName, type: type as ImportType },
      });

      if (existingMapping) {
        await prisma.importMapping.update({
          where: { id: existingMapping.id },
          data: {
            sourceHash,
            configJson: { columnToField, options },
          },
        });
        mappingId = existingMapping.id;
      } else {
        const newMapping = await prisma.importMapping.create({
          data: {
            name: mappingName,
            type: type as ImportType,
            sourceHash,
            configJson: { columnToField, options },
            createdById: userId,
          },
        });
        mappingId = newMapping.id;
      }
    }

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        type: type as ImportType,
        status: 'MAPPED',
        mappingId,
      },
    });

    return res.status(200).json({
      success: true,
      jobId,
      mappingId,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
