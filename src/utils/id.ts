export function makeId(): string {
  return crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`;
}
