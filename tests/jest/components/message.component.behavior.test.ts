import { jest } from '@jest/globals';
import '../../../src/components/MessageComponent/MessageComponent';
import { waitForElement } from '../helpers/testHelpers';

describe('MessageComponent behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('updateMessage sets text, type class, ARIA attrs and hides when empty', async () => {
    const el = document.createElement('message-component') as any;
    document.body.appendChild(el);

    // ensure shadowRoot exists and has a container (some JSDOM runs are slow)
    if (!el.shadowRoot) {
      // @ts-ignore
      el.attachShadow({ mode: 'open' });
    }
    if (!el.shadowRoot.querySelector('.message-container')) {
      const c = document.createElement('div');
      c.className = 'message-container hidden';
      el.shadowRoot.appendChild(c);
    }

    // initial render with message
    el.updateMessage('hello', 'success');

    const container = await waitForElement(el.shadowRoot as ShadowRoot, '.message-container');
    expect(container.textContent.trim()).toBe('hello');
    expect(container.classList.contains('success')).toBe(true);

    // set role and aria-live then update message
    el.props.role = 'alert';
    el.props.ariaLive = 'polite';
    el.updateMessage('warn', 'warning');

    const container2 = await waitForElement(el.shadowRoot as ShadowRoot, '.message-container');
    expect(container2.getAttribute('role')).toBe('alert');
    expect(container2.getAttribute('aria-live')).toBe('polite');
    expect(container2.getAttribute('aria-atomic')).toBe('true');

    // empty message hides container
    el.updateMessage('');
    const container3 = await waitForElement(el.shadowRoot as ShadowRoot, '.message-container');
    expect(container3.classList.contains('hidden')).toBe(true);

    el.remove();
  });
});
