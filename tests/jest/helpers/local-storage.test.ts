import { loadEntry, saveEntry, listDates, removeEntry, keyFor } from '../../../src/storage/local.ts';
import type { IJournalEntry } from '../../../src/models/index.ts';

describe('local storage adapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('saveEntry and loadEntry round trip', () => {
    const entry: IJournalEntry = {
      id: 'entry-1',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    saveEntry(entry);
    const loaded = loadEntry('2026-02-18');

    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(entry.id);
    expect(localStorage.getItem(keyFor('2026-02-18'))).not.toBeNull();
  });

  test('listDates returns stored date keys', () => {
    const entry: IJournalEntry = {
      id: 'entry-2',
      date: '2026-02-17',
      createdAt: '2026-02-17T10:00:00.000Z',
      updatedAt: '2026-02-17T10:00:00.000Z',
    };

    saveEntry(entry);

    expect(listDates()).toEqual(['2026-02-17']);
  });

  test('removeEntry clears saved entry', () => {
    const entry: IJournalEntry = {
      id: 'entry-3',
      date: '2026-02-16',
      createdAt: '2026-02-16T10:00:00.000Z',
      updatedAt: '2026-02-16T10:00:00.000Z',
    };

    saveEntry(entry);
    removeEntry('2026-02-16');

    expect(loadEntry('2026-02-16')).toBeNull();
    expect(localStorage.getItem(keyFor('2026-02-16'))).toBeNull();
  });
});
