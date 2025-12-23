import { isStrongMatch } from '@/lib/freight/customerDedupe';

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

describe('customerDedupe', () => {
  describe('isStrongMatch', () => {
    it('should return true when any candidate has score >= 85', () => {
      const candidates: DedupeCandidate[] = [
        { id: 1, name: 'Test', email: null, phone: null, tmsCustomerCode: null, address: null, score: 60, matchReasons: [] },
        { id: 2, name: 'Test2', email: 'a@b.com', phone: null, tmsCustomerCode: null, address: null, score: 85, matchReasons: ['Exact email match'] },
      ];
      expect(isStrongMatch(candidates)).toBe(true);
    });

    it('should return true when candidate has score = 100', () => {
      const candidates: DedupeCandidate[] = [
        { id: 1, name: 'Test', email: null, phone: null, tmsCustomerCode: 'TMS123', address: null, score: 100, matchReasons: ['Exact TMS customer code match'] },
      ];
      expect(isStrongMatch(candidates)).toBe(true);
    });

    it('should return false when all candidates have score < 85', () => {
      const candidates: DedupeCandidate[] = [
        { id: 1, name: 'Test', email: null, phone: null, tmsCustomerCode: null, address: null, score: 60, matchReasons: ['Name match'] },
        { id: 2, name: 'Test2', email: null, phone: '1234567890', tmsCustomerCode: null, address: null, score: 80, matchReasons: ['Phone match'] },
      ];
      expect(isStrongMatch(candidates)).toBe(false);
    });

    it('should return false for empty candidate array', () => {
      expect(isStrongMatch([])).toBe(false);
    });

    it('should return false for score of exactly 84', () => {
      const candidates: DedupeCandidate[] = [
        { id: 1, name: 'Test', email: null, phone: null, tmsCustomerCode: null, address: null, score: 84, matchReasons: [] },
      ];
      expect(isStrongMatch(candidates)).toBe(false);
    });
  });
});
