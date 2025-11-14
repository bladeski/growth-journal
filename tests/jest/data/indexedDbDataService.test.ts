import IndexedDbDataService from '../../../src/data/IndexedDbDataService';
import { installMockServiceWorker } from '../helpers/mockServiceWorker';

describe('IndexedDbDataService (unit)', () => {
  afterEach(() => {
    // Ensure we clean navigator.serviceWorker between tests
    if ((global as any).navigator && (global as any).navigator.serviceWorker) {
      // attempt to clear
      (global as any).navigator.serviceWorker = undefined;
    }
  });

  test('getGrowthIntentions returns items from service worker', async () => {
    const items = [
      { core_value: 'C', intention: 'I', reflection: 'R' },
      { core_value: 'X', intention: 'Y', reflection: 'Z' },
    ];

    const uninstall = installMockServiceWorker((type) => {
      if (type === 'IDB:GetGrowthIntentions') return { success: true, items };
      return { success: false, error: 'unexpected' };
    });

    const svc = new IndexedDbDataService();
    const got = await svc.getGrowthIntentions();
    expect(got).toEqual(items);

    uninstall();
  });

  test('getGrowthIntention normalizes non-string fields', async () => {
    // Return an array where some fields are objects to exercise normalization
    const raw = [
      {
        core_value: { name: 'not-a-string' },
        intention: { nested: true },
        reflection: null,
        midday_question: ['q'],
        evening_questions: { q1: 'a' },
        week_theme: 123,
        focus: {},
      },
    ];

    const uninstall = installMockServiceWorker((type) => {
      if (type === 'IDB:GetGrowthIntentions') return { success: true, items: raw };
      return { success: false, error: 'unexpected' };
    });

    const svc = new IndexedDbDataService();
  // choose a date where dayOfMonth resolves to index 0 (first day of month)
  const d = new Date();
  d.setDate(1);
  const date = d.toISOString().slice(0, 10);
    const gi = await svc.getGrowthIntention(date);
    expect(gi).not.toBeNull();
    // normalized fields should be strings (or empty) not objects
    expect(typeof gi!.core_value).toBe('string');
    expect(typeof gi!.intention).toBe('string');
    expect(typeof gi!.reflection || gi!.reflection === undefined).toBeTruthy();
    // evening_questions should be preserved as object shape
    expect(typeof gi!.evening_questions).toBe('object');

    uninstall();
  });

  test('exportDatabase returns object mapping when SW responds', async () => {
    const payload = { growthIntentions: [{ id: 1 }] };
    const uninstall = installMockServiceWorker((type) => {
      if (type === 'IDB:ExportAll') return { success: true, items: payload };
      return { success: false, error: 'unexpected' };
    });

    const svc = new IndexedDbDataService();
    const res = await svc.exportDatabase();
    expect(res).toEqual(payload as any);

    uninstall();
  });

  test('importDatabase returns true on success', async () => {
    const uninstall = installMockServiceWorker((type) => {
      if (type === 'IDB:ImportAll') return { success: true };
      return { success: false, error: 'unexpected' };
    });

    const svc = new IndexedDbDataService();
    const ok = await svc.importDatabase({ foo: [] });
    expect(ok).toBe(true);

    uninstall();
  });

  test('exportDatabase returns null when no service worker present', async () => {
    // Ensure no service worker
    (global as any).navigator = (global as any).navigator || {};
    (global as any).navigator.serviceWorker = undefined;

    const svc = new IndexedDbDataService();
    const res = await svc.exportDatabase();
    expect(res).toBeNull();
  });
});
