const { installMockServiceWorker } = require('./helpers/mockServiceWorker');
const IndexedDbDataService = require('../../src/data/IndexedDbDataService').default;

describe('IndexedDbDataService upsert behavior (js)', () => {
  test('setMorningCheckin updates existing record via SW put', async () => {
    const uninstall = installMockServiceWorker(async (type) => {
      if (type === 'IDB:AddMorningCheckin') return { success: true };
      if (type === 'IDB:GetMorningCheckin') return { success: true, items: [{ intention: 'x', core_value: 'y' }] };
      return { success: false, error: 'unexpected' };
    });

    const svc = new IndexedDbDataService();
    const ok = await svc.setMorningCheckin({ intention: 'test', core_value: 'cv' });
    expect(ok).toBe(true);
    uninstall();
  });
});
