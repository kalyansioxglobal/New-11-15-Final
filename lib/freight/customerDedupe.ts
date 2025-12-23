import { prisma } from '@/lib/prisma';

interface DedupeCandidate {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  tmsCustomerCode: string | null;
  address: string | null;
  score: number;
  matchReasons: string[];
}

interface DedupeParams {
  name: string;
  email?: string | null;
  phone?: string | null;
  tmsCustomerCode?: string | null;
  state?: string | null;
  ventureId?: number;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.replace(/\D/g, '').slice(-10);
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.toLowerCase().trim();
}

function getEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const parts = email.split('@');
  return parts.length > 1 ? parts[1].toLowerCase() : null;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

export async function findDuplicateCustomers(params: DedupeParams): Promise<DedupeCandidate[]> {
  const { name, email, phone, tmsCustomerCode, state, ventureId } = params;
  const candidates: Map<number, DedupeCandidate> = new Map();

  if (tmsCustomerCode) {
    const exactTmsMatch = await prisma.customer.findFirst({
      where: {
        tmsCustomerCode,
        ...(ventureId && { ventureId }),
      },
    });

    if (exactTmsMatch) {
      candidates.set(exactTmsMatch.id, {
        id: exactTmsMatch.id,
        name: exactTmsMatch.name,
        email: exactTmsMatch.email,
        phone: exactTmsMatch.phone,
        tmsCustomerCode: exactTmsMatch.tmsCustomerCode,
        address: exactTmsMatch.address,
        score: 100,
        matchReasons: ['Exact TMS customer code match'],
      });
    }
  }

  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone && normalizedPhone.length >= 10) {
    const phoneMatches = await prisma.customer.findMany({
      where: {
        phone: { contains: normalizedPhone.slice(-10) },
        ...(ventureId && { ventureId }),
      },
      take: 10,
    });

    for (const match of phoneMatches) {
      const existing = candidates.get(match.id);
      if (existing) {
        existing.score = Math.min(100, existing.score + 30);
        existing.matchReasons.push('Phone match');
      } else {
        candidates.set(match.id, {
          id: match.id,
          name: match.name,
          email: match.email,
          phone: match.phone,
          tmsCustomerCode: match.tmsCustomerCode,
          address: match.address,
          score: 80,
          matchReasons: ['Phone match'],
        });
      }
    }
  }

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) {
    const emailMatches = await prisma.customer.findMany({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        ...(ventureId && { ventureId }),
      },
      take: 10,
    });

    for (const match of emailMatches) {
      const existing = candidates.get(match.id);
      if (existing) {
        existing.score = Math.min(100, existing.score + 30);
        existing.matchReasons.push('Exact email match');
      } else {
        candidates.set(match.id, {
          id: match.id,
          name: match.name,
          email: match.email,
          phone: match.phone,
          tmsCustomerCode: match.tmsCustomerCode,
          address: match.address,
          score: 85,
          matchReasons: ['Exact email match'],
        });
      }
    }
  }

  const emailDomain = getEmailDomain(email);
  const normalizedInputName = normalizeName(name);
  if (emailDomain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'].includes(emailDomain)) {
    const domainMatches = await prisma.customer.findMany({
      where: {
        email: { endsWith: `@${emailDomain}`, mode: 'insensitive' },
        ...(ventureId && { ventureId }),
      },
      take: 20,
    });

    for (const match of domainMatches) {
      const matchedNormalizedName = normalizeName(match.name);
      if (normalizedInputName.includes(matchedNormalizedName) || matchedNormalizedName.includes(normalizedInputName)) {
        const existing = candidates.get(match.id);
        if (existing) {
          existing.score = Math.min(100, existing.score + 20);
          existing.matchReasons.push('Email domain + similar name');
        } else {
          candidates.set(match.id, {
            id: match.id,
            name: match.name,
            email: match.email,
            phone: match.phone,
            tmsCustomerCode: match.tmsCustomerCode,
            address: match.address,
            score: 70,
            matchReasons: ['Email domain + similar name'],
          });
        }
      }
    }
  }

  if (state) {
    const nameStateMatches = await prisma.customer.findMany({
      where: {
        address: { contains: state, mode: 'insensitive' },
        ...(ventureId && { ventureId }),
      },
      take: 50,
    });

    for (const match of nameStateMatches) {
      const matchedNormalizedName = normalizeName(match.name);
      if (normalizedInputName === matchedNormalizedName) {
        const existing = candidates.get(match.id);
        if (existing) {
          existing.score = Math.min(100, existing.score + 15);
          existing.matchReasons.push('Exact name + state match');
        } else {
          candidates.set(match.id, {
            id: match.id,
            name: match.name,
            email: match.email,
            phone: match.phone,
            tmsCustomerCode: match.tmsCustomerCode,
            address: match.address,
            score: 60,
            matchReasons: ['Exact name + state match'],
          });
        }
      }
    }
  }

  return Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export function isStrongMatch(candidates: DedupeCandidate[]): boolean {
  return candidates.some(c => c.score >= 85);
}
