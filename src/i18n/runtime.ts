import type { I18n, Resources } from './i18n.ts';
import { JournalDB } from '../storage/indexeddb.ts';

export const defaultI18n: I18n = { locale: 'en', resources: {}, fallback: null };

function normalizeLocaleTag(tag: string): string {
  return tag.trim().toLowerCase().replace('_', '-');
}

// Given a tag like "fr-CA", return candidates: ["fr-ca", "fr"]
function localeCandidates(tag: string): string[] {
  const n = normalizeLocaleTag(tag);
  const parts = n.split('-').filter(Boolean);
  const results: string[] = [];
  for (let i = parts.length; i >= 1; i--) {
    results.push(parts.slice(0, i).join('-'));
  }
  return results;
}

function browserPreferredLocales(): string[] {
  if (typeof navigator === 'undefined') return ['en'];
  const langs: readonly string[] =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : navigator.language
        ? [navigator.language]
        : ['en'];
  return [...langs].filter(Boolean);
}

async function fetchDictionary(locale: string): Promise<Resources | null> {
  const rel = `./data/dictionaries/dictionary.${locale}.json`;
  const relUrl =
    typeof document !== 'undefined' && document.baseURI
      ? new URL(rel, document.baseURI).toString()
      : rel;

  // Try relative first (works with Parcel publicUrl "./" and sub-path hosting),
  // then fall back to absolute for legacy/dev setups.
  const candidates = [relUrl, `/data/dictionaries/dictionary.${locale}.json`];

  for (const url of candidates) {
    try {
      const resp = await fetch(url, { cache: 'no-cache' });
      if (!resp.ok) continue;
      const data = (await resp.json()) as unknown;
      // Expect flat { [key]: string }
      if (!data || typeof data !== 'object') continue;
      const res = data as Resources;
      if (Object.keys(res).length === 0) continue;
      return res;
    } catch {
      // try next candidate
    }
  }

  return null;
}

/**
 * Resolve an I18n instance using:
 * 1) IndexedDB cached dictionary
 * 2) network fetch from /data/dictionaries/dictionary.<lang>.json
 * 3) key fallback (returns the key when missing)
 */
export async function loadRuntimeI18n(preferred?: string[] | string): Promise<I18n> {
  const preferredList = Array.isArray(preferred)
    ? preferred
    : preferred
      ? [preferred]
      : browserPreferredLocales();

  // Expand preferred locales into unique candidate tags (preserving order)
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const pref of preferredList) {
    for (const cand of localeCandidates(pref)) {
      if (!seen.has(cand)) {
        seen.add(cand);
        candidates.push(cand);
      }
    }
  }
  if (!seen.has('en')) candidates.push('en');

  // Open DB once; if it fails, proceed without caching.
  let db: JournalDB | null = null;
  try {
    db = new JournalDB();
    await db.init();
  } catch {
    db = null;
  }

  for (const locale of candidates) {
    try {
      const cached = db ? await db.getDictionary(locale) : null;
      if (cached && Object.keys(cached).length > 0) {
        // Update cache in the background on every load.
        // This keeps IndexedDB fresh when dictionary files change.
        void (async () => {
          try {
            const fetched = await fetchDictionary(locale);
            if (fetched) {
              await db?.putDictionary(locale, fetched);
            }
          } catch {
            // ignore background refresh errors
          }
        })();
        return { locale, resources: cached, fallback: defaultI18n };
      }

      const fetched = await fetchDictionary(locale);
      if (fetched) {
        try {
          await db?.putDictionary(locale, fetched);
        } catch {
          // ignore cache write errors
        }
        return { locale, resources: fetched, fallback: defaultI18n };
      }
    } catch {
      // try next candidate
    }
  }

  return defaultI18n;
}
