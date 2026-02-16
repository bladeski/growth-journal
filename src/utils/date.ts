export function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
