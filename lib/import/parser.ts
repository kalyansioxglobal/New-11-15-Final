import ExcelJS from 'exceljs';
import { parse as csvParse } from 'csv-parse/sync';

export interface ParseResult {
  columns: string[];
  rows: string[][];
  totalRows: number;
  delimiter?: string;
  sheetName?: string;
}

export interface ParseOptions {
  maxRows?: number;
  sheetIndex?: number;
  previewOnly?: boolean;
}

function detectDelimiter(content: string): string {
  const firstLines = content.split('\n').slice(0, 5).join('\n');
  
  const delimiters = [',', '\t', ';', '|'];
  let bestDelimiter = ',';
  let maxCount = 0;
  
  for (const delimiter of delimiters) {
    const count = (firstLines.match(new RegExp(delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }
  
  return bestDelimiter;
}

function normalizeHeader(header: string): string {
  return (header || '').toString().trim();
}

export function parseCSV(content: string, options: ParseOptions = {}): ParseResult {
  const { maxRows, previewOnly = false } = options;
  const limit = previewOnly ? 20 : (maxRows ?? Infinity);
  
  const delimiter = detectDelimiter(content);
  
  const records = csvParse(content, {
    delimiter,
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as string[][];
  
  if (records.length === 0) {
    return { columns: [], rows: [], totalRows: 0, delimiter };
  }
  
  const columns = records[0].map(normalizeHeader);
  const dataRows = records.slice(1);
  const rows = limit === Infinity ? dataRows : dataRows.slice(0, limit);
  
  return {
    columns,
    rows,
    totalRows: dataRows.length,
    delimiter,
  };
}

export async function parseExcel(buffer: Buffer, options: ParseOptions = {}): Promise<ParseResult> {
  const { maxRows, sheetIndex = 0, previewOnly = false } = options;
  const limit = previewOnly ? 20 : (maxRows ?? Infinity);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  
  const worksheets = workbook.worksheets;
  const worksheet = worksheets[sheetIndex] || worksheets[0];
  const sheetName = worksheet?.name || 'Sheet1';
  
  if (!worksheet || worksheet.rowCount === 0) {
    return { columns: [], rows: [], totalRows: 0, sheetName };
  }
  
  const rawData: string[][] = [];
  worksheet.eachRow((row, rowNumber) => {
    const rowValues: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (rowValues.length < colNumber - 1) {
        rowValues.push('');
      }
      const value = cell.value;
      if (value === null || value === undefined) {
        rowValues.push('');
      } else if (typeof value === 'object' && 'result' in value) {
        rowValues.push(String(value.result ?? ''));
      } else if (typeof value === 'object' && 'text' in value) {
        rowValues.push(String(value.text ?? ''));
      } else if (value instanceof Date) {
        rowValues.push(value.toISOString().split('T')[0]);
      } else {
        rowValues.push(String(value));
      }
    });
    rawData.push(rowValues);
  });
  
  if (rawData.length === 0) {
    return { columns: [], rows: [], totalRows: 0, sheetName };
  }
  
  const columns = (rawData[0] || []).map(normalizeHeader);
  const dataRows = rawData.slice(1);
  const allRows = dataRows.map(row => 
    row.map(cell => (cell ?? '').toString())
  );
  const rows = limit === Infinity ? allRows : allRows.slice(0, limit);
  
  return {
    columns,
    rows,
    totalRows: dataRows.length,
    sheetName,
  };
}

export async function parseFile(
  content: Buffer | string,
  mimeType: string,
  fileName: string,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  
  if (ext === 'xlsx' || ext === 'xls' || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    const buffer = typeof content === 'string' ? Buffer.from(content) : content;
    return await parseExcel(buffer, options);
  }
  
  const textContent = typeof content === 'string' ? content : content.toString('utf-8');
  return parseCSV(textContent, options);
}

export function generateSourceHash(columns: string[]): string {
  const normalized = columns
    .map(c => c.toLowerCase().trim())
    .sort()
    .join('|');
  
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export const IMPORT_TYPE_FIELDS: Record<string, { required: string[]; optional: string[] }> = {
  LOADS: {
    required: ['referenceNumber'],
    optional: [
      'pickupDate', 'deliveryDate', 'status', 
      'shipperName', 'consigneeName', 
      'originCity', 'originState', 'originZip',
      'destCity', 'destState', 'destZip',
      'equipment', 'weight', 'miles',
      'customerRate', 'carrierRate', 'margin',
      'carrierName', 'mcNumber', 'dotNumber',
      'notes'
    ]
  },
  CUSTOMERS: {
    required: ['name'],
    optional: ['email', 'phone', 'address', 'city', 'state', 'zip', 'notes', 'creditLimit', 'paymentTerms']
  },
  CARRIERS: {
    required: ['name'],
    optional: ['mcNumber', 'dotNumber', 'phone', 'email', 'address', 'city', 'state', 'zip', 'equipment', 'lanes', 'notes']
  },
  SHIPPERS: {
    required: ['name'],
    optional: ['contact', 'email', 'phone', 'address', 'city', 'state', 'zip', 'ventureId', 'notes']
  },
  HOTEL_KPIS: {
    required: ['date', 'propertyId'],
    optional: ['occupancy', 'adr', 'revpar', 'roomRevenue', 'roomsSold', 'roomsAvailable', 'totalRevenue', 'lostDues']
  },
  FREIGHT_KPIS: {
    required: ['date', 'ventureId'],
    optional: ['totalLoads', 'coveredLoads', 'revenue', 'cost', 'margin', 'coverageRate', 'marginPercent']
  },
  HOTEL_DISPUTES: {
    required: ['propertyId', 'type', 'disputedAmount'],
    optional: ['reservationId', 'folioNumber', 'channel', 'guestName', 'guestEmail', 'postedDate', 'stayFrom', 'stayTo', 'reason', 'status', 'evidenceDueDate']
  },
  BANK_TRANSACTIONS: {
    required: ['date', 'amount'],
    optional: ['description', 'type', 'category', 'accountName', 'balance', 'reference']
  },
  HOTEL_REVIEWS: {
    required: ['propertyId', 'rating'],
    optional: ['source', 'guestName', 'reviewDate', 'reviewText', 'responded', 'responseText']
  },
  BPO_METRICS: {
    required: ['date', 'campaignId'],
    optional: ['outboundCalls', 'inboundCalls', 'leads', 'demos', 'sales', 'revenue', 'cost', 'qaScore', 'avgHandleTime']
  },
  GENERIC: {
    required: [],
    optional: []
  }
};

export function getFieldsForType(type: string): { required: string[]; optional: string[] } {
  return IMPORT_TYPE_FIELDS[type] || IMPORT_TYPE_FIELDS.GENERIC;
}
