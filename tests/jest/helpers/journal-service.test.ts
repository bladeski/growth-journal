import { jest } from '@jest/globals';
import type { IJournalEntry, ISectionState } from '../../../src/models/index.ts';
import type { StoragePort } from '../../../src/storage/index.ts';

const storageMock: StoragePort = {
  init: jest.fn<() => Promise<void>>(),
  getEntry: jest.fn<(id: string) => Promise<IJournalEntry | null>>().mockResolvedValue(null) as jest.Mock<(id: string) => Promise<IJournalEntry | null>>,
  saveEntry: jest.fn<(entry: IJournalEntry) => Promise<void>>().mockResolvedValue(undefined),
  deleteEntry: jest.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
  listDates: jest.fn<() => Promise<string[]>>().mockResolvedValue([]),
  sinceUpdated: jest.fn<(timestamp: string) => Promise<IJournalEntry[]>>().mockResolvedValue([]),
  byDateRange: jest.fn<(startDate: string, endDate: string) => Promise<IJournalEntry[]>>().mockResolvedValue([]),
  byTag: jest.fn<(tag: string) => Promise<IJournalEntry[]>>().mockResolvedValue([]),
};

const createStorageMock = jest.fn(async () => storageMock);

jest.unstable_mockModule('../../../src/storage/index.ts', () => ({
  createStorage: createStorageMock,
}));

let JournalService: typeof import('../../../src/services/journal.service.ts').JournalService;

beforeAll(async () => {
  ({ JournalService } = await import('../../../src/services/journal.service.ts'));
});

beforeEach(() => {
  jest.clearAllMocks();
  createStorageMock.mockResolvedValue(storageMock);
});

