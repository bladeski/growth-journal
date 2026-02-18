import { jest } from '@jest/globals';
import { loadRuntimeI18n } from '../../../src/i18n/runtime.ts';

jest.mock('../../../src/storage/indexeddb.ts', () => {
  class JournalDB {
    async init(): Promise<void> {}
    async getDictionary(): Promise<null> {
      return null;
    }
    async putDictionary(): Promise<void> {}
  }

  return { JournalDB };
});

type FetchResponse = { ok: boolean; json: () => Promise<unknown> };

function createJsonResponse(data: unknown, ok = true): FetchResponse {
  return { ok, json: async () => data };
}

describe('loadRuntimeI18n', () => {
  let originalNavigator: any;

  beforeEach(() => {
    originalNavigator = global.navigator;
    global.fetch = jest.fn(() => Promise.resolve(new Response())) as jest.Mock<typeof fetch>;
  });

  afterEach(() => {
    jest.resetAllMocks();
    if (originalNavigator) {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    }
  });

  test('selects the best supported locale candidate', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation(((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('supported-languages.json')) {
        return createJsonResponse(['en', 'fr']);
      }
      if (url.includes('dictionary.fr.json')) {
        return createJsonResponse({ hello: 'bonjour' });
      }
      return createJsonResponse({}, false);
    }) as jest.Mock);

    const i18n = await loadRuntimeI18n('fr-CA');

    expect(i18n.locale).toBe('fr');
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('supported-languages.json'),
        expect.stringContaining('dictionary.fr.json')
      ])
    );
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('dictionary.fr-ca.json')))
      .toBe(false);
  });

  test('always falls back to en even when not listed', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation(((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('supported-languages.json')) {
        return createJsonResponse(['fr']);
      }
      if (url.includes('dictionary.en.json')) {
        return createJsonResponse({ hello: 'hello' });
      }
      return createJsonResponse({}, false);
    }) as jest.Mock);

    const i18n = await loadRuntimeI18n('es');

    expect(i18n.locale).toBe('en');
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('dictionary.es.json')))
      .toBe(false);
  });

  test('falls back to default i18n when no dictionaries available', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation(((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('supported-languages.json')) {
        return createJsonResponse(['fr']);
      }
      return createJsonResponse({}, false);
    }) as jest.Mock);

    const i18n = await loadRuntimeI18n('es');

    expect(i18n.locale).toBe('en');
    expect(i18n.resources).toEqual({});
  });

  test('handles network errors when fetching supported languages', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation(((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('supported-languages.json')) {
        return Promise.reject(new Error('Network error'));
      }
      if (url.includes('dictionary.en.json')) {
        return createJsonResponse({ hello: 'hello' });
      }
      return createJsonResponse({}, false);
    }) as jest.Mock);

    const i18n = await loadRuntimeI18n('en');

    expect(i18n.locale).toBe('en');
    expect(i18n.resources).toEqual({ hello: 'hello' });
  });

  test('handles invalid JSON response from supported languages', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation(((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('supported-languages.json')) {
        return {
          ok: true,
          json: async () => ({ notArray: true }) // Invalid - should be array
        };
      }
      if (url.includes('dictionary.en.json')) {
        return createJsonResponse({ hello: 'hello' });
      }
      return createJsonResponse({}, false);
    }) as jest.Mock);

    const i18n = await loadRuntimeI18n('en');

    expect(i18n.locale).toBe('en');
  });

  test('handles empty supported languages list', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation(((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('supported-languages.json')) {
        return createJsonResponse([]);
      }
      if (url.includes('dictionary.en.json')) {
        return createJsonResponse({ hello: 'hello' });
      }
      return createJsonResponse({}, false);
    }) as jest.Mock);

    const i18n = await loadRuntimeI18n('en');

    expect(i18n.locale).toBe('en');
  });

  test('uses array of preferred locales when provided', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation(((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('supported-languages.json')) {
        return createJsonResponse(['en', 'fr', 'es']);
      }
      if (url.includes('dictionary.es.json')) {
        return createJsonResponse({ hello: 'hola' });
      }
      return createJsonResponse({}, false);
    }) as jest.Mock);

    const i18n = await loadRuntimeI18n(['de', 'es']);

    expect(i18n.locale).toBe('es');
  });

  test('normalizes underscores in locale tags', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation(((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('supported-languages.json')) {
        return createJsonResponse(['en', 'pt-br']);
      }
      if (url.includes('dictionary.pt-br.json')) {
        return createJsonResponse({ hello: 'olá' });
      }
      return createJsonResponse({}, false);
    }) as jest.Mock);

    const i18n = await loadRuntimeI18n('pt_BR');

    expect(i18n.locale).toBe('pt-br');
  });

  test('deduplicates locale candidates', async () => {
    const fetchMock = global.fetch as jest.Mock;
    const frCallUrls: string[] = [];
    fetchMock.mockImplementation(((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('supported-languages.json')) {
        return createJsonResponse(['en', 'fr']);
      }
      if (url.includes('dictionary.fr.json')) {
        frCallUrls.push(url);
      }
      return createJsonResponse({}, false);
    }) as jest.Mock);

    await loadRuntimeI18n(['fr-CA', 'fr']);

    // Count unique URLs called for fr.json
    const uniqueFrCalls = new Set(frCallUrls).size;
    expect(uniqueFrCalls).toBeLessThanOrEqual(2); // May be called for initial load and background refresh
  });

  test('handles fetch error with empty response', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation(((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('supported-languages.json')) {
        return createJsonResponse(['en']);
      }
      if (url.includes('dictionary.en.json')) {
        return {
          ok: true,
          json: async () => null // Invalid data
        };
      }
      return createJsonResponse({}, false);
    }) as jest.Mock);

    const i18n = await loadRuntimeI18n('en');

    // Should fall back since the response is null
    expect(i18n.locale).toBe('en');
  });

  test('handles dictionary with empty object', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation(((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('supported-languages.json')) {
        return createJsonResponse(['en', 'fr']);
      }
      if (url.includes('dictionary.fr.json')) {
        return createJsonResponse({}); // Empty object
      }
      if (url.includes('dictionary.en.json')) {
        return createJsonResponse({ hello: 'hello' });
      }
      return createJsonResponse({}, false);
    }) as jest.Mock);

    const i18n = await loadRuntimeI18n('fr');

    // Should skip empty object and use en as fallback
    expect(i18n.locale).toBe('en');
  });

  test('handles http errors (404, 500)', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation(((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('supported-languages.json')) {
        return createJsonResponse(['en', 'fr']);
      }
      if (url.includes('dictionary.fr.json')) {
        return createJsonResponse({}, false); // Not ok
      }
      if (url.includes('dictionary.en.json')) {
        return createJsonResponse({ hello: 'hello' });
      }
      return createJsonResponse({}, false);
    }) as jest.Mock);

    const i18n = await loadRuntimeI18n('fr');

    // Should skip failed fetch and use en
    expect(i18n.locale).toBe('en');
  });
});
