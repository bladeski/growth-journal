// i18n.ts
export type MsgKey = string;

export type Resources = Record<MsgKey, string>;

export interface I18n {
  locale: string; // e.g., 'en-GB'
  resources: Resources; // message dictionary for locale
  fallback?: I18n | null; // optional chained fallback (e.g., en → en-GB)
}

/**
 * Simple template formatter: "Hello {name}" + { name: "Jon" }.
 */
export function format(msg: string, vars?: Record<string, string | number>): string {
  if (!vars) return msg;
  return msg.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/**
 * Resolve a key through resource chain, with optional interpolation.
 */
export function t(i18n: I18n, key: MsgKey, vars?: Record<string, string | number>): string {
  let cursor: I18n | undefined | null = i18n;
  while (cursor) {
    const raw = cursor.resources[key];
    if (raw != null) return format(raw, vars);
    cursor = cursor.fallback;
  }
  // Fallback to key if missing (helps spot missing translations during dev)
  return format(key, vars);
}
