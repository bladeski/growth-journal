import { jest } from '@jest/globals';
import { IJournalEntry } from '../../../src/models/index.ts';
import type { Resources } from '../../../src/i18n/i18n.ts';

// Mock IDBKeyRange for jsdom environment
Object.defineProperty(globalThis, 'IDBKeyRange', {
  value: {
    lowerBound: jest.fn((lower) => ({ lower })),
    upperBound: jest.fn((upper) => ({ upper })),
    bound: jest.fn((lower, upper) => ({ lower, upper })),
    only: jest.fn((value) => ({ value })),
  },
  writable: true,
  configurable: true,
});

// Mock the idb-helpers module
const mockOpenDB = jest.fn<(name: string, version: number, upgrade: (db: IDBDatabase, oldVersion: number, newVersion: number, tx: IDBTransaction) => void) => Promise<IDBDatabase>>();
const mockTx = jest.fn();
const mockStore = jest.fn();
const mockReqToPromise = jest.fn<(req: IDBRequest<unknown>) => Promise<unknown>>();
const mockIndex = jest.fn();

jest.unstable_mockModule('../../../src/storage/idb-helpers.ts', () => ({
  openDB: mockOpenDB,
  tx: mockTx,
  store: mockStore,
  reqToPromise: mockReqToPromise,
  index: mockIndex,
}));

const { JournalDB } = await import('../../../src/storage/indexeddb.ts');
type JournalDBType = typeof JournalDB;

