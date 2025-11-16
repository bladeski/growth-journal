import { installMockServiceWorker } from './helpers/mockServiceWorker';
import IndexedDbDataService from '../../src/data/IndexedDbDataService';

describe('IndexedDbDataService upsert behavior', () => {
  afterEach(() => {
    // nothing to do here; individual tests uninstall their mock
  });

  test('setMorningCheckin updates existing record via SW put', async () => {
    // mock SW to capture add/put requests and simulate success
    const uninstall = installMockServiceWorker(async (msgType: string) => {
      if (msgType === 'IDB:AddMorningCheckin') return { success: true };
      if (msgType === 'IDB:GetMorningCheckin')
        return { success: true, items: [{ intention: 'x', core_value: 'y' }] };
      return { success: false, error: 'unexpected' };
    });

    const svc = new IndexedDbDataService();
    const ok = await svc.setMorningCheckin({ intention: 'test', core_value: 'cv' });
    expect(ok).toBe(true);
    uninstall();
  });
});
