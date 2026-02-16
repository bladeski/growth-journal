import { IJournalEntry } from '../models/index.ts';

const prefix = 'journal:';

export function keyFor(dateISO: string) {
  return `${prefix}${dateISO.slice(0, 10)}`;
}

export function loadEntry(dateISO: string): IJournalEntry | null {
  const raw = localStorage.getItem(keyFor(dateISO));
  return raw ? (JSON.parse(raw) as IJournalEntry) : null;
}

export function saveEntry(entry: IJournalEntry) {
  localStorage.setItem(keyFor(entry.date), JSON.stringify(entry));
}

export function listDates(): string[] {
  return Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .map((k) => k.slice(prefix.length));
}

export function removeEntry(dateISO: string) {
  localStorage.removeItem(keyFor(dateISO));
}
