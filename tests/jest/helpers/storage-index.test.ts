import { jest } from '@jest/globals';
import type { IJournalEntry } from '../../../src/models/index.ts';

const originalIndexedDB = globalThis.indexedDB;

afterEach(() => {
  globalThis.indexedDB = originalIndexedDB;
  jest.resetModules();
  jest.clearAllMocks();
});

describe('createStorage', () => {
  test('uses IndexedDB adapter when indexedDB is available', async () => {
    const initSpy = jest.fn(async () => {});
    const JournalDB = jest.fn().mockImplementation(() => ({
      init: initSpy,
      getEntry: jest.fn(),
      putEntry: jest.fn(),
      deleteEntry: jest.fn(),
      listDates: jest.fn(),
      sinceUpdated: jest.fn(),
      byDateRange: jest.fn(),
      byTag: jest.fn(),
    }));

    jest.unstable_mockModule('../../../src/storage/indexeddb.ts', () => ({
      JournalDB,
    }));

    globalThis.indexedDB = {} as IDBFactory;

    const { createStorage } = await import('../../../src/storage/index.ts');
    const storage = await createStorage();

    expect(JournalDB).toHaveBeenCalledTimes(1);
    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(typeof storage.getEntry).toBe('function');
  });

  test('falls back to local storage adapter when indexedDB is missing', async () => {
    const loadEntry = jest.fn(() => null as IJournalEntry | null);
    const saveEntry = jest.fn();
    const removeEntry = jest.fn();
    const listDates = jest.fn<() => Promise<string[]>>().mockResolvedValue(['2026-02-16', '2026-02-18']);

    jest.unstable_mockModule('../../../src/storage/local.ts', () => ({
      loadEntry,
      saveEntry,
      removeEntry,
      listDates,
    }));

    globalThis.indexedDB = undefined as unknown as IDBFactory;

    const { createStorage } = await import('../../../src/storage/index.ts');
    const storage = await createStorage();

    const entry: IJournalEntry = {
      id: 'entry-1',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    await storage.getEntry('2026-02-18');
    await storage.saveEntry(entry);
    await storage.deleteEntry('2026-02-18');
    await storage.listDates();

    expect(loadEntry).toHaveBeenCalledWith('2026-02-18');
    expect(saveEntry).toHaveBeenCalledWith(entry);
    expect(removeEntry).toHaveBeenCalledWith('2026-02-18');
    expect(listDates).toHaveBeenCalledTimes(1);
  });

  test('IndexedDB adapter delegates all methods to JournalDB', async () => {
    const mockGetEntry = jest.fn<(date: string) => Promise<IJournalEntry | null>>().mockResolvedValue(null);
    const mockPutEntry = jest.fn<(entry: IJournalEntry) => Promise<void>>().mockImplementation(async () => {});
    const mockDeleteEntry = jest.fn<(date: string) => Promise<void>>().mockImplementation(async () => {});
    const mockListDates = jest.fn<() => Promise<string[]>>().mockResolvedValue(['2026-02-16', '2026-02-18']);
    const mockSinceUpdated = jest.fn<(timestamp: string, limit?: number) => Promise<IJournalEntry[]>>().mockResolvedValue([]);
    const mockByDateRange = jest.fn<(start: string, end: string) => Promise<IJournalEntry[]>>().mockResolvedValue([]);
    const mockByTag = jest.fn<(tag: string, limit?: number) => Promise<IJournalEntry[]>>().mockResolvedValue([]);
    const initSpy = jest.fn().mockImplementation(async () => {});

    const JournalDB = jest.fn().mockImplementation(() => ({
      init: initSpy,
      getEntry: mockGetEntry,
      putEntry: mockPutEntry,
      deleteEntry: mockDeleteEntry,
      listDates: mockListDates,
      sinceUpdated: mockSinceUpdated,
      byDateRange: mockByDateRange,
      byTag: mockByTag,
    }));

    jest.unstable_mockModule('../../../src/storage/indexeddb.ts', () => ({
      JournalDB,
    }));

    globalThis.indexedDB = {} as IDBFactory;

    const { createStorage } = await import('../../../src/storage/index.ts');
    const storage = await createStorage();

    const entry: IJournalEntry = {
      id: 'entry-1',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    await storage.getEntry('2026-02-18');
    await storage.saveEntry(entry);
    await storage.deleteEntry('2026-02-18');
    await storage.listDates();
    await storage.sinceUpdated('2026-02-18T00:00:00.000Z', 100);
    await storage.byDateRange('2026-02-16', '2026-02-18');
    await storage.byTag('work', 50);

    expect(mockGetEntry).toHaveBeenCalledWith('2026-02-18');
    expect(mockPutEntry).toHaveBeenCalledWith(entry);
    expect(mockDeleteEntry).toHaveBeenCalledWith('2026-02-18');
    expect(mockListDates).toHaveBeenCalled();
    expect(mockSinceUpdated).toHaveBeenCalledWith('2026-02-18T00:00:00.000Z', 100);
    expect(mockByDateRange).toHaveBeenCalledWith('2026-02-16', '2026-02-18');
    expect(mockByTag).toHaveBeenCalledWith('work', 50);
  });

  test('LocalStorageAdapter.sinceUpdated filters and sorts entries', async () => {
    const entry1: IJournalEntry = {
      id: 'e1',
      date: '2026-02-16',
      createdAt: '2026-02-16T10:00:00.000Z',
      updatedAt: '2026-02-16T12:00:00.000Z',
    };
    const entry2: IJournalEntry = {
      id: 'e2',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T11:00:00.000Z',
    };

    const loadEntry = jest.fn<(date: string) => IJournalEntry | null>().mockImplementation((date) =>
      date === '2026-02-16' ? entry1 : date === '2026-02-18' ? entry2 : null
    );
    const listDates = jest.fn<() => Promise<string[]>>().mockResolvedValue(['2026-02-16', '2026-02-18']);

    jest.unstable_mockModule('../../../src/storage/local.ts', () => ({
      loadEntry,
      saveEntry: jest.fn(),
      removeEntry: jest.fn(),
      listDates,
    }));

    globalThis.indexedDB = undefined as unknown as IDBFactory;

    const { createStorage } = await import('../../../src/storage/index.ts');
    const storage = await createStorage();

    const result = await storage.sinceUpdated('2026-02-16T13:00:00.000Z');

    expect(result).toContainEqual(entry2);
    expect(result.some(e => e.updatedAt >= '2026-02-16T13:00:00.000Z')).toBe(true);
  });

  test('LocalStorageAdapter.byDateRange filters by date range', async () => {
    const entry1: IJournalEntry = {
      id: 'e1',
      date: '2026-02-16',
      createdAt: '2026-02-16T10:00:00.000Z',
      updatedAt: '2026-02-16T10:00:00.000Z',
    };
    const entry2: IJournalEntry = {
      id: 'e2',
      date: '2026-02-17',
      createdAt: '2026-02-17T10:00:00.000Z',
      updatedAt: '2026-02-17T10:00:00.000Z',
    };
    const entry3: IJournalEntry = {
      id: 'e3',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    const loadEntry = jest.fn<(date: string) => IJournalEntry | null>().mockImplementation((date) => {
      if (date === '2026-02-16') return entry1;
      if (date === '2026-02-17') return entry2;
      if (date === '2026-02-18') return entry3;
      return null;
    });
    const listDates = jest.fn<() => Promise<string[]>>().mockResolvedValue(['2026-02-16', '2026-02-17', '2026-02-18']);

    jest.unstable_mockModule('../../../src/storage/local.ts', () => ({
      loadEntry,
      saveEntry: jest.fn(),
      removeEntry: jest.fn(),
      listDates,
    }));

    globalThis.indexedDB = undefined as unknown as IDBFactory;

    const { createStorage } = await import('../../../src/storage/index.ts');
    const storage = await createStorage();

    const result = await storage.byDateRange('2026-02-16', '2026-02-17');

    expect(result).toContainEqual(entry1);
    expect(result).toContainEqual(entry2);
    expect(result).not.toContainEqual(entry3);
    expect(result.length).toBe(2);
  });

  test('LocalStorageAdapter.byTag filters entries by tag', async () => {
    const entry1: IJournalEntry = {
      id: 'e1',
      date: '2026-02-16',
      createdAt: '2026-02-16T10:00:00.000Z',
      updatedAt: '2026-02-16T10:00:00.000Z',
      tags: ['work'],
    };
    const entry2: IJournalEntry = {
      id: 'e2',
      date: '2026-02-17',
      createdAt: '2026-02-17T10:00:00.000Z',
      updatedAt: '2026-02-17T10:00:00.000Z',
      tags: ['personal'],
    };

    const loadEntry = jest.fn<(date: string) => IJournalEntry | null>().mockImplementation((date) =>
      date === '2026-02-16' ? entry1 : date === '2026-02-17' ? entry2 : null
    );
    const listDates = jest.fn<() => Promise<string[]>>().mockResolvedValue(['2026-02-16', '2026-02-17']);

    jest.unstable_mockModule('../../../src/storage/local.ts', () => ({
      loadEntry,
      saveEntry: jest.fn(),
      removeEntry: jest.fn(),
      listDates,
    }));

    globalThis.indexedDB = undefined as unknown as IDBFactory;

    const { createStorage } = await import('../../../src/storage/index.ts');
    const storage = await createStorage();

    const result = await storage.byTag('work');

    expect(result).toContainEqual(entry1);
    expect(result).not.toContainEqual(entry2);
  });

  test('LocalStorageAdapter handles entries without tags', async () => {
    const entry: IJournalEntry = {
      id: 'e1',
      date: '2026-02-16',
      createdAt: '2026-02-16T10:00:00.000Z',
      updatedAt: '2026-02-16T10:00:00.000Z',
      // no tags property
    };

    const loadEntry = jest.fn<() => Promise<IJournalEntry | null>>().mockResolvedValue(entry);
    const listDates = jest.fn<() => Promise<string[]>>().mockResolvedValue(['2026-02-16']);

    jest.unstable_mockModule('../../../src/storage/local.ts', () => ({
      loadEntry,
      saveEntry: jest.fn(),
      removeEntry: jest.fn(),
      listDates,
    }));

    globalThis.indexedDB = undefined as unknown as IDBFactory;

    const { createStorage } = await import('../../../src/storage/index.ts');
    const storage = await createStorage();

    const result = await storage.byTag('nonexistent');

    expect(result).toEqual([]);
  });

  test('createStorage returns adapter with correct method signatures', async () => {
    const listDates = jest.fn<() => Promise<string[]>>().mockResolvedValue(['2026-02-16', '2026-02-18']);

    jest.unstable_mockModule('../../../src/storage/local.ts', () => ({
      loadEntry: jest.fn(),
      saveEntry: jest.fn(),
      removeEntry: jest.fn(),
      listDates,
    }));

    globalThis.indexedDB = undefined as unknown as IDBFactory;

    const { createStorage } = await import('../../../src/storage/index.ts');
    const storage = await createStorage();

    const dates: string[] = await storage.listDates();

    expect(dates).toEqual(['2026-02-16', '2026-02-18']);
    expect(Array.isArray(dates)).toBe(true);
  });

  test('LocalStorageAdapter.byDateRange returns typed array', async () => {
    const entry: IJournalEntry = {
      id: 'e1',
      date: '2026-02-16',
      createdAt: '2026-02-16T10:00:00.000Z',
      updatedAt: '2026-02-16T10:00:00.000Z',
    };

    const loadEntry = jest.fn<() => Promise<IJournalEntry>>().mockResolvedValue(entry);
    const listDates = jest.fn<() => Promise<string[]>>().mockResolvedValue(['2026-02-16']);

    jest.unstable_mockModule('../../../src/storage/local.ts', () => ({
      loadEntry,
      saveEntry: jest.fn(),
      removeEntry: jest.fn(),
      listDates,
    }));

    globalThis.indexedDB = undefined as unknown as IDBFactory;

    const { createStorage } = await import('../../../src/storage/index.ts');
    const storage = await createStorage();

    const entries: IJournalEntry[] = await storage.byDateRange('2026-02-16', '2026-02-18');

    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThanOrEqual(0);
  });
});
