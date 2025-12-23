import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { parseFile, getFieldsForType } from '@/lib/import/parser';
import fs from 'fs';

interface ValidationResult {
  jobId: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: { row: number; column: string; message: string; data: Record<string, string> }[];
  preview: Record<string, unknown>[];
}

function parseDate(value: string, format?: string): Date | null {
  if (!value) return null;
  
  const cleaned = value.trim();
  
  const isoDate = new Date(cleaned);
  if (!isNaN(isoDate.getTime())) return isoDate;
  
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];
  
  for (const regex of formats) {
    const match = cleaned.match(regex);
    if (match) {
      let year: number, month: number, day: number;
      
      if (match[1].length === 4) {
        year = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        day = parseInt(match[3]);
      } else if (match[3].length === 4) {
        month = parseInt(match[1]) - 1;
        day = parseInt(match[2]);
        year = parseInt(match[3]);
      } else {
        continue;
      }
      
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  return null;
}

function parseNumber(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
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

  const jobId = Number(req.query.id);

  if (isNaN(jobId)) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }

  try {
    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
      include: { mapping: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Import job not found' });
    }

    if (job.status !== 'MAPPED') {
      return res.status(400).json({ error: 'Job must be mapped before validation' });
    }

    if (!job.filePath || !fs.existsSync(job.filePath)) {
      return res.status(400).json({ error: 'File not found' });
    }

    const content = fs.readFileSync(job.filePath);
    const parseResult = await parseFile(content, job.mimeType || '', job.fileName);

    const mapping = job.mapping?.configJson as { 
      columnToField: Record<string, string>;
      options?: { dateFormat?: string; ventureId?: number; propertyId?: number };
    } | null;

    if (!mapping?.columnToField) {
      return res.status(400).json({ error: 'No column mapping found' });
    }

    const { columnToField, options } = mapping;
    const fieldConfig = getFieldsForType(job.type);
    
    const errors: ValidationResult['errors'] = [];
    const validRecords: Record<string, unknown>[] = [];

    const dateFields = ['date', 'pickupDate', 'deliveryDate', 'postedDate', 'stayFrom', 'stayTo', 'reviewDate', 'evidenceDueDate'];
    const numberFields = ['amount', 'disputedAmount', 'originalAmount', 'customerRate', 'carrierRate', 'margin', 'weight', 'miles', 'occupancy', 'adr', 'revpar', 'roomRevenue', 'roomsSold', 'roomsAvailable', 'totalRevenue', 'lostDues', 'revenue', 'cost', 'marginPercent', 'coverageRate', 'totalLoads', 'coveredLoads', 'rating', 'qaScore'];

    for (let rowIndex = 0; rowIndex < parseResult.rows.length; rowIndex++) {
      const row = parseResult.rows[rowIndex];
      const record: Record<string, unknown> = {};
      let hasError = false;
      const rowData: Record<string, string> = {};

      for (const [colName, fieldName] of Object.entries(columnToField)) {
        if (fieldName === '__ignore__' || !fieldName) continue;

        const colIndex = parseResult.columns.indexOf(colName);
        if (colIndex === -1) continue;

        const rawValue = row[colIndex] || '';
        rowData[colName] = rawValue;

        if (dateFields.includes(fieldName)) {
          const parsed = parseDate(rawValue, options?.dateFormat);
          if (rawValue && !parsed) {
            errors.push({
              row: rowIndex + 2,
              column: colName,
              message: `Invalid date format: "${rawValue}"`,
              data: rowData,
            });
            hasError = true;
          } else {
            record[fieldName] = parsed;
          }
        } else if (numberFields.includes(fieldName)) {
          const parsed = parseNumber(rawValue);
          if (rawValue && parsed === null) {
            errors.push({
              row: rowIndex + 2,
              column: colName,
              message: `Invalid number: "${rawValue}"`,
              data: rowData,
            });
            hasError = true;
          } else {
            record[fieldName] = parsed;
          }
        } else {
          record[fieldName] = rawValue.trim();
        }
      }

      for (const reqField of fieldConfig.required) {
        if (!record[reqField] && record[reqField] !== 0) {
          const matchingCol = Object.entries(columnToField).find(([, f]) => f === reqField)?.[0];
          errors.push({
            row: rowIndex + 2,
            column: matchingCol || reqField,
            message: `Missing required field: ${reqField}`,
            data: rowData,
          });
          hasError = true;
        }
      }

      if (options?.ventureId) {
        record.ventureId = options.ventureId;
      }
      if (options?.propertyId) {
        record.propertyId = options.propertyId;
      }

      if (!hasError) {
        validRecords.push(record);
      }
    }

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'VALIDATED',
        rowCount: parseResult.totalRows,
        successCount: validRecords.length,
        errorCount: errors.length,
        errorRows: errors.length > 0 ? errors.slice(0, 100) : undefined,
      },
    });

    const result: ValidationResult = {
      jobId,
      totalRows: parseResult.totalRows,
      validRows: validRecords.length,
      invalidRows: errors.length,
      errors: errors.slice(0, 50),
      preview: validRecords.slice(0, 10),
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Validation failed' 
    });
  }
}