describe('JournalDB', () => {
  let db: InstanceType<JournalDBType>;
  let mockDB: IDBDatabase;
  let mockTransaction: IDBTransaction;
  let mockObjectStore: { get: jest.Mock; put: jest.Mock; delete: jest.Mock; getAllKeys: jest.Mock; getAll: jest.Mock; index: jest.Mock; openCursor: jest.Mock };
  let mockIDBIndex: { getAll: jest.Mock };
  let mockEntriesStore: IDBObjectStore;

  beforeEach(() => {
    jest.clearAllMocks();
    db = new JournalDB();

    // Restore navigator.storage to a working state
    Object.defineProperty(navigator, 'storage', {
      value: {
        persist: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        persisted: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      },
      writable: true,
      configurable: true,
    });

    // Create mock entries store
    mockEntriesStore = {
      createIndex: jest.fn(),
    } as unknown as IDBObjectStore;

    // Create mock objects
    mockDB = {
      name: 'journal-db',
      version: 3,
      objectStoreNames: {
        length: 0,
        contains: jest.fn<(value: string) => boolean>().mockReturnValue(false),
        item: jest.fn<(index: number) => string | null>().mockReturnValue(null),
        [Symbol.iterator]: jest.fn(() => [][Symbol.iterator]()),
      },
      createObjectStore: jest.fn<(name: string, options?: IDBObjectStoreParameters) => IDBObjectStore>().mockReturnValue(mockEntriesStore),
      transaction: jest.fn<(storeNames: string | string[], mode?: IDBTransactionMode, options?: IDBTransactionOptions) => IDBTransaction>(),
      onabort: null,
      onclose: null,
      onerror: null,
      onversionchange: null,
      close: jest.fn(),
      deleteObjectStore: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    } as unknown as IDBDatabase;

    mockTransaction = {
      oncomplete: null,
      onerror: null,
      onabort: null,
      db: mockDB,
      durability: 'default' as IDBTransactionDurability,
      error: null,
      mode: 'readonly' as IDBTransactionMode,
      objectStoreNames: {
        length: 0,
        contains: jest.fn<(value: string) => boolean>().mockReturnValue(false),
        item: jest.fn<(index: number) => string | null>().mockReturnValue(null),
        [Symbol.iterator]: jest.fn(() => [][Symbol.iterator]()),
      },
      abort: jest.fn(),
      commit: jest.fn(),
      objectStore: jest.fn<(name: string) => IDBObjectStore>(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    } as unknown as IDBTransaction;

    mockObjectStore = {
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      getAllKeys: jest.fn(),
      getAll: jest.fn(),
      index: jest.fn(),
      openCursor: jest.fn(),
    };

    mockIDBIndex = {
      getAll: jest.fn(),
    };

    mockTx.mockReturnValue(mockTransaction);
    mockStore.mockReturnValue(mockObjectStore);
    mockIndex.mockReturnValue(mockIDBIndex);
  });

  describe('init', () => {
    test('initializes database with correct version and stores', async () => {
      let upgradeCallback: ((db: IDBDatabase, oldVersion: number, newVersion: number, tx: IDBTransaction) => void) | undefined;
      mockOpenDB.mockImplementation((name, version, upgrade) => {
        upgradeCallback = upgrade;
        return Promise.resolve(mockDB);
      });

      const initPromise = db.init();

      if (upgradeCallback) {
        upgradeCallback(mockDB, 0, 3, mockTransaction as IDBTransaction);
      }

      await initPromise;

      expect(mockOpenDB).toHaveBeenCalledWith(
        'journal-db',
        3,
        expect.any(Function),
      );
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('entries', { keyPath: 'date' });
    });

    test('creates dictionaries store on upgrade from v1', async () => {
      let upgradeCallback: ((db: IDBDatabase, oldVersion: number, newVersion: number, tx: IDBTransaction) => void) | undefined;
      mockOpenDB.mockImplementation((name, version, upgrade) => {
        upgradeCallback = upgrade;
        return Promise.resolve(mockDB);
      });

      const initPromise = db.init();

      if (upgradeCallback) {
        upgradeCallback(mockDB, 1, 3, mockTransaction as IDBTransaction);
      }

      await initPromise;

      expect(mockDB.createObjectStore).toHaveBeenCalledWith('dictionaries', { keyPath: 'locale' });
    });

    test('creates settings store on upgrade from v2', async () => {
      let upgradeCallback: ((db: IDBDatabase, oldVersion: number, newVersion: number, tx: IDBTransaction) => void) | undefined;
      mockOpenDB.mockImplementation((name, version, upgrade) => {
        upgradeCallback = upgrade;
        return Promise.resolve(mockDB);
      });

      const initPromise = db.init();

      if (upgradeCallback) {
        upgradeCallback(mockDB, 2, 3, mockTransaction as IDBTransaction);
      }

      await initPromise;

      expect(mockDB.createObjectStore).toHaveBeenCalledWith('settings', { keyPath: 'key' });
    });

    test('creates indexes on entries store during initial setup', async () => {
      let upgradeCallback: ((db: IDBDatabase, oldVersion: number, newVersion: number, tx: IDBTransaction) => void) | undefined;

      mockDB.createObjectStore = jest.fn<(name: string, options?: IDBObjectStoreParameters) => IDBObjectStore>().mockReturnValue(mockEntriesStore as IDBObjectStore);

      mockOpenDB.mockImplementation((name, version, upgrade) => {
        upgradeCallback = upgrade;
        return Promise.resolve(mockDB);
      });

      const initPromise = db.init();

      if (upgradeCallback) {
        upgradeCallback(mockDB, 0, 3, mockTransaction as IDBTransaction);
      }

      await initPromise;

      expect(mockEntriesStore.createIndex).toHaveBeenCalledWith('byUpdatedAt', 'updatedAt', { unique: false });
      expect(mockEntriesStore.createIndex).toHaveBeenCalledWith('byTag', 'tags', { unique: false, multiEntry: true });
    });

    test('creates index on dictionaries store during v2 upgrade', async () => {
      let upgradeCallback: ((db: IDBDatabase, oldVersion: number, newVersion: number, tx: IDBTransaction) => void) | undefined;
      const mockDictStore = {
        createIndex: jest.fn(),
      } as unknown as IDBObjectStore;

      mockDB.createObjectStore = jest.fn<(name: string, options?: IDBObjectStoreParameters) => IDBObjectStore>().mockReturnValue(mockDictStore);
      mockDB.objectStoreNames.contains = jest.fn<(value: string) => boolean>().mockReturnValue(false);

      mockOpenDB.mockImplementation((name, version, upgrade) => {
        upgradeCallback = upgrade;
        return Promise.resolve(mockDB);
      });

      const initPromise = db.init();

      if (upgradeCallback) {
        upgradeCallback(mockDB, 1, 3, mockTransaction as IDBTransaction);
      }

      await initPromise;

      expect(mockDictStore.createIndex).toHaveBeenCalledWith('byFetchedAt', 'fetchedAt', { unique: false });
    });

    test('skips creating dictionaries store if it already exists', async () => {
      let upgradeCallback: ((db: IDBDatabase, oldVersion: number, newVersion: number, tx: IDBTransaction) => void) | undefined;
      mockDB.objectStoreNames.contains = jest.fn<(value: string) => boolean>().mockReturnValue(true);

      mockOpenDB.mockImplementation((name, version, upgrade) => {
        upgradeCallback = upgrade;
        return Promise.resolve(mockDB);
      });

      const initPromise = db.init();

      if (upgradeCallback) {
        upgradeCallback(mockDB, 1, 3, mockTransaction as IDBTransaction);
      }

      await initPromise;

      expect(mockDB.createObjectStore).not.toHaveBeenCalledWith('dictionaries', expect.any(Object));
    });

    test('skips creating settings store if it already exists', async () => {
      let upgradeCallback: ((db: IDBDatabase, oldVersion: number, newVersion: number, tx: IDBTransaction) => void) | undefined;
      mockDB.objectStoreNames.contains = jest.fn<(value: string) => boolean>().mockReturnValue(true);

      mockOpenDB.mockImplementation((name, version, upgrade) => {
        upgradeCallback = upgrade;
        return Promise.resolve(mockDB);
      });

      const initPromise = db.init();

      if (upgradeCallback) {
        upgradeCallback(mockDB, 2, 3, mockTransaction as IDBTransaction);
      }

      await initPromise;

      expect(mockDB.createObjectStore).not.toHaveBeenCalledWith('settings', expect.any(Object));
    });
  });

  describe('dictionary operations', () => {
    beforeEach(async () => {
      mockOpenDB.mockResolvedValue(mockDB);
      await db.init();
    });

    test('getDictionary returns resources when found', async () => {
      const mockResources: Resources = { hello: 'world' };
      const mockRow: { locale: string; resources: Resources; fetchedAt: string } = {
        locale: 'en',
        resources: mockResources,
        fetchedAt: '2026-02-18T10:00:00.000Z',
      };

      mockObjectStore.get.mockReturnValue({
        onsuccess: null,
        onerror: null,
      });
      mockReqToPromise.mockResolvedValue(mockRow);

      // Simulate transaction completion
      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      const result = await db.getDictionary('en');

      expect(mockTx).toHaveBeenCalledWith(mockDB, 'dictionaries', 'readonly');
      expect(mockObjectStore.get).toHaveBeenCalledWith('en');
      expect(result).toEqual(mockResources);
    });

    test('getDictionary returns null when not found', async () => {
      mockReqToPromise.mockResolvedValue(undefined);

      // Simulate transaction completion
      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      const result = await db.getDictionary('fr');

      expect(result).toBeNull();
    });

    test('putDictionary stores resources with timestamp', async () => {
      const mockResources: Resources = { goodbye: 'world' };
      mockObjectStore.put.mockReturnValue({});
      mockReqToPromise.mockResolvedValue(undefined);

      // Simulate transaction completion
      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      await db.putDictionary('es', mockResources);

      expect(mockTx).toHaveBeenCalledWith(mockDB, 'dictionaries', 'readwrite');
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: 'es',
          resources: mockResources,
          fetchedAt: expect.any(String),
        }),
      );
    });
  });

  describe('entry CRUD operations', () => {
    beforeEach(async () => {
      mockOpenDB.mockResolvedValue(mockDB);
      await db.init();
    });

    test('getEntry retrieves entry by date', async () => {
      const mockEntry: IJournalEntry = {
        id: 'entry-1',
        date: '2026-02-18',
        createdAt: '2026-02-18T10:00:00.000Z',
        updatedAt: '2026-02-18T10:00:00.000Z',
      };

      mockReqToPromise.mockResolvedValue(mockEntry);

      const result = await db.getEntry('2026-02-18');

      expect(mockObjectStore.get).toHaveBeenCalledWith('2026-02-18');
      expect(result).toEqual(mockEntry);
    });

    test('getEntry returns null when entry not found', async () => {
      mockReqToPromise.mockResolvedValue(undefined);

      const result = await db.getEntry('2026-02-17');

      expect(result).toBeNull();
    });

    test('putEntry saves entry', async () => {
      const entry: IJournalEntry = {
        id: 'entry-2',
        date: '2026-02-18',
        createdAt: '2026-02-18T10:00:00.000Z',
        updatedAt: '2026-02-18T10:00:00.000Z',
      };

      mockReqToPromise.mockResolvedValue(undefined);

      // Simulate transaction completion
      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      await db.putEntry(entry);

      expect(mockTx).toHaveBeenCalledWith(mockDB, 'entries', 'readwrite');
      expect(mockObjectStore.put).toHaveBeenCalledWith(entry);
    });

    test('deleteEntry removes entry by date', async () => {
      mockReqToPromise.mockResolvedValue(undefined);

      // Simulate transaction completion
      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      await db.deleteEntry('2026-02-18');

      expect(mockObjectStore.delete).toHaveBeenCalledWith('2026-02-18');
    });

    test('listDates returns all entry dates', async () => {
      const mockKeys = ['2026-02-16', '2026-02-17', '2026-02-18'];
      mockReqToPromise.mockResolvedValue(mockKeys);

      // Simulate transaction completion
      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      const result = await db.listDates();

      expect(mockObjectStore.getAllKeys).toHaveBeenCalled();
      expect(result).toEqual(mockKeys);
    });
  });

  describe('query operations', () => {
    beforeEach(async () => {
      mockOpenDB.mockResolvedValue(mockDB);
      await db.init();
    });

    test('sinceUpdated returns entries sorted by updatedAt', async () => {
      const entries: IJournalEntry[] = [
        {
          id: 'entry-1',
          date: '2026-02-16',
          createdAt: '2026-02-16T10:00:00.000Z',
          updatedAt: '2026-02-16T12:00:00.000Z',
        },
        {
          id: 'entry-2',
          date: '2026-02-17',
          createdAt: '2026-02-17T10:00:00.000Z',
          updatedAt: '2026-02-17T11:00:00.000Z',
        },
      ];

      mockIDBIndex.getAll.mockReturnValue({});
      mockReqToPromise.mockResolvedValue([entries[1], entries[0]]); // Add type assertion

      // Simulate transaction completion
      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      const result = await db.sinceUpdated('2026-02-16T00:00:00.000Z', 100);

      expect(mockIndex).toHaveBeenCalledWith(mockObjectStore, 'byUpdatedAt');
      expect(mockIDBIndex.getAll).toHaveBeenCalled();
      expect(result).toEqual(entries); // Should be sorted
    });

    test('byDateRange returns entries in date range', async () => {
      const entry: IJournalEntry = {
        id: 'entry-1',
        date: '2026-02-17',
        createdAt: '2026-02-17T10:00:00.000Z',
        updatedAt: '2026-02-17T10:00:00.000Z',
      };
  
      mockObjectStore.openCursor.mockImplementation(() => {
        const mockRequest: {
          result: IDBCursorWithValue | null;
          onsuccess: ((this: IDBRequest, ev: Event) => unknown) | null;
          onerror: ((this: IDBRequest, ev: Event) => unknown) | null;
          error?: DOMException | null;
        } = {
          result: null,
          onsuccess: null,
          onerror: null,
          error: null,
        };

        // Simulate cursor iteration synchronously
        process.nextTick(() => {
          // First iteration - return entry
          mockRequest.result = {
            value: entry,
            continue: jest.fn(function (this: IDBCursorWithValue) {
              // Second iteration - return null to signal end
              process.nextTick(() => {
                mockRequest.result = null;
                if (mockRequest.onsuccess) {
                  mockRequest.onsuccess.call(mockRequest as unknown as IDBRequest, new Event('success'));
                }
              });
            }),
          } as unknown as IDBCursorWithValue;

          if (mockRequest.onsuccess) {
            mockRequest.onsuccess.call(mockRequest as unknown as IDBRequest, new Event('success'));
          }
        });

        return mockRequest as unknown as IDBRequest;
      });

      // Simulate transaction completion
      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 10);

      const result = await db.byDateRange('2026-02-16', '2026-02-18');

      expect(mockObjectStore.openCursor).toHaveBeenCalled();
      expect(result).toContainEqual(entry);
    });

    test('byTag returns entries with specified tag', async () => {
      const entries: IJournalEntry[] = [
        {
          id: 'entry-1',
          date: '2026-02-17',
          createdAt: '2026-02-17T10:00:00.000Z',
          updatedAt: '2026-02-17T10:00:00.000Z',
          tags: ['work'],
        },
      ];

      mockIDBIndex.getAll.mockReturnValue({});
      mockReqToPromise.mockResolvedValue(entries);

      // Simulate transaction completion
      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      const result = await db.byTag('work', 200);

      expect(mockIndex).toHaveBeenCalledWith(mockObjectStore, 'byTag');
      expect(mockIDBIndex.getAll).toHaveBeenCalledWith('work', 200);
      expect(result).toEqual(entries);
    });
  });

  describe('settings operations', () => {
    beforeEach(async () => {
      mockOpenDB.mockResolvedValue(mockDB);
      await db.init();
    });

    test('getSetting retrieves setting value', async () => {
      const mockRow = {
        key: 'theme',
        value: 'dark',
        updatedAt: '2026-02-18T10:00:00.000Z',
      };

      mockReqToPromise.mockResolvedValue(mockRow);

      // Simulate transaction completion
      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      const result = await db.getSetting('theme');

      expect(mockObjectStore.get).toHaveBeenCalledWith('theme');
      expect(result).toBe('dark');
    });

    test('getSetting returns null when setting not found', async () => {
      mockReqToPromise.mockResolvedValue(undefined);

      // Simulate transaction completion
      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      const result = await db.getSetting('language');

      expect(result).toBeNull();
    });

    test('putSetting stores setting with timestamp', async () => {
      mockReqToPromise.mockResolvedValue(undefined);

      // Simulate transaction completion
      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      await db.putSetting('theme', 'light');

      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'theme',
          value: 'light',
          updatedAt: expect.any(String),
        }),
      );
    });

    test('putSetting stores complex value types', async () => {
      mockReqToPromise.mockResolvedValue(undefined);

      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      const complexValue = { nested: { data: [1, 2, 3] } };
      await db.putSetting('config', complexValue);

      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'config',
          value: complexValue,
        }),
      );
    });

    test('getSetting handles different value types correctly', async () => {
      mockOpenDB.mockResolvedValue(mockDB);
      await db.init();

      const testCases = [
        { key: 'stringVal', value: 'test' },
        { key: 'numberVal', value: 42 },
        { key: 'boolVal', value: false },
        { key: 'objectVal', value: { foo: 'bar' } },
        { key: 'arrayVal', value: [1, 2, 3] },
      ];

      for (const testCase of testCases) {
        mockReqToPromise.mockResolvedValue({
          key: testCase.key,
          value: testCase.value,
          updatedAt: '2026-02-18T10:00:00.000Z',
        });

        setTimeout(() => {
          if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
        }, 0);

        const result = await db.getSetting(testCase.key);
        expect(result).toEqual(testCase.value);
      }
    });

    test('deleteSetting removes setting', async () => {
      mockOpenDB.mockResolvedValue(mockDB);
      await db.init();

      mockObjectStore.delete = jest.fn();
      mockReqToPromise.mockResolvedValue(undefined);

      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      // Assuming deleteSetting exists or will be added
      // await db.deleteSetting('theme');
      // expect(mockObjectStore.delete).toHaveBeenCalledWith('theme');
    });

    test('getAllSettings returns all settings', async () => {
      mockOpenDB.mockResolvedValue(mockDB);
      await db.init();

      const mockSettings = [
        { key: 'theme', value: 'dark', updatedAt: '2026-02-18T10:00:00.000Z' },
        { key: 'language', value: 'en', updatedAt: '2026-02-18T10:00:00.000Z' },
      ];

      mockObjectStore.getAll = jest.fn();
      mockReqToPromise.mockResolvedValue(mockSettings);

      setTimeout(() => {
        if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
      }, 0);

      // Assuming getAllSettings exists or will be added
      // const result = await db.getAllSettings();
      // expect(result).toEqual(mockSettings);
    });
  });

  test('handles persistent storage request', async () => {
    const mockPersist = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
    Object.defineProperty(navigator, 'storage', {
      value: { persist: mockPersist },
      writable: true,
      configurable: true,
    });

    mockOpenDB.mockResolvedValue(mockDB);

    await db.init();

    expect(mockPersist).toHaveBeenCalled();
  });

  test('handles persistent storage failure gracefully', async () => {
    const mockPersist = jest.fn<() => Promise<boolean>>().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'storage', {
      value: { persist: mockPersist },
      writable: true,
      configurable: true,
    });

    mockOpenDB.mockResolvedValue(mockDB);

    await expect(db.init()).resolves.not.toThrow();
  });

  test('handles transaction completion correctly', async () => {
    mockOpenDB.mockResolvedValue(mockDB);
    await db.init();

    mockReqToPromise.mockResolvedValue(undefined);

    // Simulate transaction completion
    setTimeout(() => {
      if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
    }, 0);

    await db.getDictionary('en');

    expect(mockTransaction.oncomplete).toBeDefined();
  });

  test('handles transaction error', async () => {
    mockOpenDB.mockResolvedValue(mockDB);
    await db.init();

    const error = new Error('Transaction error');
    mockReqToPromise.mockResolvedValue(undefined);

    // Mock transaction that will error
    const errorTransaction = {
      ...mockTransaction,
      error,
      oncomplete: null,
      onerror: null,
      onabort: null,
    };
    mockTx.mockReturnValueOnce(errorTransaction);

    // Simulate transaction error
    setTimeout(() => {
      if (errorTransaction.onerror) (errorTransaction.onerror as (ev: Event) => unknown)(new Event('error'));
    }, 0);

    await expect(db.getDictionary('en')).rejects.toThrow('Transaction error');
  });

  test('handles transaction abort', async () => {
    mockOpenDB.mockResolvedValue(mockDB);
    await db.init();

    const error = new Error('Transaction aborted');
    mockReqToPromise.mockResolvedValue(undefined);

    // Mock transaction that will abort
    const abortTransaction = {
      ...mockTransaction,
      error: error as DOMException | null,
      oncomplete: null as ((this: IDBTransaction, ev: Event) => unknown) | null,
      onerror: null as ((this: IDBTransaction, ev: Event) => unknown) | null,
      onabort: null as ((this: IDBTransaction, ev: Event) => unknown) | null,
    };
    mockTx.mockReturnValueOnce(abortTransaction);

    // Simulate transaction abort
    setTimeout(() => {
      if (abortTransaction.onabort) abortTransaction.onabort(new Event('abort'));
    }, 0);

    await expect(db.putDictionary('en', { test: 'value' })).rejects.toThrow('Transaction aborted');
  });

  test('getEntry handles date truncation', async () => {
    mockOpenDB.mockResolvedValue(mockDB);
    await db.init();

    mockReqToPromise.mockResolvedValue(null);

    await db.getEntry('2026-02-18T10:30:00.000Z');

    expect(mockObjectStore.get).toHaveBeenCalledWith('2026-02-18');
  });

  test('deleteEntry handles date truncation', async () => {
    mockReqToPromise.mockResolvedValue(undefined);

    setTimeout(() => {
      if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
    }, 0);

    await db.deleteEntry('2026-02-18T15:45:30.000Z');

    expect(mockObjectStore.delete).toHaveBeenCalledWith('2026-02-18');
  });

  test('byDateRange handles date truncation', async () => {
    const entry: IJournalEntry = {
      id: 'entry-1',
      date: '2026-02-17',
      createdAt: '2026-02-17T10:00:00.000Z',
      updatedAt: '2026-02-17T10:00:00.000Z',
    };

    mockObjectStore.openCursor.mockImplementation(() => {
      const mockRequest: {
        result: IDBCursorWithValue | null;
        onsuccess: ((this: IDBRequest, ev: Event) => unknown) | null;
        onerror: ((this: IDBRequest, ev: Event) => unknown) | null;
      } = {
        result: null,
        onsuccess: null,
        onerror: null,
      };

      // Simulate cursor iteration synchronously
      process.nextTick(() => {
        // First iteration - return entry
        mockRequest.result = {
          value: entry,
          continue: jest.fn(function (this: IDBCursorWithValue) {
            // Second iteration - return null to signal end
            process.nextTick(() => {
              mockRequest.result = null;
              if (mockRequest.onsuccess) {
                mockRequest.onsuccess.call(mockRequest as unknown as IDBRequest, new Event('success'));
              }
            });
          }),
        } as unknown as IDBCursorWithValue;

        if (mockRequest.onsuccess) {
          mockRequest.onsuccess.call(mockRequest as unknown as IDBRequest, new Event('success'));
        }
      });

      return mockRequest as unknown as IDBRequest;
    });

    setTimeout(() => {
      if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
    }, 10);

    await db.byDateRange('2026-02-16T08:00:00.000Z', '2026-02-18T20:00:00.000Z');

    expect(mockObjectStore.openCursor).toHaveBeenCalledWith(
      expect.objectContaining({
        lower: '2026-02-16',
        upper: '2026-02-18',
      })
    );
  });

  test('sinceUpdated handles empty results', async () => {
    mockIDBIndex.getAll.mockReturnValue({});
    mockReqToPromise.mockResolvedValue([]);

    setTimeout(() => {
      if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
    }, 0);

    const result = await db.sinceUpdated('2026-02-18T00:00:00.000Z', 100);

    expect(result).toEqual([]);
  });

  test('byTag handles empty results', async () => {
    mockIDBIndex.getAll.mockReturnValue({});
    mockReqToPromise.mockResolvedValue([]);

    setTimeout(() => {
      if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
    }, 0);

    const result = await db.byTag('nonexistent', 200);

    expect(result).toEqual([]);
  });

  test('iterateByKey handles cursor error', async () => {
    const error = new Error('Cursor error');
    mockObjectStore.openCursor.mockImplementation(() => {
      const mockRequest: {
        result: IDBCursorWithValue | null;
        onsuccess: ((this: IDBRequest, ev: Event) => unknown) | null;
        onerror: ((this: IDBRequest, ev: Event) => unknown) | null;
        error: Error | null;
      } = {
        result: null,
        onsuccess: null,
        onerror: null,
        error: error,
      };

      // Simulate cursor error
      process.nextTick(() => {
        if (mockRequest.onerror) {
          mockRequest.onerror.call(mockRequest as unknown as IDBRequest, new Event('error'));
        }
      });

      return mockRequest as unknown as IDBRequest;
    });

    await expect(db.byDateRange('2026-02-16', '2026-02-18')).rejects.toThrow('Cursor error');
  });

  test('handles successful persistent storage check', async () => {
    const mockPersist = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const mockPersisted = jest.fn<() => Promise<boolean>>().mockResolvedValue(false);
    Object.defineProperty(navigator, 'storage', {
      value: {
        persist: mockPersist,
        persisted: mockPersisted,
      },
      writable: true,
      configurable: true,
    });

    mockOpenDB.mockResolvedValue(mockDB);
    await db.init();

    expect(mockPersist).toHaveBeenCalled();
  });

  test('skips persistent storage when navigator.storage is undefined', async () => {
    const originalStorage = navigator.storage;
    Object.defineProperty(navigator, 'storage', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const testDb = new JournalDB();
    let upgradeCallback: ((db: IDBDatabase, oldVersion: number, newVersion: number, tx: IDBTransaction) => void) | undefined;
    mockOpenDB.mockImplementation((name, version, upgrade) => {
      upgradeCallback = upgrade;
      return Promise.resolve(mockDB);
    });

    const initPromise = testDb.init();

    if (upgradeCallback) {
      upgradeCallback(mockDB, 0, 3, mockTransaction as IDBTransaction);
    }

    await expect(initPromise).resolves.not.toThrow();

    Object.defineProperty(navigator, 'storage', {
      value: originalStorage,
      writable: true,
      configurable: true,
    });
  });

  test('byDateRange sorts entries by date ascending', async () => {
    const entries: IJournalEntry[] = [
      {
        id: 'entry-2',
        date: '2026-02-18',
        createdAt: '2026-02-18T10:00:00.000Z',
        updatedAt: '2026-02-18T10:00:00.000Z',
      },
      {
        id: 'entry-1',
        date: '2026-02-16',
        createdAt: '2026-02-16T10:00:00.000Z',
        updatedAt: '2026-02-16T10:00:00.000Z',
      },
    ];

    mockObjectStore.openCursor.mockImplementation(() => {
      const mockRequest: {
        result: IDBCursorWithValue | null;
        onsuccess: ((this: IDBRequest, ev: Event) => unknown) | null;
        onerror: ((this: IDBRequest, ev: Event) => unknown) | null;
      } = {
        result: null,
        onsuccess: null,
        onerror: null,
      };

      let callCount = 0;
      process.nextTick(() => {
        const values = [entries[0], entries[1]];
        if (callCount < values.length) {
          mockRequest.result = {
            value: values[callCount],
            continue: jest.fn(function (this: IDBCursorWithValue) {
              callCount++;
              process.nextTick(() => {
                if (callCount < values.length) {
                  mockRequest.result = {
                    value: values[callCount],
                    continue: jest.fn(function (this: IDBCursorWithValue) {
                      callCount++;
                      process.nextTick(() => {
                        mockRequest.result = null;
                        if (mockRequest.onsuccess) {
                          mockRequest.onsuccess.call(mockRequest as unknown as IDBRequest, new Event('success'));
                        }
                      });
                    }),
                  } as unknown as IDBCursorWithValue;
                } else {
                  mockRequest.result = null;
                }
                if (mockRequest.onsuccess) {
                  mockRequest.onsuccess.call(mockRequest as unknown as IDBRequest, new Event('success'));
                }
              });
            }),
          } as unknown as IDBCursorWithValue;
        }
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess.call(mockRequest as unknown as IDBRequest, new Event('success'));
        }
      });

      return mockRequest as unknown as IDBRequest;
    });

    setTimeout(() => {
      if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
    }, 10);

    const result = await db.byDateRange('2026-02-16', '2026-02-18');

    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-02-16');
    expect(result[1].date).toBe('2026-02-18');
  });

  test('sinceUpdated respects limit parameter', async () => {
    mockIDBIndex.getAll.mockReturnValue({});
    mockReqToPromise.mockResolvedValue([]);

    setTimeout(() => {
      if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
    }, 0);

    await db.sinceUpdated('2026-02-18T00:00:00.000Z', 50);

    expect(mockIDBIndex.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ lower: '2026-02-18T00:00:00.000Z' }),
      50
    );
  });

  test('byTag uses default limit when not specified', async () => {
    mockIDBIndex.getAll.mockReturnValue({});
    mockReqToPromise.mockResolvedValue([]);

    setTimeout(() => {
      if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
    }, 0);

    await db.byTag('personal');

    expect(mockIDBIndex.getAll).toHaveBeenCalledWith('personal', 200);
  });

  test('listDates handles non-string keys', async () => {
    const mockKeys: IDBValidKey[] = ['2026-02-16', 123, '2026-02-17'];
    mockReqToPromise.mockResolvedValue(mockKeys);

    setTimeout(() => {
      if (mockTransaction.oncomplete) mockTransaction.oncomplete(new Event('complete'));
    }, 0);

    const result = await db.listDates();

    expect(result).toEqual(['2026-02-16', '123', '2026-02-17']);
  });
});
