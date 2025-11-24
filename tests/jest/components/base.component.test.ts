import { BaseComponent } from '../../../src/components/Base/BaseComponent';
import { waitForElement } from '../helpers/testHelpers';

class DummyComponent extends BaseComponent<{ title: string; count: number; flag: boolean }> {
  constructor() {
    super(
      (locals) => `<div><h1>{{title}}</h1><a data-href="./path/to">link</a><button data-action='click:onClick'>X</button></div>`,
      { title: 'hello', count: 2, flag: false },
      ['./styles/foo.css', 'body { color: blue; }'],
    );
  }

  onClick(): void {
    this.setProp('title', 'clicked');
    this.emit('custom', { ok: true } as any);
  }

  public exposeRender(): void {
    this.render();
  }
}

// ensure custom element is registered once
const tag = 'x-test-dummy';
if (!customElements.get(tag)) customElements.define(tag, DummyComponent as any);

describe('BaseComponent basic behaviors', () => {
  let el: DummyComponent;

  beforeEach(() => {
    el = document.createElement(tag) as unknown as DummyComponent;
    document.body.appendChild(el as unknown as HTMLElement);
  });

  afterEach(() => {
    el.remove();
    // reset documentElement attrs
    document.documentElement.removeAttribute('data-theme');
  });

  test('renders template with bindings and converts data-href to href', async () => {
    el.exposeRender();
    const bound = await waitForElement(el.shadowRoot as ShadowRoot, '[data-bind="title"]').catch(() => null) as HTMLElement | null;
    expect(bound).not.toBeNull();
    expect(bound!.textContent).toBe('hello');

    const a = await waitForElement(el.shadowRoot as ShadowRoot, 'a').catch(() => null) as HTMLAnchorElement | null;
    expect(a).not.toBeNull();
    expect(a!.getAttribute('href')).toBe('./path/to');
  });

  test('setProp updates attribute and bindings, emits events and binds actions', async () => {
    el.exposeRender();
    const bound = await waitForElement(el.shadowRoot as ShadowRoot, '[data-bind="title"]').catch(() => null) as HTMLElement | null;
    const btn = await waitForElement(el.shadowRoot as ShadowRoot, 'button').catch(() => null) as HTMLButtonElement | null;

    await new Promise<void>((resolve) => {
      el.addEventListener('custom', (ev: CustomEvent) => {
        expect((ev as any).detail.ok).toBe(true);
        expect(bound!.textContent).toBe('clicked');
        resolve();
      });
      if (btn) btn.click();
    });
  });

  test('ensureStyles adds link and style elements', () => {
    // render will call ensureStyles on first render
    el.exposeRender();
    const links = el.shadowRoot!.querySelectorAll('link[rel="stylesheet"]');
    const styles = el.shadowRoot!.querySelectorAll('style');
    expect(links.length).toBeGreaterThanOrEqual(1);
    // inline style we passed should be present in one of the style tags
    let foundInline = false;
    styles.forEach((s) => {
      if (s.textContent && s.textContent.indexOf('color: blue') >= 0) foundInline = true;
    });
    expect(foundInline).toBe(true);
  });

  test('disconnectedCallback clears internal state', () => {
    el.exposeRender();
    expect((el as any).initialized).toBe(true);
    el.disconnectedCallback();
    expect((el as any).initialized).toBe(false);
    expect(el.shadowRoot!.innerHTML).toBe('');
  });
});
