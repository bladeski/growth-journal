import { IJournalEntry } from '../models/index.ts';
import { JournalDB } from './indexeddb.ts';
import * as local from './local.ts';

export interface StoragePort {
  init(): Promise<void>;
  getEntry(dateISO: string): Promise<IJournalEntry | null>;
  saveEntry(entry: IJournalEntry): Promise<void>;
  deleteEntry(dateISO: string): Promise<void>;
  listDates(): Promise<string[]>;
  sinceUpdated(updatedAtISO: string, limit?: number): Promise<IJournalEntry[]>;
  byDateRange(startISO: string, endISO: string): Promise<IJournalEntry[]>;
  byTag(tag: string, limit?: number): Promise<IJournalEntry[]>;
}

class IndexedDBAdapter implements StoragePort {
  private db = new JournalDB();
  async init() {
    await this.db.init();
  }
  getEntry(date: string) {
    return this.db.getEntry(date);
  }
  async saveEntry(entry: IJournalEntry) {
    await this.db.putEntry(entry);
  }
  async deleteEntry(date: string) {
    await this.db.deleteEntry(date);
  }
  listDates() {
    return this.db.listDates();
  }
  sinceUpdated(since: string, limit?: number) {
    return this.db.sinceUpdated(since, limit);
  }
  byDateRange(s: string, e: string) {
    return this.db.byDateRange(s, e);
  }
  byTag(tag: string, limit?: number) {
    return this.db.byTag(tag, limit);
  }
}

class LocalStorageAdapter implements StoragePort {
  async init() {
    /* no-op */
  }
  async getEntry(date: string) {
    return local.loadEntry(date);
  }
  async saveEntry(entry: IJournalEntry) {
    local.saveEntry(entry);
  }
  async deleteEntry(date: string) {
    local.removeEntry?.(date);
  }
  async listDates() {
    return local.listDates();
  }
  async sinceUpdated(since: string) {
    // naive fallback
    const dates = await this.listDates();
    const entries = await Promise.all(dates.map((d) => this.getEntry(d)));
    return (entries.filter(Boolean) as IJournalEntry[])
      .filter((e) => e.updatedAt >= since)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }
  async byDateRange(start: string, end: string) {
    const dates = (await this.listDates()).filter(
      (d) => d >= start.slice(0, 10) && d <= end.slice(0, 10)
    );
    const entries = await Promise.all(dates.map((d) => this.getEntry(d)));
    return (entries.filter(Boolean) as IJournalEntry[]).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }
  async byTag(tag: string) {
    const dates = await this.listDates();
    const entries = await Promise.all(dates.map((d) => this.getEntry(d)));
    return entries.filter((e) => e?.tags?.includes(tag)) as IJournalEntry[];
  }
}

export async function createStorage(): Promise<StoragePort> {
  if (typeof indexedDB !== 'undefined') {
    const s = new IndexedDBAdapter();
    await s.init();
    return s;
  }
  const s = new LocalStorageAdapter();
  await s.init();
  return s;
}
``;