describe('JournalService', () => {
  test('ensureDay returns existing entry without saving', async () => {
    const existing: IJournalEntry = {
      id: 'entry-1',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };
    (
      storageMock.getEntry as jest.MockedFunction<StoragePort['getEntry']>
    ).mockResolvedValue(existing);

    const service = new JournalService();
    const result = await service.ensureDay('2026-02-18');

    expect(result).toBe(existing);
    expect(storageMock.saveEntry).not.toHaveBeenCalled();
  });

  test('ensureDay creates and saves a new entry when missing', async () => {
    (
      storageMock.getEntry as jest.MockedFunction<StoragePort['getEntry']>
    ).mockResolvedValue(null);

    const service = new JournalService();
    const result = await service.ensureDay('2026-02-18');

    expect(result.date).toBe('2026-02-18');
    expect(storageMock.saveEntry).toHaveBeenCalledTimes(1);
    const saved = (
      storageMock.saveEntry as jest.MockedFunction<StoragePort['saveEntry']>
    ).mock.calls[0][0];
    expect(saved.date).toBe('2026-02-18');
  });

  test('applyAnswer updates morning-reset section responses and saves', async () => {
    const morningSection: ISectionState = {
      templateId: 'tpl-1',
      kind: 'morning-reset',
      responses: [],
    };
    const entry: IJournalEntry = {
      id: 'entry-2',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
      morningIntention: morningSection,
    };

    const service = new JournalService();
    const next = await service.applyAnswer(entry, {
      sectionKind: 'morning-reset',
      questionId: 'q1',
      value: {
        kind: 'text',
        value: ''
      },
    });

    expect(next.morningIntention!.responses).toHaveLength(1);
    expect(next.morningIntention!.responses[0].questionId).toBe('q1');
    expect(storageMock.saveEntry).toHaveBeenCalledTimes(1);
  });

  test('applyAnswer updates midday-checkin section responses and saves', async () => {
    const middaySection: ISectionState = {
      templateId: 'tpl-2',
      kind: 'midday-checkin',
      responses: [],
    };
    const entry: IJournalEntry = {
      id: 'entry-3',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
      middayCheckin: middaySection,
    };

    const service = new JournalService();
    const next = await service.applyAnswer(entry, {
      sectionKind: 'midday-checkin',
      questionId: 'q2',
      value: {
        kind: 'text',
        value: ''
      },
    });

    expect(next.middayCheckin!.responses).toHaveLength(1);
    expect(next.middayCheckin!.responses[0].questionId).toBe('q2');
    expect(storageMock.saveEntry).toHaveBeenCalledTimes(1);
  });

  test('applyAnswer updates evening-reflection section responses and saves', async () => {
    const eveningSection: ISectionState = {
      templateId: 'tpl-3',
      kind: 'evening-reflection',
      responses: [],
    };
    const entry: IJournalEntry = {
      id: 'entry-4',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
      eveningReflection: eveningSection,
    };

    const service = new JournalService();
    const next = await service.applyAnswer(entry, {
      sectionKind: 'evening-reflection',
      questionId: 'q3',
      value: {
        kind: 'text',
        value: ''
      },
    });

    expect(next.eveningReflection!.responses).toHaveLength(1);
    expect(next.eveningReflection!.responses[0].questionId).toBe('q3');
    expect(storageMock.saveEntry).toHaveBeenCalledTimes(1);
  });

  test('applyAnswer updates accountability section responses and saves', async () => {
    const accountabilitySection: ISectionState = {
      templateId: 'tpl-4',
      kind: 'accountability',
      responses: [],
    };
    const entry: IJournalEntry = {
      id: 'entry-5',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
      accountability: accountabilitySection,
    };

    const service = new JournalService();
    const next = await service.applyAnswer(entry, {
      sectionKind: 'accountability',
      questionId: 'q4',
      value: {
        kind: 'text',
        value: ''
      },
    });

    expect(next.accountability!.responses).toHaveLength(1);
    expect(next.accountability!.responses[0].questionId).toBe('q4');
    expect(storageMock.saveEntry).toHaveBeenCalledTimes(1);
  });

  test('listDates delegates to storage', async () => {
    (
      storageMock.listDates as jest.MockedFunction<StoragePort['listDates']>
    ).mockResolvedValue(['2026-02-16']);

    const service = new JournalService();
    const dates = await service.listDates();

    expect(dates).toEqual(['2026-02-16']);
    expect(storageMock.listDates).toHaveBeenCalledTimes(1);
  });

  test('entriesSince delegates to storage', async () => {
    const entries: IJournalEntry[] = [
      {
        id: 'entry-1',
        date: '2026-02-18',
        createdAt: '2026-02-18T10:00:00.000Z',
        updatedAt: '2026-02-18T12:00:00.000Z',
      },
    ];
    (
      storageMock.sinceUpdated as jest.MockedFunction<StoragePort['sinceUpdated']>
    ).mockResolvedValue(entries);

    const service = new JournalService();
    const result = await service.entriesSince('2026-02-18T00:00:00.000Z');

    expect(result).toEqual(entries);
    expect(storageMock.sinceUpdated).toHaveBeenCalledWith('2026-02-18T00:00:00.000Z');
  });

  test('entriesInRange delegates to storage', async () => {
    const entries: IJournalEntry[] = [
      {
        id: 'entry-1',
        date: '2026-02-18',
        createdAt: '2026-02-18T10:00:00.000Z',
        updatedAt: '2026-02-18T10:00:00.000Z',
      },
    ];
    (
      storageMock.byDateRange as jest.MockedFunction<StoragePort['byDateRange']>
    ).mockResolvedValue(entries);

    const service = new JournalService();
    const result = await service.entriesInRange('2026-02-16', '2026-02-18');

    expect(result).toEqual(entries);
    expect(storageMock.byDateRange).toHaveBeenCalledWith('2026-02-16', '2026-02-18');
  });

  test('entriesByTag delegates to storage', async () => {
    const entries: IJournalEntry[] = [
      {
        id: 'entry-1',
        date: '2026-02-18',
        createdAt: '2026-02-18T10:00:00.000Z',
        updatedAt: '2026-02-18T10:00:00.000Z',
        tags: ['work'],
      },
    ];
    (
      storageMock.byTag as jest.MockedFunction<StoragePort['byTag']>
    ).mockResolvedValue(entries);

    const service = new JournalService();
    const result = await service.entriesByTag('work');

    expect(result).toEqual(entries);
    expect(storageMock.byTag).toHaveBeenCalledWith('work');
  });

  test('save updates entry timestamp and saves', async () => {
    const beforeTime = new Date().toISOString();
    const entry: IJournalEntry = {
      id: 'entry-1',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    const service = new JournalService();
    await service.save(entry);

    expect(storageMock.saveEntry).toHaveBeenCalledTimes(1);
    const saved = (
      storageMock.saveEntry as jest.MockedFunction<StoragePort['saveEntry']>
    ).mock.calls[0][0];
    expect(new Date(saved.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
  });
});
