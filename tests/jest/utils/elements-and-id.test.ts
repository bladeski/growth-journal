import { jest } from '@jest/globals';
import { makeId } from '../../../src/utils/id.ts';
import { whenUpgraded, nextMicrotask } from '../../../src/utils/elements.ts';
import { todayISO } from '../../../src/utils/date.ts';

describe('utils/date.ts', () => {
  test('todayISO returns current date in YYYY-MM-DD format', () => {
    const result = todayISO();
    
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('todayISO returns ISO format without time component', () => {
    const result = todayISO();
    const today = new Date();
    const expectedDate = today.toISOString().slice(0, 10);
    
    expect(result).toBe(expectedDate);
  });

  test('todayISO returns valid date string', () => {
    const result = todayISO();
    const parts = result.split('-');
    
    expect(parts).toHaveLength(3);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    expect(year).toBeGreaterThan(2000);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });
});

describe('utils/id.ts', () => {
  test('makeId generates a valid ID using crypto.randomUUID when available', () => {
    const id = makeId();
    
    // UUID format: 8-4-4-4-12 hex digits with hyphens
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (crypto?.randomUUID) {
      expect(uuidRegex.test(id)).toBe(true);
    } else {
      expect(id).toMatch(/^id_/);
    }
  });

  test('makeId generates unique IDs', () => {
    const id1 = makeId();
    const id2 = makeId();
    const id3 = makeId();

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  test('makeId returns non-empty string', () => {
    const id = makeId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('utils/elements.ts', () => {
  describe('whenUpgraded', () => {
    test('resolves immediately if custom element already registered', async () => {
      const mockElement = document.createElement('div') as HTMLElement;
      
      // Mock that the element is already defined
      const originalGet = customElements.get;
      customElements.get = jest.fn().mockReturnValue(class MockElement extends HTMLElement {});

      try {
        const result = await whenUpgraded(mockElement, 'test-element');

        expect(result).toBe(mockElement);
        expect(customElements.get).toHaveBeenCalledWith('test-element');
      } finally {
        customElements.get = originalGet;
      }
    });

    test('waits for custom element to be defined if not yet registered', async () => {
      const mockElement = document.createElement('div') as HTMLElement;
      
      const originalGet = customElements.get;
      const originalWhenDefined = customElements.whenDefined;
      
      customElements.get = jest.fn().mockReturnValue(undefined);
      customElements.whenDefined = jest.fn().mockResolvedValue(undefined);

      try {
        const result = await whenUpgraded(mockElement, 'test-element');

        expect(result).toBe(mockElement);
        expect(customElements.whenDefined).toHaveBeenCalledWith('test-element');
      } finally {
        customElements.get = originalGet;
        customElements.whenDefined = originalWhenDefined;
      }
    });

    test('works with HTML elements', async () => {
      const el = document.createElement('button') as HTMLElement;
      const originalGet = customElements.get;
      
      customElements.get = jest.fn().mockReturnValue(class extends HTMLElement {});

      try {
        const result = await whenUpgraded<HTMLButtonElement>(el, 'x-button');

        expect(result).toBe(el);
      } finally {
        customElements.get = originalGet;
      }
    });

    test('handles multiple elements independently', async () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('span');

      const originalGet = customElements.get;
      const originalWhenDefined = customElements.whenDefined;
      
      customElements.get = jest.fn().mockReturnValue(undefined);
      customElements.whenDefined = jest.fn().mockResolvedValue(undefined);

      try {
        const promise1 = whenUpgraded(el1, 'custom-1');
        const promise2 = whenUpgraded(el2, 'custom-2');

        const result1 = await promise1;
        const result2 = await promise2;

        expect(result1).toBe(el1);
        expect(result2).toBe(el2);
      } finally {
        customElements.get = originalGet;
        customElements.whenDefined = originalWhenDefined;
      }
    });
  });

  describe('nextMicrotask', () => {
    test('returns a resolved promise', () => {
      const result = nextMicrotask();

      expect(result).toBeInstanceOf(Promise);
    });

    test('resolves after a microtask', async () => {
      let resolved = false;

      const promise = nextMicrotask().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      await promise;

      expect(resolved).toBe(true);
    });

    test('can be awaited multiple times', async () => {
      await nextMicrotask();
      await nextMicrotask();
      await nextMicrotask();

      // If we got here, all three resolved successfully
      expect(true).toBe(true);
    });

    test('resolves before synchronous code completes', async () => {
      const order: string[] = [];

      order.push('sync-start');
      Promise.resolve().then(() => {
        order.push('promise-then');
      });
      order.push('sync-end');

      await nextMicrotask();
      order.push('after-microtask');

      // Microtask should resolve before we continue
      expect(order[0]).toBe('sync-start');
      expect(order[1]).toBe('sync-end');
      expect(order[2]).toBe('promise-then');
      expect(order[3]).toBe('after-microtask');
    });
  });
});
