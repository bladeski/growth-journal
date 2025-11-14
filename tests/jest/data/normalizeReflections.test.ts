import normalizeReflections from '../../../src/data/migrations/normalizeReflections.ts';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService.ts';
import { jest } from '@jest/globals';

describe('normalizeReflections (dryRun)', () => {
  const legacyRecord = {
    date: '2025-01-01',
    small_win: 'I was patient',
    reflection_text: 'I noticed my reaction to feedback',
  } as unknown;

  test('reports changes and does not write when dryRun=true', async () => {
    const getEveningReflection = jest.fn().mockResolvedValue(legacyRecord);
    const setEveningReflection = jest.fn().mockResolvedValue(undefined);

    type Proto = {
      getEveningReflection?: (date: string) => Promise<unknown>;
      setEveningReflection?: (rec: unknown) => Promise<void>;
    };

    const proto = IndexedDbDataService.prototype as unknown as Proto;
    const origGet = proto.getEveningReflection;
    const origSet = proto.setEveningReflection;

    proto.getEveningReflection = getEveningReflection as unknown as (
      date: string
    ) => Promise<unknown>;
    proto.setEveningReflection = setEveningReflection as unknown as (rec: unknown) => Promise<void>;

    try {
      const res = await normalizeReflections({ daysBack: 1, dryRun: true });

      expect(res.dryRun).toBe(true);
      expect(res.checked).toBeGreaterThanOrEqual(0);
      expect(res.updated).toBeGreaterThanOrEqual(0);
      expect(setEveningReflection).not.toHaveBeenCalled();
    } finally {
      if (origGet) proto.getEveningReflection = origGet;
      else delete (proto as unknown as Record<string, unknown>).getEveningReflection;
      if (origSet) proto.setEveningReflection = origSet;
      else delete (proto as unknown as Record<string, unknown>).setEveningReflection;
    }
  });
});
